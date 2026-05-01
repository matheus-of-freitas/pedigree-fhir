import { makeCoupleId } from '../model/ids.js';
import {
  type Couple,
  type CoupleId,
  type Individual,
  type IndividualId,
  type PedigreeGraph,
  Provenance,
} from '../model/types.js';
import {
  Adopted,
  CarrierStatus,
  type IndividualSemantics,
  Sex,
  TwinType,
  VitalStatus,
} from '../psc/semantics.js';

export type RelativeKind = 'parent' | 'sibling' | 'child' | 'partner';

export type GraphEditAction =
  | {
      type: 'addRelative';
      /** The individual the new relative is being added to. */
      relativeOf: IndividualId;
      /** How the new relative is related to `relativeOf`. */
      kind: RelativeKind;
      /** Stable id for the new individual; mint via crypto.randomUUID() externally. */
      newId: IndividualId;
      sex: Sex;
      name?: string;
    }
  | { type: 'removeIndividual'; id: IndividualId };

function defaultSemantics(sex: Sex): IndividualSemantics {
  return {
    sex,
    vital: VitalStatus.Living,
    conditions: [],
    carrier: CarrierStatus.None,
    twin: TwinType.None,
    proband: false,
    adopted: Adopted.None,
  };
}

function makeIndividual(id: IndividualId, sex: Sex, name?: string): Individual {
  const ind: Individual = {
    id,
    semantics: defaultSemantics(sex),
    provenance: Provenance.Explicit,
  };
  if (name !== undefined) ind.name = name;
  return ind;
}

function makeInferred(id: IndividualId, sex: Sex): Individual {
  return { id, semantics: defaultSemantics(sex), provenance: Provenance.Inferred };
}

/** Opposite sex used when fabricating a partner for a known parent. */
function oppositeSex(sex: Sex): Sex {
  if (sex === Sex.Male) return Sex.Female;
  if (sex === Sex.Female) return Sex.Male;
  return Sex.Unknown;
}

/**
 * Find an existing couple (`Record<CoupleId, Couple>`) where `id` is one of
 * the partners. Returns the couple ID and the other partner's ID, or
 * `undefined` if `id` has no couple yet.
 */
function findCoupleOf(
  couples: Record<CoupleId, Couple>,
  id: IndividualId,
): { coupleId: CoupleId; partnerId: IndividualId } | undefined {
  for (const [coupleId, couple] of Object.entries(couples)) {
    const [a, b] = couple.partners;
    if (a === id) return { coupleId, partnerId: b };
    if (b === id) return { coupleId, partnerId: a };
  }
  return undefined;
}

/**
 * Ensure `target` is a partner in a couple. If they already are, return the
 * existing couple. Otherwise fabricate an inferred partner of opposite sex
 * and create a new couple between them. Returns the couple id plus updated
 * individuals/couples maps.
 */
function ensureCouple(
  individuals: Record<IndividualId, Individual>,
  couples: Record<CoupleId, Couple>,
  targetId: IndividualId,
  fabricatedPartnerId: IndividualId,
): {
  coupleId: CoupleId;
  individuals: Record<IndividualId, Individual>;
  couples: Record<CoupleId, Couple>;
} {
  const existing = findCoupleOf(couples, targetId);
  if (existing !== undefined) {
    return { coupleId: existing.coupleId, individuals, couples };
  }
  const target = individuals[targetId];
  // Defensive: targetId is always validated by the caller before reaching here.
  /* v8 ignore next */
  if (target === undefined) return { coupleId: '', individuals, couples };
  const partner = makeInferred(fabricatedPartnerId, oppositeSex(target.semantics.sex));
  const coupleId = makeCoupleId(targetId, fabricatedPartnerId);
  return {
    coupleId,
    individuals: { ...individuals, [fabricatedPartnerId]: partner },
    couples: {
      ...couples,
      [coupleId]: {
        id: coupleId,
        partners: [targetId, fabricatedPartnerId],
        consanguineous: false,
        provenance: Provenance.Inferred,
      },
    },
  };
}

function addAsSibling(graph: PedigreeGraph, target: Individual, newInd: Individual): PedigreeGraph {
  if (target.childOf !== undefined) {
    return {
      ...graph,
      individuals: {
        ...graph.individuals,
        [newInd.id]: { ...newInd, childOf: target.childOf },
      },
    };
  }
  // No parent couple — fabricate one with two inferred parents and link both
  // the target and the new sibling to it.
  const motherId: IndividualId = `inferred:mother-of:${target.id}`;
  const fatherId: IndividualId = `inferred:father-of:${target.id}`;
  const coupleId = makeCoupleId(motherId, fatherId);
  return {
    ...graph,
    individuals: {
      ...graph.individuals,
      [motherId]: makeInferred(motherId, Sex.Female),
      [fatherId]: makeInferred(fatherId, Sex.Male),
      [target.id]: { ...target, childOf: coupleId },
      [newInd.id]: { ...newInd, childOf: coupleId },
    },
    couples: {
      ...graph.couples,
      [coupleId]: {
        id: coupleId,
        partners: [motherId, fatherId],
        consanguineous: false,
        provenance: Provenance.Inferred,
      },
    },
  };
}

