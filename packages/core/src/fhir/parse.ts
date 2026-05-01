/// <reference types="fhir" />
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
  AffectedStatus,
  CarrierStatus,
  type ConditionRecord,
  type IndividualSemantics,
  Sex,
  TwinType,
  VitalStatus,
} from '../psc/semantics.js';
import { ParentRole, SiblingRole, getGeneticsParents, getGeneticsSiblings } from './extensions.js';

export class PedigreeParseError extends Error {
  override readonly name = 'PedigreeParseError';
}

/**
 * Convert a FHIR administrative-gender code to our `Sex` enum. Unknown or
 * absent values map to `Sex.Unknown`.
 */
function mapGender(code: string | undefined): Sex {
  switch (code) {
    case 'male':
      return Sex.Male;
    case 'female':
      return Sex.Female;
    case 'other':
      return Sex.Other;
    default:
      return Sex.Unknown;
  }
}

function patientIsDeceased(patient: fhir4.Patient): boolean {
  return Boolean(patient.deceasedBoolean) || patient.deceasedDateTime !== undefined;
}

function fmhIsDeceased(fmh: fhir4.FamilyMemberHistory): boolean {
  return (
    Boolean(fmh.deceasedBoolean) ||
    fmh.deceasedAge !== undefined ||
    fmh.deceasedDate !== undefined ||
    fmh.deceasedRange !== undefined ||
    fmh.deceasedString !== undefined
  );
}

function extractFmhSex(fmh: fhir4.FamilyMemberHistory): Sex {
  return mapGender(fmh.sex?.coding?.[0]?.code);
}

function extractFmhConditions(fmh: fhir4.FamilyMemberHistory): ConditionRecord[] {
  const records: ConditionRecord[] = [];
  for (const c of fmh.condition ?? []) {
    const coding = c.code?.coding?.[0];
    const code = coding?.code ?? c.code?.text;
    if (code === undefined) continue;
    const display = coding?.display ?? c.code?.text;
    const record: ConditionRecord =
      display === undefined
        ? { code, status: AffectedStatus.Affected }
        : { code, display, status: AffectedStatus.Affected };
    records.push(record);
  }
  return records;
}

function extractName(patient: fhir4.Patient): string | undefined {
  const n = patient.name?.[0];
  if (n === undefined) return undefined;
  if (n.text !== undefined) return n.text;
  const parts = [...(n.given ?? []), n.family].filter((p): p is string => p !== undefined);
  return parts.length === 0 ? undefined : parts.join(' ');
}

function refToIndividualId(reference: string): IndividualId {
  const idx = reference.lastIndexOf('/');
  return idx === -1 ? reference : reference.slice(idx + 1);
}

/**
 * Disjoint-set union over individual IDs. Used to merge transitive twin
 * relationships: if A↔B and B↔C are both declared twins, all three end up in
 * the same group.
 */
class DSU {
  private readonly parents = new Map<string, string>();

  find(x: string): string {
    const seen = this.parents.get(x);
    if (seen === undefined) {
      this.parents.set(x, x);
      return x;
    }
    if (seen === x) return x;
    const root = this.find(seen);
    this.parents.set(x, root);
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parents.set(ra, rb);
  }

  /** Roots in the order they were first inserted. */
  roots(): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of this.parents.keys()) {
      const r = this.find(id);
      if (!seen.has(r)) {
        seen.add(r);
        out.push(r);
      }
    }
    return out;
  }

  members(root: string): string[] {
    const out: string[] = [];
    for (const id of this.parents.keys()) {
      if (this.find(id) === root) out.push(id);
    }
    return out;
  }
}

function defaultSemantics(sex: Sex, vital: VitalStatus, isProband: boolean): IndividualSemantics {
  return {
    sex,
    vital,
    conditions: [],
    carrier: CarrierStatus.None,
    twin: TwinType.None,
    proband: isProband,
    adopted: Adopted.None,
  };
}

