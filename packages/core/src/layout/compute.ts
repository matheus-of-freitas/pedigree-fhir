import { findCoupleOf } from '../model/couples.js';
import type { Couple, CoupleId, Individual, IndividualId, PedigreeGraph } from '../model/types.js';
import { Sex, TwinType } from '../psc/semantics.js';
import {
  LAYOUT_DEFAULTS,
  type LaidOutPedigree,
  type LayoutBounds,
  type LayoutOptions,
  type NodeLayout,
  type ParentDrop,
  type PartnerEdge,
  type TwinJunction,
} from './types.js';

const MATERNAL_AUNT_UNCLE_CODES = new Set(['MAUNT', 'MUNCLE']);
const PATERNAL_AUNT_UNCLE_CODES = new Set(['PAUNT', 'PUNCLE']);

/**
 * Filter aunts/uncles out of the graph based on `relationshipToProband`. The
 * grandparent couple's sibship at gen -1 contracts down to just the proband's
 * direct parent on that side. Returns the original graph unchanged when no
 * side is hidden.
 */
function applyCompact(
  graph: PedigreeGraph,
  hide: { maternal: boolean; paternal: boolean } | undefined,
): PedigreeGraph {
  if (hide === undefined || (!hide.maternal && !hide.paternal)) return graph;
  const filtered: Record<IndividualId, Individual> = {};
  for (const [id, ind] of Object.entries(graph.individuals)) {
    const code = ind.relationshipToProband;
    if (code !== undefined) {
      if (hide.maternal && MATERNAL_AUNT_UNCLE_CODES.has(code)) continue;
      if (hide.paternal && PATERNAL_AUNT_UNCLE_CODES.has(code)) continue;
    }
    filtered[id] = ind;
  }
  return { ...graph, individuals: filtered };
}

interface Point {
  x: number;
  y: number;
}

/** Average of x positions for a list of individuals. */
function meanX(positions: ReadonlyMap<IndividualId, Point>, ids: readonly IndividualId[]): number {
  let sum = 0;
  let count = 0;
  for (const id of ids) {
    const p = positions.get(id);
    // Defensive: every id passed to meanX is positioned by the caller right
    // before this lookup. Unreachable in normal flow.
    /* v8 ignore next */
    if (p === undefined) continue;
    sum += p.x;
    count += 1;
  }
  // Defensive: meanX is never called with an empty list — all callers gate on
  // sibship.length > 0 or pass a list known to be non-empty.
  /* v8 ignore next */
  return count === 0 ? 0 : sum / count;
}

/**
 * Pick which partner of a couple is the "mother-shaped" one. Returns the
 * couple's partners in [mother-side, father-side] order. Falls back to the
 * couple's stored partner order when sex doesn't disambiguate.
 */
function orderPartnersBySex(
  couple: Couple,
  individuals: Record<IndividualId, Individual>,
): [IndividualId, IndividualId] {
  const [a, b] = couple.partners;
  const aSex = individuals[a]?.semantics.sex;
  const bSex = individuals[b]?.semantics.sex;
  if (aSex === Sex.Female || bSex === Sex.Male) return [a, b];
  if (bSex === Sex.Female || aSex === Sex.Male) return [b, a];
  return [a, b];
}

function indexChildrenByCouple(
  graph: PedigreeGraph,
): ReadonlyMap<CoupleId, readonly IndividualId[]> {
  const childrenByCouple = new Map<CoupleId, IndividualId[]>();
  for (const ind of Object.values(graph.individuals)) {
    if (ind.childOf === undefined) continue;
    const existing = childrenByCouple.get(ind.childOf);
    if (existing === undefined) childrenByCouple.set(ind.childOf, [ind.id]);
    else existing.push(ind.id);
  }
  return childrenByCouple;
}

function findChildrenOfCouple(
  childrenByCouple: ReadonlyMap<CoupleId, readonly IndividualId[]>,
  coupleId: CoupleId,
): readonly IndividualId[] {
  // Defensive: current callers only ask for couple IDs already referenced by an
  // individual's `childOf`, so the map should always contain the key. Keep the
  // fallback for hand-built callers reusing this helper directly.
  /* v8 ignore next */
  return childrenByCouple.get(coupleId) ?? [];
}

