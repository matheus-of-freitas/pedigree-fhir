/// <reference types="fhir" />

const V3_FAMILY = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
const V3_ROLE = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
const ADMIN_GENDER = 'http://hl7.org/fhir/administrative-gender';
const PARENT_EXT = 'http://hl7.org/fhir/StructureDefinition/family-member-history-genetics-parent';
const SIBLING_EXT =
  'http://hl7.org/fhir/StructureDefinition/family-member-history-genetics-sibling';

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

function siblingExt(ref?: string): fhir4.Extension {
  return {
    url: SIBLING_EXT,
    extension: [
      ...(ref === undefined ? [] : [{ url: 'reference', valueReference: { reference: ref } }]),
      {
        url: 'type',
        valueCodeableConcept: { coding: [{ system: V3_ROLE, code: 'TWIN' }] },
      },
    ],
  };
}

export interface Fixture {
  patient: fhir4.Patient;
  familyHistory: fhir4.FamilyMemberHistory[];
}

/**
 * Full 3-generation pedigree: proband + parents + both grandparent couples,
 * one maternal aunt, one paternal uncle, and one sister. Two affected
 * individuals (maternal grandmother and proband's sister) for visual variety.
 */
export const threeGen: Fixture = {
  patient: {
    resourceType: 'Patient',
    id: 'proband',
    gender: 'female',
    name: [{ text: 'Ada Byron' }],
  },
  familyHistory: [
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
  ],
};

/** Minimal: just the proband — exercises empty-state layout. */
export const probandOnly: Fixture = {
  patient: { resourceType: 'Patient', id: 'proband', gender: 'female' },
  familyHistory: [],
};

/** Partial: only maternal-side relatives, used to verify asymmetric layouts. */
export const maternalOnly: Fixture = {
  patient: { resourceType: 'Patient', id: 'proband', gender: 'female' },
  familyHistory: [
    {
      resourceType: 'FamilyMemberHistory',
      id: 'mother',
      status: 'completed',
      patient: { reference: 'Patient/proband' },
      relationship: rel('MTH'),
      sex: sex('female'),
    },
    {
      resourceType: 'FamilyMemberHistory',
      id: 'mgm',
      status: 'completed',
      patient: { reference: 'Patient/proband' },
      relationship: rel('MGRMTH'),
      sex: sex('female'),
    },
    {
      resourceType: 'FamilyMemberHistory',
      id: 'maunt',
      status: 'completed',
      patient: { reference: 'Patient/proband' },
      relationship: rel('MAUNT'),
      sex: sex('female'),
    },
  ],
};

/**
 * Incomplete: missing one grandparent, mismatched sex/relationship — meant
 * for the M4 validation stories. Layout still renders (lenient parse).
 */
export const incomplete: Fixture = {
  patient: { resourceType: 'Patient', id: 'proband', gender: 'female' },
  familyHistory: [
    {
      resourceType: 'FamilyMemberHistory',
      id: 'mother',
      status: 'completed',
      patient: { reference: 'Patient/proband' },
      relationship: rel('MTH'),
      // Intentional sex mismatch — MTH should be female; validation will flag.
      sex: sex('male'),
    },
  ],
};

/**
 * Malformed raw FHIR input: mismatched patient refs, duplicate/missing ids,
 * malformed genetics extensions, and self/unknown sibling references.
 * Parsing still produces a partial graph, but input validation should surface
 * the source-data problems explicitly.
 */
export const malformedInput: Fixture = {
  patient: { resourceType: 'Patient', id: 'proband', gender: 'female' },
  familyHistory: [
    {
      resourceType: 'FamilyMemberHistory',
      id: 'mother',
      status: 'completed',
      patient: { reference: 'Patient/elsewhere' },
      relationship: { coding: [] },
      sex: sex('female'),
      extension: [
        {
          url: PARENT_EXT,
          extension: [
            { url: 'type', valueCodeableConcept: { coding: [{ system: V3_ROLE, code: 'NMTH' }] } },
          ],
        },
        parentExt('FamilyMemberHistory/ghost', 'NMTH'),
        parentExt('FamilyMemberHistory/mother', 'NFTH'),
      ],
    },
    {
      resourceType: 'FamilyMemberHistory',
      id: 'mother',
      status: 'completed',
      patient: { reference: 'Patient/proband' },
      relationship: rel('MTH'),
      sex: sex('female'),
    },
    {
      resourceType: 'FamilyMemberHistory',
      id: 'sister',
      status: 'completed',
      patient: { reference: 'Patient/proband' },
      relationship: rel('NSIS'),
      sex: sex('female'),
      extension: [
        siblingExt(),
        siblingExt('FamilyMemberHistory/ghost'),
        siblingExt('FamilyMemberHistory/sister'),
      ],
    },
    {
      resourceType: 'FamilyMemberHistory',
      status: 'completed',
      patient: { reference: 'Patient/proband' },
      relationship: rel('MAUNT'),
    },
  ],
};
