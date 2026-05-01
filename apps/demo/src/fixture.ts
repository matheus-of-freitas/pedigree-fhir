/// <reference types="fhir" />

const V3_FAMILY = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
const V3_ROLE = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
const ADMIN_GENDER = 'http://hl7.org/fhir/administrative-gender';
const PARENT_EXT = 'http://hl7.org/fhir/StructureDefinition/family-member-history-genetics-parent';

function rel(code: string): fhir4.CodeableConcept {
  return { coding: [{ system: V3_FAMILY, code }] };
}

function sex(code: 'male' | 'female'): fhir4.CodeableConcept {
  return { coding: [{ system: ADMIN_GENDER, code }] };
}

function parentExt(ref: string, role: 'NMTH' | 'NFTH'): fhir4.Extension {
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

/** A 3-generation pedigree fixture covering both lineages, with one sibling. */
export const proband: fhir4.Patient = {
  resourceType: 'Patient',
  id: 'proband',
  gender: 'female',
  name: [{ text: 'Ada Byron' }],
};

export const familyHistory: fhir4.FamilyMemberHistory[] = [
  {
    resourceType: 'FamilyMemberHistory',
    id: 'mother',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('MTH'),
    sex: sex('female'),
    extension: [
      parentExt('FamilyMemberHistory/mgm', 'NMTH'),
      parentExt('FamilyMemberHistory/mgf', 'NFTH'),
    ],
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'father',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('FTH'),
    sex: sex('male'),
    extension: [
      parentExt('FamilyMemberHistory/pgm', 'NMTH'),
      parentExt('FamilyMemberHistory/pgf', 'NFTH'),
    ],
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'mgm',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('MGRMTH'),
    sex: sex('female'),
    deceasedBoolean: true,
    condition: [{ code: { coding: [{ code: '254837009', display: 'Breast cancer' }] } }],
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'mgf',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('MGRFTH'),
    sex: sex('male'),
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'pgm',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('PGRMTH'),
    sex: sex('female'),
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'pgf',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('PGRFTH'),
    sex: sex('male'),
    deceasedBoolean: true,
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'maunt',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('MAUNT'),
    sex: sex('female'),
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
    extension: [
      parentExt('FamilyMemberHistory/pgm', 'NMTH'),
      parentExt('FamilyMemberHistory/pgf', 'NFTH'),
    ],
  },
  {
    resourceType: 'FamilyMemberHistory',
    id: 'sister',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
    relationship: rel('NSIS'),
    sex: sex('female'),
    extension: [
      parentExt('FamilyMemberHistory/mother', 'NMTH'),
      parentExt('FamilyMemberHistory/father', 'NFTH'),
    ],
    condition: [{ code: { coding: [{ code: '254837009', display: 'Breast cancer' }] } }],
  },
];
