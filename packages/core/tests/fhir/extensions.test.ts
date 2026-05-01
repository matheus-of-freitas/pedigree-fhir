import { describe, expect, it } from 'vitest';
import {
  GENETICS_OBSERVATION_EXTENSION,
  GENETICS_PARENT_EXTENSION,
  GENETICS_SIBLING_EXTENSION,
  ParentRole,
  type R4Extension,
  type R4FamilyMemberHistory,
  SiblingRole,
  getGeneticsObservationRefs,
  getGeneticsParents,
  getGeneticsSiblings,
  setGeneticsExtensions,
} from '../../src/fhir/extensions.js';

const V3_ROLE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';

function fmh(extension?: R4Extension[]): R4FamilyMemberHistory {
  const r: R4FamilyMemberHistory = {
    resourceType: 'FamilyMemberHistory',
    status: 'completed',
    patient: { reference: 'Patient/proband' },
  };
  if (extension !== undefined) r.extension = extension;
  return r;
}

describe('genetics extension URL constants', () => {
  it('exposes the three HL7 genetics URLs', () => {
    expect(GENETICS_PARENT_EXTENSION).toBe(
      'http://hl7.org/fhir/StructureDefinition/family-member-history-genetics-parent',
    );
    expect(GENETICS_SIBLING_EXTENSION).toBe(
      'http://hl7.org/fhir/StructureDefinition/family-member-history-genetics-sibling',
    );
    expect(GENETICS_OBSERVATION_EXTENSION).toBe(
      'http://hl7.org/fhir/StructureDefinition/family-member-history-genetics-observation',
    );
  });

  it('exposes parent and sibling role values', () => {
    expect(ParentRole).toEqual({ Mother: 'NMTH', Father: 'NFTH' });
    expect(SiblingRole).toEqual({ SameBirth: 'TWIN', DifferentBirth: 'NSIB' });
  });
});

describe('getGeneticsParents', () => {
  it('returns [] when the resource has no extensions at all', () => {
    expect(getGeneticsParents(fmh())).toEqual([]);
  });

  it('returns [] when no genetics-parent extension is present', () => {
    expect(
      getGeneticsParents(
        fmh([{ url: 'http://example.org/some-other', valueString: 'irrelevant' }]),
      ),
    ).toEqual([]);
  });

  it('reads a parent reference with no role when type is absent', () => {
    expect(
      getGeneticsParents(
        fmh([
          {
            url: GENETICS_PARENT_EXTENSION,
            extension: [
              { url: 'reference', valueReference: { reference: 'FamilyMemberHistory/mother-1' } },
            ],
          },
        ]),
      ),
    ).toEqual([{ reference: 'FamilyMemberHistory/mother-1' }]);
  });

  it('reads a parent reference with a known role', () => {
    expect(
      getGeneticsParents(
        fmh([
          {
            url: GENETICS_PARENT_EXTENSION,
            extension: [
              { url: 'reference', valueReference: { reference: 'FamilyMemberHistory/father-1' } },
              {
                url: 'type',
                valueCodeableConcept: {
                  coding: [{ system: V3_ROLE_SYSTEM, code: 'NFTH' }],
                },
              },
            ],
          },
        ]),
      ),
    ).toEqual([{ reference: 'FamilyMemberHistory/father-1', role: 'NFTH' }]);
  });

  it('drops role when the type code is unrecognised', () => {
    expect(
      getGeneticsParents(
        fmh([
          {
            url: GENETICS_PARENT_EXTENSION,
            extension: [
              { url: 'reference', valueReference: { reference: 'FamilyMemberHistory/x' } },
              {
                url: 'type',
                valueCodeableConcept: { coding: [{ system: V3_ROLE_SYSTEM, code: 'NOT-A-ROLE' }] },
              },
            ],
          },
        ]),
      ),
    ).toEqual([{ reference: 'FamilyMemberHistory/x' }]);
  });

  it('skips parent extensions that have no reference at all', () => {
    expect(
      getGeneticsParents(
        fmh([
          {
            url: GENETICS_PARENT_EXTENSION,
            extension: [
              {
                url: 'type',
                valueCodeableConcept: { coding: [{ system: V3_ROLE_SYSTEM, code: 'NMTH' }] },
              },
            ],
          },
        ]),
      ),
    ).toEqual([]);
  });

  it('skips parent extensions that have no nested extensions array at all', () => {
    // Malformed: complex extension with neither `reference` nor `type` sub-extensions.
    expect(getGeneticsParents(fmh([{ url: GENETICS_PARENT_EXTENSION }]))).toEqual([]);
  });

  it('returns multiple parents when both are declared', () => {
    expect(
      getGeneticsParents(
        fmh([
          {
            url: GENETICS_PARENT_EXTENSION,
            extension: [
              { url: 'reference', valueReference: { reference: 'FamilyMemberHistory/m' } },
              {
                url: 'type',
                valueCodeableConcept: { coding: [{ system: V3_ROLE_SYSTEM, code: 'NMTH' }] },
              },
            ],
          },
          {
            url: GENETICS_PARENT_EXTENSION,
            extension: [
              { url: 'reference', valueReference: { reference: 'FamilyMemberHistory/f' } },
              {
                url: 'type',
                valueCodeableConcept: { coding: [{ system: V3_ROLE_SYSTEM, code: 'NFTH' }] },
              },
            ],
          },
        ]),
      ),
    ).toEqual([
      { reference: 'FamilyMemberHistory/m', role: 'NMTH' },
      { reference: 'FamilyMemberHistory/f', role: 'NFTH' },
    ]);
  });
});