function placeRowCentered(
  positions: Map<IndividualId, Point>,
  ids: readonly IndividualId[],
  centerX: number,
  y: number,
  pitch: number,
): void {
  const totalWidth = (ids.length - 1) * pitch;
  const startX = centerX - totalWidth / 2;
  ids.forEach((id, i) => {
    positions.set(id, { x: startX + i * pitch, y });
  });
}

/**
 * Place a sibship anchored on one specific member: that member gets the
 * given x, and the rest of the sibship is laid out left or right of it
 * with `pitch` spacing.
 */
function placeAnchoredRow(
  positions: Map<IndividualId, Point>,
  others: readonly IndividualId[],
  anchorId: IndividualId,
  anchorX: number,
  y: number,
  pitch: number,
  side: 'others-left' | 'others-right',
): void {
  positions.set(anchorId, { x: anchorX, y });
  others.forEach((id, i) => {
    const offset = (i + 1) * pitch;
    const x = side === 'others-left' ? anchorX - offset : anchorX + offset;
    positions.set(id, { x, y });
  });
}

function partnerSide(index: number, total: number): 'left' | 'right' {
  return index < (total - 1) / 2 ? 'left' : 'right';
}

function layoutGenerationZero(args: {
  graph: PedigreeGraph;
  sibship: readonly IndividualId[];
  y: number;
  positions: Map<IndividualId, Point>;
  opts: Required<Omit<LayoutOptions, 'hideAuntsUncles'>>;
}): readonly CoupleId[] {
  const siblingIds = new Set(args.sibship);
  const slotIds: IndividualId[] = [];
  const gaps: number[] = [];
  const visibleCouples: CoupleId[] = [];

  function pushSlot(id: IndividualId, gapFromPrevious: number): void {
    if (slotIds.length > 0) gaps.push(gapFromPrevious);
    slotIds.push(id);
  }

  args.sibship.forEach((id, index) => {
    const existingCouple = findCoupleOf(args.graph.couples, id);
    const externalPartner =
      existingCouple !== undefined && !siblingIds.has(existingCouple.partnerId)
        ? existingCouple
        : undefined;

    if (externalPartner === undefined) {
      pushSlot(id, args.opts.siblingPitch);
      return;
    }

    visibleCouples.push(externalPartner.coupleId);
    if (partnerSide(index, args.sibship.length) === 'left') {
      pushSlot(externalPartner.partnerId, args.opts.siblingPitch);
      pushSlot(id, args.opts.couplePitch);
      return;
    }

    pushSlot(id, args.opts.siblingPitch);
    pushSlot(externalPartner.partnerId, args.opts.couplePitch);
  });

  let x = 0;
  for (const [index, id] of slotIds.entries()) {
    if (index > 0) x += gaps[index - 1] as number;
    args.positions.set(id, { x, y: args.y });
  }

  const center = meanX(args.positions, args.sibship);
  for (const id of slotIds) {
    const point = args.positions.get(id);
    // Defensive: slot IDs are written into `positions` immediately above.
    /* v8 ignore next */
    if (point === undefined) continue;
    args.positions.set(id, { x: point.x - center, y: args.y });
  }

  return visibleCouples;
}

function buildPartnerEdge(
  coupleId: CoupleId,
  partners: [IndividualId, IndividualId],
  ax: number,
  bx: number,
  y: number,
  consanguineous: boolean,
  nodeSize: number,
): PartnerEdge {
  const left = Math.min(ax, bx);
  const right = Math.max(ax, bx);
  const path = consanguineous
    ? `M ${left} ${y - nodeSize * 0.08} H ${right} M ${left} ${y + nodeSize * 0.08} H ${right}`
    : `M ${left} ${y} H ${right}`;
  return {
    coupleId,
    partners,
    consanguineous,
    path,
    midpoint: { x: (ax + bx) / 2, y },
  };
}

