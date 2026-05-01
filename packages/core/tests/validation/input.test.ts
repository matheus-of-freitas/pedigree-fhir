/// <reference types="fhir" />
import { describe, expect, it } from 'vitest';
import {
  GENETICS_PARENT_EXTENSION,
  GENETICS_SIBLING_EXTENSION,
} from '../../src/fhir/extensions.js';
import { validateFhirInput } from '../../src/validation/input.js';
import { patient } from '../fixtures/builders.js';

const V3_ROLE = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';

function parentExtension(reference?: string): fhir4.Extension {
  return {
    url: GENETICS_PARENT_EXTENSION,
    extension: [
      ...(reference === undefined ? [] : [{ url: 'reference', valueReference: { reference } }]),
      {
        url: 'type',
        valueCodeableConcept: { coding: [{ system: V3_ROLE, code: 'NMTH' }] },
      },
    ],
  };
}

function siblingExtension(reference?: string): fhir4.Extension {
  return {
    url: GENETICS_SIBLING_EXTENSION,
    extension: [
      ...(reference === undefined ? [] : [{ url: 'reference', valueReference: { reference } }]),
      {
        url: 'type',
        valueCodeableConcept: { coding: [{ system: V3_ROLE, code: 'TWIN' }] },
      },
    ],
  };
}