describe('getGeneticsSiblings', () => {
  it('returns [] when no sibling extensions are present', () => {
    expect(getGeneticsSiblings(fmh())).toEqual([]);
  });

  it('reads sibling with a known role', () => {
    expect(
      getGeneticsSiblings(
        fmh([
          {
            url: GENETICS_SIBLING_EXTENSION,
            extension: [
              { url: 'reference', valueReference: { reference: 'FamilyMemberHistory/twin' } },
              {
                url: 'type',
                valueCodeableConcept: { coding: [{ system: V3_ROLE_SYSTEM, code: 'TWIN' }] },
              },
            ],
          },
        ]),
      ),
    ).toEqual([{ reference: 'FamilyMemberHistory/twin', role: 'TWIN' }]);
  });

  it('drops sibling role when unrecognised', () => {
    expect(
      getGeneticsSiblings(
        fmh([
          {
            url: GENETICS_SIBLING_EXTENSION,
            extension: [
              { url: 'reference', valueReference: { reference: 'FamilyMemberHistory/sib' } },
              {
                url: 'type',
                valueCodeableConcept: { coding: [{ system: V3_ROLE_SYSTEM, code: 'WUT' }] },
              },
            ],
          },
        ]),
      ),
    ).toEqual([{ reference: 'FamilyMemberHistory/sib' }]);
  });

  it('skips sibling extensions missing a reference', () => {
    expect(getGeneticsSiblings(fmh([{ url: GENETICS_SIBLING_EXTENSION, extension: [] }]))).toEqual(
      [],
    );
  });

  it('reads a sibling with no role when type is absent', () => {
    expect(
      getGeneticsSiblings(
        fmh([
          {
            url: GENETICS_SIBLING_EXTENSION,
            extension: [
              { url: 'reference', valueReference: { reference: 'FamilyMemberHistory/sib-2' } },
            ],
          },
        ]),
      ),
    ).toEqual([{ reference: 'FamilyMemberHistory/sib-2' }]);
  });
});