function buildTwinJunction(args: {
  twinGroupId: string;
  type: TwinType;
  members: readonly IndividualId[];
  sibY: number;
  childTopY: number;
  positions: ReadonlyMap<IndividualId, Point>;
}): TwinJunction {
  const junctionX = meanX(args.positions, args.members);
  const diagonalSegments = args.members.map((id) => {
    const p = args.positions.get(id);
    // Defensive: twin members are drawn from positioned children.
    /* v8 ignore next */
    const x = p?.x ?? junctionX;
    return `M ${junctionX} ${args.sibY} L ${x} ${args.childTopY}`;
  });

  if (args.type !== TwinType.Monozygotic) {
    return {
      twinGroupId: args.twinGroupId,
      type: args.type,
      children: args.members,
      junction: { x: junctionX, y: args.sibY },
      path: diagonalSegments.join(' '),
    };
  }

  const xs = args.members.map((id) => {
    const p = args.positions.get(id);
    // Defensive: same positioned-children guarantee as above.
    /* v8 ignore next */
    return p?.x ?? junctionX;
  });
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const monoY = (args.sibY + args.childTopY) / 2;
  const monoLeft = (junctionX + left) / 2;
  const monoRight = (junctionX + right) / 2;
  return {
    twinGroupId: args.twinGroupId,
    type: args.type,
    children: args.members,
    junction: { x: junctionX, y: args.sibY },
    path: diagonalSegments.join(' '),
    monozygoticPath: `M ${monoLeft} ${monoY} H ${monoRight}`,
  };
}

function buildParentDrop(
  coupleId: CoupleId,
  children: readonly IndividualId[],
  midX: number,
  partnerY: number,
  childY: number,
  positions: ReadonlyMap<IndividualId, Point>,
  individuals: Record<IndividualId, Individual>,
  nodeSize: number,
): ParentDrop {
  const childTopY = childY - nodeSize / 2;
  const sibY = partnerY + (childTopY - partnerY) * 0.7;
  // All children passed are positioned by the caller; the `?? midX` fallback
  // exists only to satisfy noUncheckedIndexedAccess on the optional chain.
  /* v8 ignore next */
  const childTops = children.map((id) => positions.get(id)?.x ?? midX);
  const leftmost = Math.min(...childTops, midX);
  const rightmost = Math.max(...childTops, midX);
  const segments: string[] = [
    // Vertical from couple midpoint down to sibship line.
    `M ${midX} ${partnerY} V ${sibY}`,
    // Horizontal sibship line spanning all children (and the couple midpoint
    // if it would otherwise dangle outside the children's range).
    `M ${leftmost} ${sibY} H ${rightmost}`,
  ];
  const twinGroups = new Map<string, IndividualId[]>();
  for (const id of children) {
    const ind = individuals[id];
    if (ind?.twinGroupId === undefined || ind.semantics.twin === TwinType.None) continue;
    const existing = twinGroups.get(ind.twinGroupId) ?? [];
    existing.push(id);
    twinGroups.set(ind.twinGroupId, existing);
  }

  const twinJunctions: TwinJunction[] = [];
  const handledTwinGroups = new Set<string>();

  // Vertical drop to each child's top edge, or PSC twin diagonals for twin groups.
  for (const id of children) {
    const ind = individuals[id];
    const twinGroupId = ind?.twinGroupId;
    if (twinGroupId !== undefined) {
      const members = twinGroups.get(twinGroupId) ?? [];
      if (members.length >= 2) {
        if (!handledTwinGroups.has(twinGroupId)) {
          handledTwinGroups.add(twinGroupId);
          const firstMember = members[0] as IndividualId;
          const type = (individuals[firstMember] as Individual).semantics.twin;
          const junction = buildTwinJunction({
            twinGroupId,
            type,
            members,
            sibY,
            childTopY,
            positions,
          });
          twinJunctions.push(junction);
          segments.push(junction.path);
          if (junction.monozygoticPath !== undefined) segments.push(junction.monozygoticPath);
        }
        continue;
      }
    }
    const p = positions.get(id);
    // Defensive: same as childTops above — children are positioned by caller.
    /* v8 ignore next */
    if (p === undefined) continue;
    segments.push(`M ${p.x} ${sibY} V ${childTopY}`);
  }
  return { coupleId, children, twinJunctions, path: segments.join(' ') };
}

function emptyLayout(): LaidOutPedigree {
  return {
    nodes: [],
    partnerEdges: [],
    parentDrops: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
  };
}

