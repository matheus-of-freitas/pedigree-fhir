/// <reference types="fhir" />
import {
  GENETICS_PARENT_EXTENSION,
  GENETICS_SIBLING_EXTENSION,
  type ParentRole,
  type SiblingRole,
} from '../../src/fhir/extensions.js';

const V3_ROLE = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
const V3_FAMILY = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';

/**
 * Small builders for FHIR fixtures used across parse/serialize/validation
 * tests. Kept minimal: every helper accepts only the fields the tests
 * actually vary.
 */

export function patient(args: {
  id: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  deceased?: boolean;
  name?: string;
}): fhir4.Patient {
  const p: fhir4.Patient = { resourceType: 'Patient', id: args.id };
  if (args.gender !== undefined) p.gender = args.gender;
  if (args.deceased !== undefined) p.deceasedBoolean = args.deceased;
  if (args.name !== undefined) p.name = [{ text: args.name }];
  return p;
}

export function fmh(args: {
  id: string;
  patientId: string;
  relationship?: string;
  sex?: 'male' | 'female' | 'other' | 'unknown';
  deceased?: boolean;
  conditions?: { code: string; display?: string }[];
  parentRefs?: { reference: string; role?: ParentRole }[];
  siblingRefs?: { reference: string; role?: SiblingRole }[];
}): fhir4.FamilyMemberHistory {
  const r: fhir4.FamilyMemberHistory = {
    resourceType: 'FamilyMemberHistory',
    id: args.id,
    status: 'completed',
    patient: { reference: `Patient/${args.patientId}` },
    relationship:
      args.relationship === undefined
        ? { coding: [] }
        : { coding: [{ system: V3_FAMILY, code: args.relationship }] },
  };
  if (args.sex !== undefined) {
    r.sex = {
      coding: [{ system: 'http://hl7.org/fhir/administrative-gender', code: args.sex }],
    };
  }
  if (args.deceased !== undefined) r.deceasedBoolean = args.deceased;
  if (args.conditions !== undefined && args.conditions.length > 0) {
    r.condition = args.conditions.map((c) => ({
      code: {
        coding: [c.display === undefined ? { code: c.code } : { code: c.code, display: c.display }],
      },
    }));
  }
  const exts: fhir4.Extension[] = [];
  for (const p of args.parentRefs ?? []) {
    const sub: fhir4.Extension[] = [
      { url: 'reference', valueReference: { reference: p.reference } },
    ];
    if (p.role !== undefined) {
      sub.push({
        url: 'type',
        valueCodeableConcept: { coding: [{ system: V3_ROLE, code: p.role }] },
      });
    }
    exts.push({ url: GENETICS_PARENT_EXTENSION, extension: sub });
  }
  for (const s of args.siblingRefs ?? []) {
    const sub: fhir4.Extension[] = [
      { url: 'reference', valueReference: { reference: s.reference } },
    ];
    if (s.role !== undefined) {
      sub.push({
        url: 'type',
        valueCodeableConcept: { coding: [{ system: V3_ROLE, code: s.role }] },
      });
    }
    exts.push({ url: GENETICS_SIBLING_EXTENSION, extension: sub });
  }
  if (exts.length > 0) r.extension = exts;
  return r;
}
