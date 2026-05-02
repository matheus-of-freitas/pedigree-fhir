import {
  type ParentRole,
  type PedigreeGraph,
  type PedigreeStore,
  type R4Extension,
  type R4FamilyMemberHistory,
  type R4Patient,
  createPedigreeStore,
  inferRelationships,
  parsePedigree,
} from '@pedigree-fhir/core';

const V3_ROLE = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
const V3_FAMILY = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
const ADMIN_GENDER = 'http://hl7.org/fhir/administrative-gender';

function patient(args: {
  id: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
}): R4Patient {
  const p: R4Patient = { resourceType: 'Patient', id: args.id };
  if (args.gender !== undefined) p.gender = args.gender;
  return p;
}

function fmh(args: {
  id: string;
  patientId: string;
  relationship: string;
  sex?: 'male' | 'female' | 'other' | 'unknown';
  parentRefs?: { reference: string; role?: ParentRole }[];
}): R4FamilyMemberHistory {
  const r: R4FamilyMemberHistory = {
    resourceType: 'FamilyMemberHistory',
    id: args.id,
    status: 'completed',
    patient: { reference: `Patient/${args.patientId}` },
    relationship: { coding: [{ system: V3_FAMILY, code: args.relationship }] },
  };
  if (args.sex !== undefined) {
    r.sex = { coding: [{ system: ADMIN_GENDER, code: args.sex }] };
  }
  if (args.parentRefs !== undefined && args.parentRefs.length > 0) {
    r.extension = args.parentRefs.map((p) => {
      const subs: R4Extension[] = [
        { url: 'reference', valueReference: { reference: p.reference } },
      ];
      if (p.role !== undefined) {
        subs.push({
          url: 'type',
          valueCodeableConcept: { coding: [{ system: V3_ROLE, code: p.role }] },
        });
      }
      return {
        url: 'http://hl7.org/fhir/StructureDefinition/family-member-history-genetics-parent',
        extension: subs,
      };
    });
  }
  return r;
}

export function tinyGraph(): PedigreeGraph {
  return inferRelationships(
    parsePedigree(patient({ id: 'p', gender: 'female' }), [
      fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }),
      fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' }),
    ]),
  );
}

export function tinyStore(): PedigreeStore {
  return createPedigreeStore({ graph: tinyGraph(), layoutOptions: {} });
}
