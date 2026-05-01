import {
  Adopted,
  CarrierStatus,
  type IndividualSemantics,
  Sex,
  TwinType,
  VitalStatus,
} from '../psc/semantics.js';
import { makeCoupleId } from './ids.js';
import {
  type Couple,
  type CoupleId,
  type Individual,
  type IndividualId,
  type PedigreeGraph,
  Provenance,
} from './types.js';

/**
 * Reconstruct missing graph topology from `relationshipToProband` codes when
 * the explicit HL7 genetics-parent / genetics-sibling extensions are absent.
 *
 * What this does, in order:
 *   1. Builds a parent couple for the proband if any gen -1 / -2 evidence
 *      exists (mother, father, siblings, grandparents, aunts, uncles).
 *      Missing parents are fabricated as `Provenance.Inferred`.
 *   2. Wires existing siblings (NSIS, NBRO, …) to that parent couple.
 *   3. For each side independently (maternal / paternal), if any grandparent
 *      or aunt/uncle individuals exist there, fabricates the missing
 *      grandparent and creates a couple, then wires the proband's parent on
 *      that side and any aunts/uncles on that side to the couple.
 *
 * Idempotent: individuals that already have `childOf` set (e.g. wired via
 * the explicit extension during parse) are never re-parented. Couples
 * created here use the same deterministic `makeCoupleId` format as parse,
 * so an explicit couple is reused rather than duplicated.
 *
 * Out of scope for v1: cousins (need the explicit extension to know which
 * aunt/uncle they descend from), nephews/nieces, and twin grouping (codes
 * alone don't disambiguate which twins go together — that requires the
 * genetics-sibling extension, handled in `parse.ts`).
 */

const DIRECT_MOTHER_CODES = ['MTH', 'NMTH'];
const DIRECT_FATHER_CODES = ['FTH', 'NFTH'];
const SIBLING_CODES = ['NSIS', 'NBRO', 'SIS', 'BRO', 'TWINSIS', 'TWINBRO', 'TWIN'];
const MATERNAL_GRANDMOTHER_CODES = ['MGRMTH'];
const MATERNAL_GRANDFATHER_CODES = ['MGRFTH'];
const PATERNAL_GRANDMOTHER_CODES = ['PGRMTH'];
const PATERNAL_GRANDFATHER_CODES = ['PGRFTH'];
const MATERNAL_AUNT_UNCLE_CODES = ['MAUNT', 'MUNCLE'];
const PATERNAL_AUNT_UNCLE_CODES = ['PAUNT', 'PUNCLE'];

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

function fabricate(id: IndividualId, sex: Sex): Individual {
  return { id, semantics: defaultSemantics(sex), provenance: Provenance.Inferred };
}

function fabricateInto(
  individuals: Map<IndividualId, Individual>,
  id: IndividualId,
  sex: Sex,
): IndividualId {
  if (!individuals.has(id)) individuals.set(id, fabricate(id, sex));
  return id;
}

function findOrCreateCouple(
  couples: Map<CoupleId, Couple>,
  a: IndividualId,
  b: IndividualId,
): CoupleId {
  const id = makeCoupleId(a, b);
  if (!couples.has(id)) {
    couples.set(id, {
      id,
      partners: [a, b],
      consanguineous: false,
      provenance: Provenance.Inferred,
    });
  }
  return id;
}

function collectIdsByCode(
  individuals: ReadonlyMap<IndividualId, Individual>,
  codes: readonly string[],
): IndividualId[] {
  const ids: IndividualId[] = [];
  for (const ind of individuals.values()) {
    if (ind.relationshipToProband !== undefined && codes.includes(ind.relationshipToProband)) {
      ids.push(ind.id);
    }
  }
  return ids;
}

function setChildOfIfAbsent(
  individuals: Map<IndividualId, Individual>,
  individualId: IndividualId,
  coupleId: CoupleId,
): void {
  const ind = individuals.get(individualId);
  if (ind === undefined || ind.childOf !== undefined) return;
  individuals.set(individualId, { ...ind, childOf: coupleId });
}

interface SideContext {
  parentId: IndividualId;
  fabricatedParent: boolean;
  grandmotherCodes: readonly string[];
  grandfatherCodes: readonly string[];
  auntUncleCodes: readonly string[];
  fabricatedGmId: IndividualId;
  fabricatedGfId: IndividualId;
}