function computeBounds(
  positions: ReadonlyMap<IndividualId, Point>,
  nodeSize: number,
): LayoutBounds {
  // Unreachable from `computePedigreeLayout`: the empty case short-circuits
  // into `emptyLayout()` before reaching here. Kept as a safety net for
  // possible future callers reusing this helper.
  /* v8 ignore next 3 */
  if (positions.size === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of positions.values()) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const half = nodeSize / 2;
  return {
    minX: minX - half,
    minY: minY - half,
    maxX: maxX + half,
    maxY: maxY + half,
    width: maxX - minX + nodeSize,
    height: maxY - minY + nodeSize,
  };
}

function layoutGrandparentSide(args: {
  graph: PedigreeGraph;
  childrenByCouple: ReadonlyMap<CoupleId, readonly IndividualId[]>;
  parentId: IndividualId;
  parentX: number;
  side: 'maternal' | 'paternal';
  yParent: number;
  yGrandparent: number;
  positions: Map<IndividualId, Point>;
  partnerEdges: PartnerEdge[];
  parentDrops: ParentDrop[];
  opts: Required<Omit<LayoutOptions, 'hideAuntsUncles'>>;
}): void {
  const parent = args.graph.individuals[args.parentId];
  if (parent === undefined || parent.childOf === undefined) return;

  const gpCouple = args.graph.couples[parent.childOf];
  // Defensive: parent.childOf could point to a couple no longer present in
  // a hand-built or partially-mutated graph; bail out cleanly.
  /* v8 ignore next */
  if (gpCouple === undefined) return;

  const sibship = findChildrenOfCouple(args.childrenByCouple, gpCouple.id);
  const siblings = sibship.filter((id) => id !== args.parentId);

  // Place the in-laws (aunts/uncles) flanking the parent on the side away
  // from the proband's couple. Maternal side: parent is on the right of the
  // sibship (closest to father), aunts/uncles to the left.
  const flankSide = args.side === 'maternal' ? 'others-left' : 'others-right';
  placeAnchoredRow(
    args.positions,
    siblings,
    args.parentId,
    args.parentX,
    args.yParent,
    args.opts.siblingPitch,
    flankSide,
  );

  const sibshipCenter = meanX(args.positions, sibship);
  const [gmId, gfId] = orderPartnersBySex(gpCouple, args.graph.individuals);
  const gmX = sibshipCenter - args.opts.couplePitch / 2;
  const gfX = sibshipCenter + args.opts.couplePitch / 2;
  args.positions.set(gmId, { x: gmX, y: args.yGrandparent });
  args.positions.set(gfId, { x: gfX, y: args.yGrandparent });

  args.partnerEdges.push(
    buildPartnerEdge(
      gpCouple.id,
      [gmId, gfId],
      gmX,
      gfX,
      args.yGrandparent,
      gpCouple.consanguineous,
      args.opts.nodeSize,
    ),
  );
  args.parentDrops.push(
    buildParentDrop(
      gpCouple.id,
      sibship,
      sibshipCenter,
      args.yGrandparent,
      args.yParent,
      args.positions,
      args.graph.individuals,
      args.opts.nodeSize,
    ),
  );
}

/**
 * Compute layout coordinates and connector path strings for a proband-centered
 * pedigree. The library is headless: this function returns positions and SVG
 * path strings; consumers render their own shapes.
 *
 * Coordinate convention: y increases downward (so ancestors have smaller y and
 * descendants have larger y), x is centred around the proband sibship —
 * translate to your viewport as desired, then derive `viewBox` from `bounds`.
 *
 * Layout shape, top-down:
 *   - Gen -2 (y = 0):                MGM─MGF                  PGM─PGF
 *   - Gen -1 (y = generationGap):    [MAUNT … MOTHER]══[FATHER … PUNCLE]
 *   - Gen  0 (y = 2·generationGap):   [PARTNER] PROBAND [BRO/SIS] [PARTNER]
 *   - Gen +1 (y = 3·generationGap):           [CHILDREN OF GEN 0 COUPLES]
 */
