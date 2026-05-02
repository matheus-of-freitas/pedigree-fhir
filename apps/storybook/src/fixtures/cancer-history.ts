import type {
  R4CodeableConcept,
  R4Extension,
  R4FamilyMemberHistory,
  R4Patient,
} from '@pedigree-fhir/core';
import type { Fixture } from './three-gen.js';

const V3_FAMILY = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
const V3_ROLE = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
const ADMIN_GENDER = 'http://hl7.org/fhir/administrative-gender';
const PARENT_EXT = 'http://hl7.org/fhir/StructureDefinition/family-member-history-genetics-parent';

function rel(code: string): R4CodeableConcept {
  return { coding: [{ system: V3_FAMILY, code }] };
}

function sex(code: 'male' | 'female'): R4CodeableConcept {
  return { coding: [{ system: ADMIN_GENDER, code }] };
}

function parentExt(ref: string, role: 'NMTH' | 'NFTH'): R4Extension {
  return {
    url: PARENT_EXT,
    extension: [
      { url: 'reference', valueReference: { reference: ref } },
      {
        url: 'type',
        valueCodeableConcept: { coding: [{ system: V3_ROLE, code: role }] },
      },
    ],
  };
}

function years(value: number) {
  return { value, unit: 'a', code: 'a' };
}

function condition(code: string, display: string, onsetAge?: number) {
  return {
    code: { coding: [{ code, display }] },
    ...(onsetAge === undefined ? {} : { onsetAge: years(onsetAge) }),
  };
}

const patient: R4Patient = {
  resourceType: 'Patient',
  id: 'proband',
  gender: 'female',
  birthDate: '1977-05-04',
  name: [{ text: 'Elena Rivera' }],
};

const familyHistory: R4FamilyMemberHistory[] = [
  {
    resourceType: 'FamilyMemberHistory',
    id: 'mother',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('MTH'),
    sex: sex('female'),
    name: 'Brenda',
    ageAge: years(74),
    extension: [
      parentExt('FamilyMemberHistory/mgm', 'NMTH'),
      parentExt('FamilyMemberHistory/mgf', 'NFTH'),
    ],
    condition: [
      condition('254837009', 'Breast cancer', 68),
      condition('363354003', 'Cervical cancer', 70),
    ],
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'father',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('FTH'),
    sex: sex('male'),
    name: 'Doug',
    ageAge: years(74),
    extension: [
      parentExt('FamilyMemberHistory/pgm', 'NMTH'),
      parentExt('FamilyMemberHistory/pgf', 'NFTH'),
    ],
    condition: [
      condition('394592004', 'Sarcoma', 55),
      condition('126906006', 'Prostate cancer', 65),
    ],
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'mgm',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('MGRMTH'),
    sex: sex('female'),
    name: 'Eugenia',
    deceasedBoolean: true,
    deceasedAge: years(48),
    condition: [condition('363443007', 'Ovarian cancer', 45)],
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'mgf',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('MGRFTH'),
    sex: sex('male'),
    name: 'Sandy',
    deceasedBoolean: true,
    deceasedAge: years(88),
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'pgm',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('PGRMTH'),
    sex: sex('female'),
    name: 'Grandmother',
    deceasedBoolean: true,
    deceasedAge: years(81),
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'pgf',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('PGRFTH'),
    sex: sex('male'),
    name: 'Grandfather',
    deceasedBoolean: true,
    deceasedAge: years(79),
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'maunt',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('MAUNT'),
    sex: sex('female'),
    name: 'Claudia',
    ageAge: years(70),
    extension: [
      parentExt('FamilyMemberHistory/mgm', 'NMTH'),
      parentExt('FamilyMemberHistory/mgf', 'NFTH'),
    ],
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'puncle',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('PUNCLE'),
    sex: sex('male'),
    name: 'Mark',
    ageAge: years(45),
    extension: [
      parentExt('FamilyMemberHistory/pgm', 'NMTH'),
      parentExt('FamilyMemberHistory/pgf', 'NFTH'),
    ],
    condition: [condition('126906006', 'Met. Prostate', 45)],
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'sister',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('NSIS'),
    sex: sex('female'),
    name: 'Courtney',
    ageAge: years(47),
    extension: [
      parentExt('FamilyMemberHistory/mother', 'NMTH'),
      parentExt('FamilyMemberHistory/father', 'NFTH'),
    ],
    condition: [
      condition('254837009', 'Breast cancer', 43),
      condition('363443007', 'Ovarian cancer', 41),
      condition('394592004', 'Sarcoma', 39),
      condition('363354003', 'Cervical cancer', 35),
      condition('372244006', 'Melanoma', 37),
    ],
  },
];

export const familyCancerHistory: Fixture = { patient, familyHistory };