function inferGrandparentSide(
  individuals: Map<IndividualId, Individual>,
  couples: Map<CoupleId, Couple>,
  ctx: SideContext,
): void {
  const grandmotherIds = collectIdsByCode(individuals, ctx.grandmotherCodes);
  const grandfatherIds = collectIdsByCode(individuals, ctx.grandfatherCodes);
  const auntUncleIds = collectIdsByCode(individuals, ctx.auntUncleCodes);

  const hasEvidence =
    grandmotherIds.length > 0 || grandfatherIds.length > 0 || auntUncleIds.length > 0;
  if (!hasEvidence) return;

  const gmId = grandmotherIds[0] ?? fabricateInto(individuals, ctx.fabricatedGmId, Sex.Female);
  const gfId = grandfatherIds[0] ?? fabricateInto(individuals, ctx.fabricatedGfId, Sex.Male);
  const coupleId = findOrCreateCouple(couples, gmId, gfId);

  setChildOfIfAbsent(individuals, ctx.parentId, coupleId);
  for (const auId of auntUncleIds) setChildOfIfAbsent(individuals, auId, coupleId);
}

export function inferRelationships(graph: PedigreeGraph): PedigreeGraph {
  const individuals = new Map(Object.entries(graph.individuals));
  const couples = new Map(Object.entries(graph.couples));
  const probandId = graph.proband;

  const motherIds = collectIdsByCode(individuals, DIRECT_MOTHER_CODES);
  const fatherIds = collectIdsByCode(individuals, DIRECT_FATHER_CODES);
  const siblingIds = collectIdsByCode(individuals, SIBLING_CODES);
  const mgmIds = collectIdsByCode(individuals, MATERNAL_GRANDMOTHER_CODES);
  const mgfIds = collectIdsByCode(individuals, MATERNAL_GRANDFATHER_CODES);
  const pgmIds = collectIdsByCode(individuals, PATERNAL_GRANDMOTHER_CODES);
  const pgfIds = collectIdsByCode(individuals, PATERNAL_GRANDFATHER_CODES);
  const mAuntUncleIds = collectIdsByCode(individuals, MATERNAL_AUNT_UNCLE_CODES);
  const pAuntUncleIds = collectIdsByCode(individuals, PATERNAL_AUNT_UNCLE_CODES);

  const hasParentGenEvidence =
    motherIds.length > 0 ||
    fatherIds.length > 0 ||
    siblingIds.length > 0 ||
    mgmIds.length > 0 ||
    mgfIds.length > 0 ||
    pgmIds.length > 0 ||
    pgfIds.length > 0 ||
    mAuntUncleIds.length > 0 ||
    pAuntUncleIds.length > 0;

  const proband = individuals.get(probandId);
  // A consumer may hand-build a malformed graph where graph.proband doesn't
  // resolve to an actual individual; bail out gracefully rather than throw.
  if (proband === undefined) return graph;

  let probandParentCoupleId = proband.childOf;
  let motherId: IndividualId | undefined;
  let fatherId: IndividualId | undefined;

  if (probandParentCoupleId === undefined && hasParentGenEvidence) {
    motherId =
      motherIds[0] ?? fabricateInto(individuals, `inferred:mother-of:${probandId}`, Sex.Female);
    fatherId =
      fatherIds[0] ?? fabricateInto(individuals, `inferred:father-of:${probandId}`, Sex.Male);
    probandParentCoupleId = findOrCreateCouple(couples, motherId, fatherId);
    individuals.set(probandId, { ...proband, childOf: probandParentCoupleId });
  } else {
    motherId = motherIds[0];
    fatherId = fatherIds[0];
  }

  if (probandParentCoupleId !== undefined) {
    for (const sid of siblingIds) {
      setChildOfIfAbsent(individuals, sid, probandParentCoupleId);
    }
  }

  if (motherId !== undefined) {
    inferGrandparentSide(individuals, couples, {
      parentId: motherId,
      fabricatedParent: motherIds.length === 0,
      grandmotherCodes: MATERNAL_GRANDMOTHER_CODES,
      grandfatherCodes: MATERNAL_GRANDFATHER_CODES,
      auntUncleCodes: MATERNAL_AUNT_UNCLE_CODES,
      fabricatedGmId: `inferred:mgm-of:${probandId}`,
      fabricatedGfId: `inferred:mgf-of:${probandId}`,
    });
  }

  if (fatherId !== undefined) {
    inferGrandparentSide(individuals, couples, {
      parentId: fatherId,
      fabricatedParent: fatherIds.length === 0,
      grandmotherCodes: PATERNAL_GRANDMOTHER_CODES,
      grandfatherCodes: PATERNAL_GRANDFATHER_CODES,
      auntUncleCodes: PATERNAL_AUNT_UNCLE_CODES,
      fabricatedGmId: `inferred:pgm-of:${probandId}`,
      fabricatedGfId: `inferred:pgf-of:${probandId}`,
    });
  }

  return {
    proband: probandId,
    individuals: Object.fromEntries(individuals),
    couples: Object.fromEntries(couples),
  };
}