export function computePedigreeLayout(
  rawGraph: PedigreeGraph,
  options: LayoutOptions = {},
): LaidOutPedigree {
  const opts = { ...LAYOUT_DEFAULTS, ...options };
  const graph = applyCompact(rawGraph, options.hideAuntsUncles);
  const childrenByCouple = indexChildrenByCouple(graph);
  const proband = graph.individuals[graph.proband];
  if (proband === undefined) return emptyLayout();

  const positions = new Map<IndividualId, Point>();
  const partnerEdges: PartnerEdge[] = [];
  const parentDrops: ParentDrop[] = [];

  const Y0 = 2 * opts.generationGap;
  const Y1 = opts.generationGap;
  const Y2 = 0;
  const YD = 3 * opts.generationGap;

  // Gen 0: proband + siblings (those sharing proband.childOf).
  const probandSibship =
    proband.childOf === undefined
      ? [graph.proband]
      : [...findChildrenOfCouple(childrenByCouple, proband.childOf)];
  // Defensive: a well-formed graph from parse + infer always lists the
  // proband under their parent couple. Hand-built graphs may not — make
  // sure the proband is part of the row regardless.
  /* v8 ignore next */
  if (!probandSibship.includes(graph.proband)) probandSibship.unshift(graph.proband);
  const visibleGenerationZeroCouples = layoutGenerationZero({
    graph,
    sibship: probandSibship,
    y: Y0,
    positions,
    opts,
  });

  for (const coupleId of visibleGenerationZeroCouples) {
    const couple = graph.couples[coupleId];
    // Defensive: visible couple IDs are sourced from `graph.couples` above.
    /* v8 ignore next */
    if (couple === undefined) continue;
    const partners = orderPartnersBySex(couple, graph.individuals);
    const a = positions.get(partners[0]);
    const b = positions.get(partners[1]);
    // Defensive: both gen-0 partners are positioned by layoutGenerationZero.
    /* v8 ignore next */
    if (a === undefined || b === undefined) continue;

    partnerEdges.push(
      buildPartnerEdge(couple.id, partners, a.x, b.x, Y0, couple.consanguineous, opts.nodeSize),
    );

    const children = findChildrenOfCouple(childrenByCouple, couple.id);
    if (children.length === 0) continue;

    const midpointX = (a.x + b.x) / 2;
    placeRowCentered(positions, children, midpointX, YD, opts.siblingPitch);
    parentDrops.push(
      buildParentDrop(
        couple.id,
        children,
        midpointX,
        Y0,
        YD,
        positions,
        graph.individuals,
        opts.nodeSize,
      ),
    );
  }

  // Gen -1 + Gen -2 only if the proband has a parent couple.
  if (proband.childOf !== undefined) {
    const parentCouple = graph.couples[proband.childOf];
    if (parentCouple !== undefined) {
      const sibshipCenter = meanX(positions, probandSibship);
      const [motherId, fatherId] = orderPartnersBySex(parentCouple, graph.individuals);
      const motherX = sibshipCenter - opts.couplePitch / 2;
      const fatherX = sibshipCenter + opts.couplePitch / 2;
      positions.set(motherId, { x: motherX, y: Y1 });
      positions.set(fatherId, { x: fatherX, y: Y1 });

      partnerEdges.push(
        buildPartnerEdge(
          parentCouple.id,
          [motherId, fatherId],
          motherX,
          fatherX,
          Y1,
          parentCouple.consanguineous,
          opts.nodeSize,
        ),
      );
      parentDrops.push(
        buildParentDrop(
          parentCouple.id,
          probandSibship,
          sibshipCenter,
          Y1,
          Y0,
          positions,
          graph.individuals,
          opts.nodeSize,
        ),
      );

      // Gen -2: maternal grandparents
      layoutGrandparentSide({
        graph,
        childrenByCouple,
        parentId: motherId,
        parentX: motherX,
        side: 'maternal',
        yParent: Y1,
        yGrandparent: Y2,
        positions,
        partnerEdges,
        parentDrops,
        opts,
      });

      // Gen -2: paternal grandparents
      layoutGrandparentSide({
        graph,
        childrenByCouple,
        parentId: fatherId,
        parentX: fatherX,
        side: 'paternal',
        yParent: Y1,
        yGrandparent: Y2,
        positions,
        partnerEdges,
        parentDrops,
        opts,
      });
    }
  }

  const nodes: NodeLayout[] = Array.from(positions, ([id, { x, y }]) => ({ id, x, y }));
  return {
    nodes,
    partnerEdges,
    parentDrops,
    bounds: computeBounds(positions, opts.nodeSize),
  };
}