describe('getGeneticsObservationRefs', () => {
  it('returns [] when no observation extensions are present', () => {
    expect(getGeneticsObservationRefs(fmh())).toEqual([]);
  });

  it('returns the inline references', () => {
    expect(
      getGeneticsObservationRefs(
        fmh([
          { url: GENETICS_OBSERVATION_EXTENSION, valueReference: { reference: 'Observation/1' } },
          { url: GENETICS_OBSERVATION_EXTENSION, valueReference: { reference: 'Observation/2' } },
        ]),
      ),
    ).toEqual([{ reference: 'Observation/1' }, { reference: 'Observation/2' }]);
  });

  it('skips observation extensions without a valueReference', () => {
    expect(
      getGeneticsObservationRefs(
        fmh([{ url: GENETICS_OBSERVATION_EXTENSION, valueString: 'oops' }]),
      ),
    ).toEqual([]);
  });
});

describe('setGeneticsExtensions', () => {
  it('preserves unrelated extensions and writes parent/sibling/observation', () => {
    const input = fmh([
      { url: 'http://example.org/keep-me', valueString: 'kept' },
      // Stale genetics extension — should be replaced.
      {
        url: GENETICS_PARENT_EXTENSION,
        extension: [{ url: 'reference', valueReference: { reference: 'FamilyMemberHistory/old' } }],
      },
    ]);

    const out = setGeneticsExtensions(input, {
      parents: [{ reference: 'FamilyMemberHistory/m', role: 'NMTH' }],
      siblings: [{ reference: 'FamilyMemberHistory/sib', role: 'TWIN' }],
      observations: [{ reference: 'Observation/o1' }],
    });

    expect(out).not.toBe(input); // immutability
    expect(input.extension?.[1]?.extension?.[0]?.valueReference?.reference).toBe(
      'FamilyMemberHistory/old',
    ); // input untouched

    expect(getGeneticsParents(out)).toEqual([{ reference: 'FamilyMemberHistory/m', role: 'NMTH' }]);
    expect(getGeneticsSiblings(out)).toEqual([
      { reference: 'FamilyMemberHistory/sib', role: 'TWIN' },
    ]);
    expect(getGeneticsObservationRefs(out)).toEqual([{ reference: 'Observation/o1' }]);

    // Unrelated extension preserved.
    const preserved = out.extension?.find((e) => e.url === 'http://example.org/keep-me');
    expect(preserved?.valueString).toBe('kept');
  });

  it('omits role when no role is supplied', () => {
    const out = setGeneticsExtensions(fmh(), {
      parents: [{ reference: 'FamilyMemberHistory/m' }],
      siblings: [{ reference: 'FamilyMemberHistory/sib' }],
    });
    const parentExt = out.extension?.find((e) => e.url === GENETICS_PARENT_EXTENSION);
    expect(parentExt?.extension).toEqual([
      { url: 'reference', valueReference: { reference: 'FamilyMemberHistory/m' } },
    ]);
    const sibExt = out.extension?.find((e) => e.url === GENETICS_SIBLING_EXTENSION);
    expect(sibExt?.extension).toEqual([
      { url: 'reference', valueReference: { reference: 'FamilyMemberHistory/sib' } },
    ]);
  });

  it('clears genetics extensions when called with empty lists', () => {
    const input = fmh([
      {
        url: GENETICS_PARENT_EXTENSION,
        extension: [{ url: 'reference', valueReference: { reference: 'FamilyMemberHistory/m' } }],
      },
    ]);
    const out = setGeneticsExtensions(input, {});
    expect(getGeneticsParents(out)).toEqual([]);
    expect(out.extension).toEqual([]);
  });

  it('round-trips: parse(set(x)) === x for parent role+ref', () => {
    const out = setGeneticsExtensions(fmh(), {
      parents: [
        { reference: 'FamilyMemberHistory/m', role: 'NMTH' },
        { reference: 'FamilyMemberHistory/f', role: 'NFTH' },
      ],
    });
    expect(getGeneticsParents(out)).toEqual([
      { reference: 'FamilyMemberHistory/m', role: 'NMTH' },
      { reference: 'FamilyMemberHistory/f', role: 'NFTH' },
    ]);
  });
});