function buildIndividual(args: {
  id: IndividualId;
  semantics: IndividualSemantics;
  provenance: Provenance;
  sourceRef?: { resourceType: 'Patient' | 'FamilyMemberHistory'; id: string };
  relationshipToProband?: string;
  name?: string;
}): Individual {
  const ind: Individual = {
    id: args.id,
    semantics: args.semantics,
    provenance: args.provenance,
  };
  if (args.sourceRef !== undefined) ind.sourceRef = args.sourceRef;
  if (args.relationshipToProband !== undefined) {
    ind.relationshipToProband = args.relationshipToProband;
  }
  if (args.name !== undefined) ind.name = args.name;
  return ind;
}

function buildProband(patient: fhir4.Patient): Individual {
  if (patient.id === undefined) {
    throw new PedigreeParseError('Patient resource is missing required `id` field');
  }
  const sex = mapGender(patient.gender);
  const vital = patientIsDeceased(patient) ? VitalStatus.Deceased : VitalStatus.Living;
  const name = extractName(patient);
  return buildIndividual({
    id: patient.id,
    semantics: defaultSemantics(sex, vital, true),
    provenance: Provenance.Explicit,
    sourceRef: { resourceType: 'Patient', id: patient.id },
    ...(name === undefined ? {} : { name }),
  });
}

function buildFmhIndividual(fmh: fhir4.FamilyMemberHistory): Individual | undefined {
  if (fmh.id === undefined) return undefined;
  const sex = extractFmhSex(fmh);
  const vital = fmhIsDeceased(fmh) ? VitalStatus.Deceased : VitalStatus.Living;
  const semantics: IndividualSemantics = {
    ...defaultSemantics(sex, vital, false),
    conditions: extractFmhConditions(fmh),
  };
  const relationshipToProband = fmh.relationship?.coding?.[0]?.code;
  return buildIndividual({
    id: fmh.id,
    semantics,
    provenance: Provenance.Explicit,
    sourceRef: { resourceType: 'FamilyMemberHistory', id: fmh.id },
    ...(relationshipToProband === undefined ? {} : { relationshipToProband }),
  });
}

/**
 * Sex assumed for a fabricated partner when only one parent is declared via
 * the genetics-parent extension. We fill the opposite sex when the known
 * parent's role is explicit; otherwise leave it Unknown.
 */
function fabricatedPartnerSex(knownRole: ParentRole | undefined): Sex {
  if (knownRole === ParentRole.Mother) return Sex.Male;
  if (knownRole === ParentRole.Father) return Sex.Female;
  return Sex.Unknown;
}

function ensureFabricatedPartner(
  individuals: Map<IndividualId, Individual>,
  partnerOf: IndividualId,
  knownRole: ParentRole | undefined,
): IndividualId {
  const id = `inferred:partner-of:${partnerOf}`;
  if (!individuals.has(id)) {
    individuals.set(
      id,
      buildIndividual({
        id,
        semantics: defaultSemantics(fabricatedPartnerSex(knownRole), VitalStatus.Living, false),
        provenance: Provenance.Inferred,
      }),
    );
  }
  return id;
}

/**
 * Parse a proband's Patient + family-history FMHs into a `PedigreeGraph`.
 *
 * This pass honours the explicit HL7 genetics-parent and genetics-sibling
 * extensions (open-pedigree convention). When those extensions are missing
 * entirely, the inference layer (`model/infer.ts`) will fill in the topology
 * from `relationship` codes; this module does the easy, deterministic work.
 *
 * Lenient on data integrity: malformed FMHs (missing `id`, dangling
 * references) are skipped silently so a partial graph still renders. The
 * validation layer (M4) surfaces those issues as warnings to consumers.
 */
