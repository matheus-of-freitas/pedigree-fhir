import {
  type Individual,
  type IndividualId,
  type PedigreeGraph,
  Provenance,
} from '../model/types.js';
import { type AgeObservation, type AgeQuantity, Sex, VitalStatus } from '../psc/semantics.js';
import {
  type GeneticsParent,
  type GeneticsSibling,
  ParentRole,
  SiblingRole,
  setGeneticsExtensions,
} from './extensions.js';
import type { R4CodeableConcept, R4FamilyMemberHistory, R4Patient } from './types.js';

const ADMIN_GENDER = 'http://hl7.org/fhir/administrative-gender';
const V3_FAMILY = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
/** Default v3 RoleCode used when an individual has no `relationshipToProband`. */
const DEFAULT_RELATIONSHIP = 'FAMMEMB';

export interface SerializedPedigree {
  patient: R4Patient;
  familyHistory: R4FamilyMemberHistory[];
}

function sexToGender(s: Sex): 'male' | 'female' | 'other' | undefined {
  if (s === Sex.Male) return 'male';
  if (s === Sex.Female) return 'female';
  if (s === Sex.Other) return 'other';
  return undefined;
}

function parentRoleForSex(sex: Sex): ParentRole | undefined {
  if (sex === Sex.Female) return ParentRole.Mother;
  if (sex === Sex.Male) return ParentRole.Father;
  return undefined;
}

function relationshipConcept(code: string | undefined): R4CodeableConcept {
  return { coding: [{ system: V3_FAMILY, code: code ?? DEFAULT_RELATIONSHIP }] };
}

function buildPatient(ind: Individual): R4Patient {
  const p: R4Patient = { resourceType: 'Patient', id: ind.id };
  const gender = sexToGender(ind.semantics.sex);
  if (gender !== undefined) p.gender = gender;
  if (ind.semantics.vital === VitalStatus.Deceased) p.deceasedBoolean = true;
  if (ind.name !== undefined) p.name = [{ text: ind.name }];
  if (ind.birthDate !== undefined) p.birthDate = ind.birthDate;
  return p;
}

function toFhirQuantity(quantity: AgeQuantity) {
  return {
    value: quantity.value,
    ...(quantity.unit === undefined ? {} : { unit: quantity.unit }),
    ...(quantity.code === undefined ? {} : { code: quantity.code }),
    ...(quantity.system === undefined ? {} : { system: quantity.system }),
  };
}

function ageObservationFields(
  age: AgeObservation | undefined,
  prefix: 'age' | 'deceased' | 'onset',
): Record<string, unknown> {
  if (age === undefined) return {};

  if (age.kind === 'quantity') {
    if (prefix === 'age') return { ageAge: toFhirQuantity(age.quantity) };
    if (prefix === 'deceased') return { deceasedAge: toFhirQuantity(age.quantity) };
    return { onsetAge: toFhirQuantity(age.quantity) };
  }

  if (age.kind === 'range') {
    const range = {
      ...(age.range.low === undefined ? {} : { low: toFhirQuantity(age.range.low) }),
      ...(age.range.high === undefined ? {} : { high: toFhirQuantity(age.range.high) }),
    };
    if (prefix === 'age') return { ageRange: range };
    if (prefix === 'deceased') return { deceasedRange: range };
    return { onsetRange: range };
  }

  if (prefix === 'age') return { ageString: age.text };
  if (prefix === 'deceased') return { deceasedString: age.text };
  return { onsetString: age.text };
}

function buildBaseFmh(ind: Individual, probandId: IndividualId): R4FamilyMemberHistory {
  const r: R4FamilyMemberHistory = {
    resourceType: 'FamilyMemberHistory',
    id: ind.id,
    status: 'completed',
    patient: { reference: `Patient/${probandId}` },
    relationship: relationshipConcept(ind.relationshipToProband),
  };
  const gender = sexToGender(ind.semantics.sex);
  if (gender !== undefined) {
    r.sex = { coding: [{ system: ADMIN_GENDER, code: gender }] };
  }
  if (ind.semantics.vital === VitalStatus.Deceased) r.deceasedBoolean = true;
  if (ind.name !== undefined) r.name = ind.name;
  if (ind.birthDate !== undefined) r.bornDate = ind.birthDate;
  Object.assign(r, ageObservationFields(ind.age, 'age'));
  Object.assign(r, ageObservationFields(ind.deceasedAge, 'deceased'));
  if (ind.semantics.conditions.length > 0) {
    r.condition = ind.semantics.conditions.map((c) => {
      const condition: NonNullable<R4FamilyMemberHistory['condition']>[number] = {
        code: {
          coding: [
            c.display === undefined ? { code: c.code } : { code: c.code, display: c.display },
          ],
        },
      };
      Object.assign(condition, ageObservationFields(c.onsetAge, 'onset'));
      return condition;
    });
  }
  return r;
}

