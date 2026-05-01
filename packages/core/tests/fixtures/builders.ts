import {
  GENETICS_PARENT_EXTENSION,
  GENETICS_SIBLING_EXTENSION,
  type ParentRole,
  type SiblingRole,
} from '../../src/fhir/extensions.js';
import type { R4Extension, R4FamilyMemberHistory, R4Patient } from '../../src/fhir/types.js';

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
  birthDate?: string;
}): R4Patient {
  const p: R4Patient = { resourceType: 'Patient', id: args.id };
  if (args.gender !== undefined) p.gender = args.gender;
  if (args.deceased !== undefined) p.deceasedBoolean = args.deceased;
  if (args.name !== undefined) p.name = [{ text: args.name }];
  if (args.birthDate !== undefined) p.birthDate = args.birthDate;
  return p;
}

export function fmh(args: {
  id: string;
  patientId: string;
  relationship?: string;
  sex?: 'male' | 'female' | 'other' | 'unknown';
  deceased?: boolean;
  name?: string;
  bornDate?: string;
  age?: number | string;
  deceasedAge?: number | string;
  conditions?: { code: string; display?: string; onsetAge?: number | string }[];
  parentRefs?: { reference: string; role?: ParentRole }[];
  siblingRefs?: { reference: string; role?: SiblingRole }[];
}): R4FamilyMemberHistory {
  const r: R4FamilyMemberHistory = {
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
  if (args.name !== undefined) r.name = args.name;
  if (args.bornDate !== undefined) r.bornDate = args.bornDate;
  if (typeof args.age === 'number') r.ageAge = { value: args.age, unit: 'a', code: 'a' };
  if (typeof args.age === 'string') r.ageString = args.age;
  if (typeof args.deceasedAge === 'number') {
    r.deceasedAge = { value: args.deceasedAge, unit: 'a', code: 'a' };
  }
  if (typeof args.deceasedAge === 'string') r.deceasedString = args.deceasedAge;
  if (args.conditions !== undefined && args.conditions.length > 0) {
    r.condition = args.conditions.map((c) => ({
      code: {
        coding: [c.display === undefined ? { code: c.code } : { code: c.code, display: c.display }],
      },
      ...(typeof c.onsetAge === 'number'
        ? { onsetAge: { value: c.onsetAge, unit: 'a', code: 'a' } }
        : {}),
      ...(typeof c.onsetAge === 'string' ? { onsetString: c.onsetAge } : {}),
    }));
  }
  const exts: R4Extension[] = [];
  for (const p of args.parentRefs ?? []) {
    const sub: R4Extension[] = [{ url: 'reference', valueReference: { reference: p.reference } }];
    if (p.role !== undefined) {
      sub.push({
        url: 'type',
        valueCodeableConcept: { coding: [{ system: V3_ROLE, code: p.role }] },
      });
    }
    exts.push({ url: GENETICS_PARENT_EXTENSION, extension: sub });
  }
  for (const s of args.siblingRefs ?? []) {
    const sub: R4Extension[] = [{ url: 'reference', valueReference: { reference: s.reference } }];
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