export function parsePedigree(
  patient: fhir4.Patient,
  familyHistory: readonly fhir4.FamilyMemberHistory[],
): PedigreeGraph {
  const proband = buildProband(patient);
  const individuals = new Map<IndividualId, Individual>();
  individuals.set(proband.id, proband);

  for (const fmh of familyHistory) {
    const ind = buildFmhIndividual(fmh);
    if (ind !== undefined) individuals.set(ind.id, ind);
  }

  const couples = new Map<CoupleId, Couple>();
  const childOfByIndividual = new Map<IndividualId, CoupleId>();

  for (const fmh of familyHistory) {
    if (fmh.id === undefined) continue;
    const parents = getGeneticsParents(fmh);
    if (parents.length === 0) continue;

    const refs = parents.map((p) => ({
      id: refToIndividualId(p.reference),
      role: p.role,
    }));

    let partnerA: IndividualId;
    let partnerB: IndividualId;
    if (refs.length === 1) {
      const known = refs[0];
      // Unreachable: refs.length === 1 means refs[0] is defined. The check
      // exists only because noUncheckedIndexedAccess widens the index type.
      /* v8 ignore next */
      if (known === undefined) continue;
      partnerA = known.id;
      partnerB = ensureFabricatedPartner(individuals, known.id, known.role);
    } else {
      // Two or more parent references: take the first two; extras are
      // ignored (FHIR allows arbitrarily many extension repetitions, but a
      // child has at most two genetic parents).
      const a = refs[0];
      const b = refs[1];
      // Unreachable: refs.length >= 2 in this branch; both indices defined.
      /* v8 ignore next */
      if (a === undefined || b === undefined) continue;
      partnerA = a.id;
      partnerB = b.id;
    }

    const coupleId = makeCoupleId(partnerA, partnerB);
    if (!couples.has(coupleId)) {
      couples.set(coupleId, {
        id: coupleId,
        partners: [partnerA, partnerB],
        consanguineous: false,
        provenance: Provenance.Explicit,
      });
    }
    childOfByIndividual.set(fmh.id, coupleId);
  }

  // Apply childOf edges to the individuals map (immutable update of each
  // affected Individual).
  for (const [individualId, coupleId] of childOfByIndividual) {
    const ind = individuals.get(individualId);
    // Unreachable: every individualId in childOfByIndividual was inserted
    // into the individuals map in the loop above (FMHs without an id never
    // enter childOfByIndividual).
    /* v8 ignore next */
    if (ind === undefined) continue;
    individuals.set(individualId, { ...ind, childOf: coupleId });
  }

  // Twin grouping via genetics-sibling extensions with role=TWIN. Transitive
  // closure over all declared twin pairs.
  const dsu = new DSU();
  for (const fmh of familyHistory) {
    if (fmh.id === undefined) continue;
    for (const sib of getGeneticsSiblings(fmh)) {
      if (sib.role !== SiblingRole.SameBirth) continue;
      const otherId = refToIndividualId(sib.reference);
      if (!individuals.has(otherId)) continue;
      dsu.union(fmh.id, otherId);
    }
  }
  for (const root of dsu.roots()) {
    const members = dsu.members(root);
    // Unreachable from parsePedigree: dsu.union is only called with two ids
    // and always inserts both into the DSU, so every group has ≥ 2 members.
    /* v8 ignore next */
    if (members.length < 2) continue;
    const twinGroupId = `twin:${root}`;
    for (const memberId of members) {
      const ind = individuals.get(memberId);
      // Unreachable: members are only inserted via dsu.union after a
      // `individuals.has(otherId)` check, and the FMH id is itself in the
      // map by construction.
      /* v8 ignore next */
      if (ind === undefined) continue;
      individuals.set(memberId, {
        ...ind,
        twinGroupId,
        semantics: { ...ind.semantics, twin: TwinType.UnknownZygosity },
      });
    }
  }

  return {
    proband: proband.id,
    individuals: Object.fromEntries(individuals),
    couples: Object.fromEntries(couples),
  };
}