function geneticsParentsFor(graph: PedigreeGraph, ind: Individual): GeneticsParent[] {
  if (ind.childOf === undefined) return [];
  const couple = graph.couples[ind.childOf];
  if (couple === undefined) return [];
  const result: GeneticsParent[] = [];
  for (const partnerId of couple.partners) {
    const partner = graph.individuals[partnerId];
    if (partner === undefined) continue;
    // Inferred placeholders are not part of the FHIR data; skip refs to them.
    if (partner.provenance !== Provenance.Explicit) continue;
    const role = parentRoleForSex(partner.semantics.sex);
    const reference = `FamilyMemberHistory/${partnerId}`;
    result.push(role === undefined ? { reference } : { reference, role });
  }
  return result;
}

function geneticsSiblingsFor(
  graph: PedigreeGraph,
  ind: Individual,
  twinMembersByGroup: ReadonlyMap<string, IndividualId[]>,
): GeneticsSibling[] {
  if (ind.twinGroupId === undefined) return [];
  // `indexTwinGroups` records every individual carrying a twinGroupId, so the
  // map always contains an entry for any group that any individual references.
  /* v8 ignore next */
  const members = twinMembersByGroup.get(ind.twinGroupId) ?? [];
  const result: GeneticsSibling[] = [];
  for (const otherId of members) {
    if (otherId === ind.id) continue;
    const other = graph.individuals[otherId];
    // `members` came directly from iterating graph.individuals, so every id
    // resolves back to a real Individual.
    /* v8 ignore next */
    if (other === undefined) continue;
    if (other.provenance !== Provenance.Explicit) continue;
    result.push({ reference: `FamilyMemberHistory/${otherId}`, role: SiblingRole.SameBirth });
  }
  return result;
}

function indexTwinGroups(graph: PedigreeGraph): Map<string, IndividualId[]> {
  const groups = new Map<string, IndividualId[]>();
  for (const ind of Object.values(graph.individuals)) {
    if (ind.twinGroupId === undefined) continue;
    const list = groups.get(ind.twinGroupId);
    if (list === undefined) groups.set(ind.twinGroupId, [ind.id]);
    else list.push(ind.id);
  }
  return groups;
}

/**
 * Serialize a `PedigreeGraph` to a FHIR `Patient` and a list of
 * `FamilyMemberHistory` resources.
 *
 * Round-trip contract: `parsePedigree(serializePedigree(graph)) ≈ graph` for
 * the *explicit* substructure of `graph`. `Provenance.Inferred` individuals
 * (fabricated placeholders for missing parents/grandparents) are intentionally
 * dropped — they are not real FHIR data and will be re-fabricated by
 * `inferRelationships` on the next parse. Genetics-parent and genetics-sibling
 * extensions therefore only reference Explicit individuals; if every partner
 * in a couple is Inferred, no genetics-parent extension is emitted at all.
 */
export function serializePedigree(graph: PedigreeGraph): SerializedPedigree {
  const proband = graph.individuals[graph.proband];
  if (proband === undefined) {
    return { patient: { resourceType: 'Patient' }, familyHistory: [] };
  }

  const patient = buildPatient(proband);
  const twinGroups = indexTwinGroups(graph);
  const familyHistory: R4FamilyMemberHistory[] = [];

  for (const ind of Object.values(graph.individuals)) {
    if (ind.id === graph.proband) continue;
    if (ind.provenance !== Provenance.Explicit) continue;
    const base = buildBaseFmh(ind, graph.proband);
    const parents = geneticsParentsFor(graph, ind);
    const siblings = geneticsSiblingsFor(graph, ind, twinGroups);
    const fmh = setGeneticsExtensions(base, {
      ...(parents.length > 0 ? { parents } : {}),
      ...(siblings.length > 0 ? { siblings } : {}),
    });
    familyHistory.push(fmh);
  }

  return { patient, familyHistory };
}