describe('validateFhirInput', () => {
  it('flags a patient missing the required id', () => {
    const diagnostics = validateFhirInput({ resourceType: 'Patient' } as fhir4.Patient, []);
    expect(diagnostics).toEqual([
      {
        code: 'input/patient-missing-id',
        severity: 'error',
        message: 'Patient is missing required `id`; parsePedigree() will throw.',
        individualIds: [],
        resourceRefs: [{ resourceType: 'Patient', path: 'patient' }],
      },
    ]);
  });

  it('flags missing and duplicate FamilyMemberHistory ids', () => {
    const diagnostics = validateFhirInput(patient({ id: 'p' }), [
      {
        resourceType: 'FamilyMemberHistory',
        status: 'completed',
        patient: { reference: 'Patient/p' },
        relationship: { coding: [{ code: 'MTH' }] },
      },
      {
        resourceType: 'FamilyMemberHistory',
        id: 'dup',
        status: 'completed',
        patient: { reference: 'Patient/p' },
        relationship: { coding: [{ code: 'MTH' }] },
      },
      {
        resourceType: 'FamilyMemberHistory',
        id: 'dup',
        status: 'completed',
        patient: { reference: 'Patient/p' },
        relationship: { coding: [{ code: 'FTH' }] },
      },
    ]);

    expect(diagnostics.map((d) => d.code)).toEqual([
      'input/fmh-missing-id',
      'input/fmh-duplicate-id',
    ]);
    expect(diagnostics[1]?.resourceRefs).toEqual([
      { resourceType: 'FamilyMemberHistory', id: 'dup', path: 'familyHistory[1]' },
      { resourceType: 'FamilyMemberHistory', id: 'dup', path: 'familyHistory[2]' },
    ]);
  });

  it('flags mismatched patient references and missing relationship codes', () => {
    const diagnostics = validateFhirInput(patient({ id: 'p' }), [
      {
        resourceType: 'FamilyMemberHistory',
        id: 'm',
        status: 'completed',
        patient: { reference: 'Patient/other' },
        relationship: { coding: [] },
      },
      {
        resourceType: 'FamilyMemberHistory',
        id: 'f',
        status: 'completed',
        patient: {},
        relationship: { coding: [{ code: 'FTH' }] },
      },
    ]);

    expect(diagnostics.map((d) => d.code)).toEqual([
      'input/fmh-patient-reference-mismatch',
      'input/relationship-missing',
      'input/fmh-patient-reference-missing',
    ]);
  });

  it('flags malformed genetics-parent extensions that parsing otherwise tolerates', () => {
    const diagnostics = validateFhirInput(patient({ id: 'p' }), [
      {
        resourceType: 'FamilyMemberHistory',
        id: 'known-parent',
        status: 'completed',
        patient: { reference: 'Patient/p' },
        relationship: { coding: [{ code: 'MTH' }] },
      },
      {
        resourceType: 'FamilyMemberHistory',
        id: 'extra-parent',
        status: 'completed',
        patient: { reference: 'Patient/p' },
        relationship: { coding: [{ code: 'MAUNT' }] },
      },
      {
        resourceType: 'FamilyMemberHistory',
        id: 'child',
        status: 'completed',
        patient: { reference: 'Patient/p' },
        relationship: { coding: [{ code: 'NSIS' }] },
        extension: [
          parentExtension(),
          parentExtension('FamilyMemberHistory/ghost'),
          parentExtension('FamilyMemberHistory/child'),
          parentExtension('FamilyMemberHistory/known-parent'),
          parentExtension('FamilyMemberHistory/known-parent'),
          parentExtension('FamilyMemberHistory/extra-parent'),
        ],
      },
    ]);

    expect(diagnostics.map((d) => d.code)).toEqual([
      'input/parent-reference-missing',
      'input/parent-reference-unknown',
      'input/parent-reference-self',
      'input/parent-reference-duplicate',
      'input/parent-reference-overflow',
    ]);
    expect(diagnostics[1]?.resourceRefs?.[0]?.reference).toBe('FamilyMemberHistory/ghost');
  });

  it('flags malformed genetics-sibling extensions', () => {
    const diagnostics = validateFhirInput(patient({ id: 'p' }), [
      {
        resourceType: 'FamilyMemberHistory',
        id: 'sib',
        status: 'completed',
        patient: { reference: 'Patient/p' },
        relationship: { coding: [{ code: 'NSIS' }] },
        extension: [
          siblingExtension(),
          siblingExtension('FamilyMemberHistory/ghost'),
          siblingExtension('FamilyMemberHistory/sib'),
        ],
      },
    ]);

    expect(diagnostics.map((d) => d.code)).toEqual([
      'input/sibling-reference-missing',
      'input/sibling-reference-unknown',
      'input/sibling-reference-self',
    ]);
  });

  it('still validates malformed records without ids across patient, relationship, and reference checks', () => {
    const diagnostics = validateFhirInput(patient({ id: 'p' }), [
      {
        resourceType: 'FamilyMemberHistory',
        status: 'completed',
        patient: {},
        relationship: { coding: [] },
        extension: [parentExtension('ghost'), siblingExtension(), siblingExtension('ghost')],
      },
    ]);

    expect(diagnostics.map((d) => d.code)).toEqual([
      'input/fmh-missing-id',
      'input/fmh-patient-reference-missing',
      'input/relationship-missing',
      'input/parent-reference-unknown',
      'input/sibling-reference-missing',
      'input/sibling-reference-unknown',
    ]);
    expect(diagnostics[1]?.message).toContain('familyHistory[0]');
    expect(diagnostics[3]?.resourceRefs?.[0]?.reference).toBe('ghost');
  });

  it('handles missing-id mismatch diagnostics and extensions without nested content', () => {
    const diagnostics = validateFhirInput(patient({ id: 'p' }), [
      {
        resourceType: 'FamilyMemberHistory',
        status: 'completed',
        patient: { reference: 'Patient/other' },
        relationship: { coding: [{ code: 'NSIS' }] },
        extension: [{ url: GENETICS_SIBLING_EXTENSION }],
      },
    ]);

    expect(diagnostics.map((d) => d.code)).toEqual([
      'input/fmh-missing-id',
      'input/fmh-patient-reference-mismatch',
      'input/sibling-reference-missing',
    ]);
    expect(diagnostics[1]?.resourceRefs?.[0]).toEqual({
      resourceType: 'FamilyMemberHistory',
      path: 'familyHistory[0]',
      reference: 'Patient/other',
    });
  });
});