function addAsChild(graph: PedigreeGraph, target: Individual, newInd: Individual): PedigreeGraph {
  const partnerId: IndividualId = `inferred:partner-of:${target.id}`;
  const ensured = ensureCouple(graph.individuals, graph.couples, target.id, partnerId);
  return {
    ...graph,
    individuals: {
      ...ensured.individuals,
      [newInd.id]: { ...newInd, childOf: ensured.coupleId },
    },
    couples: ensured.couples,
  };
}

function addAsParent(graph: PedigreeGraph, target: Individual, newInd: Individual): PedigreeGraph {
  if (target.childOf !== undefined) {
    // Already has parents — for v1 this is a no-op; M5 polish can handle
    // partner replacement.
    return graph;
  }
  const otherParentId: IndividualId = `inferred:partner-of:${newInd.id}`;
  const otherParent = makeInferred(otherParentId, oppositeSex(newInd.semantics.sex));
  const coupleId = makeCoupleId(newInd.id, otherParentId);
  return {
    ...graph,
    individuals: {
      ...graph.individuals,
      [newInd.id]: newInd,
      [otherParentId]: otherParent,
      [target.id]: { ...target, childOf: coupleId },
    },
    couples: {
      ...graph.couples,
      [coupleId]: {
        id: coupleId,
        partners: [newInd.id, otherParentId],
        consanguineous: false,
        provenance: Provenance.Inferred,
      },
    },
  };
}

function addAsPartner(graph: PedigreeGraph, target: Individual, newInd: Individual): PedigreeGraph {
  if (findCoupleOf(graph.couples, target.id) !== undefined) {
    // Already has a partner — v1 doesn't support multi-partner; no-op.
    return graph;
  }
  const coupleId = makeCoupleId(target.id, newInd.id);
  return {
    ...graph,
    individuals: { ...graph.individuals, [newInd.id]: newInd },
    couples: {
      ...graph.couples,
      [coupleId]: {
        id: coupleId,
        partners: [target.id, newInd.id],
        consanguineous: false,
        provenance: Provenance.Explicit,
      },
    },
  };
}

function removeIndividual(graph: PedigreeGraph, id: IndividualId): PedigreeGraph {
  if (id === graph.proband) return graph;
  if (graph.individuals[id] === undefined) return graph;

  const individuals: Record<IndividualId, Individual> = {};
  for (const [otherId, ind] of Object.entries(graph.individuals)) {
    if (otherId !== id) individuals[otherId] = ind;
  }

  const couples: Record<CoupleId, Couple> = {};
  const removedCoupleIds = new Set<CoupleId>();
  for (const [coupleId, couple] of Object.entries(graph.couples)) {
    if (couple.partners.includes(id)) {
      removedCoupleIds.add(coupleId);
      continue;
    }
    couples[coupleId] = couple;
  }

  // Drop childOf links pointing at any removed couple, and drop twinGroupId
  // links if the removed individual was in the same group.
  const removedTwinGroupId = graph.individuals[id]?.twinGroupId;
  for (const [otherId, ind] of Object.entries(individuals)) {
    let updated = ind;
    if (updated.childOf !== undefined && removedCoupleIds.has(updated.childOf)) {
      const { childOf: _droppedCouple, ...rest } = updated;
      updated = rest;
    }
    if (removedTwinGroupId !== undefined && updated.twinGroupId === removedTwinGroupId) {
      const { twinGroupId: _droppedTwin, ...rest } = updated;
      updated = rest;
    }
    if (updated !== ind) individuals[otherId] = updated;
  }

  return { ...graph, individuals, couples };
}

export function applyGraphEdit(graph: PedigreeGraph, action: GraphEditAction): PedigreeGraph {
  if (action.type === 'removeIndividual') return removeIndividual(graph, action.id);
  const target = graph.individuals[action.relativeOf];
  if (target === undefined) return graph;
  if (graph.individuals[action.newId] !== undefined) return graph;
  const newInd = makeIndividual(action.newId, action.sex, action.name);
  switch (action.kind) {
    case 'sibling':
      return addAsSibling(graph, target, newInd);
    case 'child':
      return addAsChild(graph, target, newInd);
    case 'parent':
      return addAsParent(graph, target, newInd);
    case 'partner':
      return addAsPartner(graph, target, newInd);
  }
}
