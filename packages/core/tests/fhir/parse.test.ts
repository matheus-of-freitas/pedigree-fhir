import { describe, expect, it } from 'vitest';
import { ParentRole, SiblingRole } from '../../src/fhir/extensions.js';
import { PedigreeParseError, parsePedigree } from '../../src/fhir/parse.js';
import type { R4FamilyMemberHistory, R4Patient } from '../../src/fhir/types.js';
import { Provenance } from '../../src/model/types.js';
import { AffectedStatus, Sex, TwinType, VitalStatus } from '../../src/psc/semantics.js';
import { fmh, patient } from '../fixtures/builders.js';

describe('parsePedigree — proband', () => {
  it('throws when the patient has no id', () => {
    expect(() => parsePedigree({ resourceType: 'Patient' } as R4Patient, [])).toThrow(
      PedigreeParseError,
    );
  });

  it('builds a graph with just the proband when there is no family history', () => {
    const g = parsePedigree(patient({ id: 'p', gender: 'female', name: 'Ada' }), []);
    expect(g.proband).toBe('p');
    expect(Object.keys(g.individuals)).toEqual(['p']);
    expect(Object.keys(g.couples)).toEqual([]);
    const proband = g.individuals.p;
    expect(proband?.semantics.sex).toBe(Sex.Female);
    expect(proband?.semantics.proband).toBe(true);
    expect(proband?.semantics.vital).toBe(VitalStatus.Living);
    expect(proband?.provenance).toBe(Provenance.Explicit);
    expect(proband?.sourceRef).toEqual({ resourceType: 'Patient', id: 'p' });
    expect(proband?.name).toBe('Ada');
  });

  it('maps each FHIR gender code', () => {
    expect(
      parsePedigree(patient({ id: 'p', gender: 'male' }), []).individuals.p?.semantics.sex,
    ).toBe(Sex.Male);
    expect(
      parsePedigree(patient({ id: 'p', gender: 'other' }), []).individuals.p?.semantics.sex,
    ).toBe(Sex.Other);
    expect(
      parsePedigree(patient({ id: 'p', gender: 'unknown' }), []).individuals.p?.semantics.sex,
    ).toBe(Sex.Unknown);
    expect(parsePedigree(patient({ id: 'p' }), []).individuals.p?.semantics.sex).toBe(Sex.Unknown);
  });

  it('marks the proband deceased when deceasedBoolean is true', () => {
    const g = parsePedigree(patient({ id: 'p', deceased: true }), []);
    expect(g.individuals.p?.semantics.vital).toBe(VitalStatus.Deceased);
  });

  it('marks the proband deceased when deceasedDateTime is set', () => {
    const p: R4Patient = { resourceType: 'Patient', id: 'p', deceasedDateTime: '2020-01-01' };
    const g = parsePedigree(p, []);
    expect(g.individuals.p?.semantics.vital).toBe(VitalStatus.Deceased);
  });

  it('falls back to given+family names when name.text is absent', () => {
    const p: R4Patient = {
      resourceType: 'Patient',
      id: 'p',
      name: [{ given: ['Ada', 'Lovelace'], family: 'Byron' }],
    };
    expect(parsePedigree(p, []).individuals.p?.name).toBe('Ada Lovelace Byron');
  });

  it('omits name when there is no usable HumanName entry', () => {
    const p: R4Patient = { resourceType: 'Patient', id: 'p', name: [{}] };
    expect(parsePedigree(p, []).individuals.p?.name).toBeUndefined();
  });
});

describe('parsePedigree — FMH individuals', () => {
  it('skips FMH resources missing an id', () => {
    const noId: R4FamilyMemberHistory = {
      resourceType: 'FamilyMemberHistory',
      status: 'completed',
      patient: { reference: 'Patient/p' },
      relationship: { coding: [{ code: 'MTH' }] },
    };
    const g = parsePedigree(patient({ id: 'p' }), [noId]);
    expect(Object.keys(g.individuals)).toEqual(['p']);
  });

  it('maps sex, deceased, conditions, and relationship code', () => {
    const m = fmh({
      id: 'mother',
      patientId: 'p',
      relationship: 'MTH',
      sex: 'female',
      deceased: true,
      conditions: [{ code: '254837009', display: 'Breast cancer' }, { code: 'no-display' }],
    });
    const g = parsePedigree(patient({ id: 'p' }), [m]);
    const mother = g.individuals.mother;
    expect(mother?.semantics.sex).toBe(Sex.Female);
    expect(mother?.semantics.vital).toBe(VitalStatus.Deceased);
    expect(mother?.relationshipToProband).toBe('MTH');
    expect(mother?.semantics.conditions).toEqual([
      { code: '254837009', display: 'Breast cancer', status: AffectedStatus.Affected },
      { code: 'no-display', status: AffectedStatus.Affected },
    ]);
    expect(mother?.provenance).toBe(Provenance.Explicit);
  });

  it('falls back to condition.code.text when no coding is supplied', () => {
    const c: R4FamilyMemberHistory = {
      resourceType: 'FamilyMemberHistory',
      id: 'm',
      status: 'completed',
      patient: { reference: 'Patient/p' },
      relationship: { coding: [{ code: 'MTH' }] },
      condition: [{ code: { text: 'Free-text condition' } }],
    };
    const g = parsePedigree(patient({ id: 'p' }), [c]);
    expect(g.individuals.m?.semantics.conditions).toEqual([
      {
        code: 'Free-text condition',
        display: 'Free-text condition',
        status: AffectedStatus.Affected,
      },
    ]);
  });

  it('skips conditions with neither coding nor text', () => {
    const c: R4FamilyMemberHistory = {
      resourceType: 'FamilyMemberHistory',
      id: 'm',
      status: 'completed',
      patient: { reference: 'Patient/p' },
      relationship: { coding: [{ code: 'MTH' }] },
      condition: [{ code: {} }],
    };
    const g = parsePedigree(patient({ id: 'p' }), [c]);
    expect(g.individuals.m?.semantics.conditions).toEqual([]);
  });

  it.each([
    ['deceasedAge', { deceasedAge: { value: 80, unit: 'a' } }],
    ['deceasedDate', { deceasedDate: '2020-01-01' }],
    ['deceasedRange', { deceasedRange: {} }],
    ['deceasedString', { deceasedString: 'in old age' }],
  ])('marks deceased via %s', (_name, override) => {
    const m: R4FamilyMemberHistory = {
      resourceType: 'FamilyMemberHistory',
      id: 'm',
      status: 'completed',
      patient: { reference: 'Patient/p' },
      relationship: { coding: [{ code: 'MTH' }] },
      ...override,
    };
    const g = parsePedigree(patient({ id: 'p' }), [m]);
    expect(g.individuals.m?.semantics.vital).toBe(VitalStatus.Deceased);
  });

  it('omits relationshipToProband when relationship has no code', () => {
    const m: R4FamilyMemberHistory = {
      resourceType: 'FamilyMemberHistory',
      id: 'm',
      status: 'completed',
      patient: { reference: 'Patient/p' },
      relationship: { coding: [] },
    };
    const g = parsePedigree(patient({ id: 'p' }), [m]);
    expect(g.individuals.m?.relationshipToProband).toBeUndefined();
  });
});

describe('parsePedigree — couples from genetics-parent extensions', () => {
  it('creates a couple when both parents are referenced', () => {
    const mother = fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' });
    const father = fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' });
    const proband = patient({ id: 'p' });
    // parent extensions are typically declared *on the child*; the proband is
    // the child here but Patient doesn't carry FMH-style extensions, so we
    // model this via a sibling FMH for symmetry. Simplest: have a sibling
    // declare both parents; a couple is created and used.
    const sibling = fmh({
      id: 's',
      patientId: 'p',
      relationship: 'NSIS',
      sex: 'female',
      parentRefs: [
        { reference: 'FamilyMemberHistory/m', role: ParentRole.Mother },
        { reference: 'FamilyMemberHistory/f', role: ParentRole.Father },
      ],
    });
    const g = parsePedigree(proband, [mother, father, sibling]);
    const coupleIds = Object.keys(g.couples);
    expect(coupleIds).toHaveLength(1);
    const couple = g.couples[coupleIds[0] as string];
    expect(couple?.partners.sort()).toEqual(['f', 'm']);
    expect(couple?.consanguineous).toBe(false);
    expect(couple?.provenance).toBe(Provenance.Explicit);
    expect(g.individuals.s?.childOf).toBe(coupleIds[0]);
  });

  it('reuses an existing couple for siblings sharing parents', () => {
    const mother = fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' });
    const father = fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' });
    const s1 = fmh({
      id: 's1',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [{ reference: 'FamilyMemberHistory/m' }, { reference: 'FamilyMemberHistory/f' }],
    });
    const s2 = fmh({
      id: 's2',
      patientId: 'p',
      relationship: 'NBRO',
      parentRefs: [{ reference: 'FamilyMemberHistory/m' }, { reference: 'FamilyMemberHistory/f' }],
    });
    const g = parsePedigree(patient({ id: 'p' }), [mother, father, s1, s2]);
    expect(Object.keys(g.couples)).toHaveLength(1);
    expect(g.individuals.s1?.childOf).toBe(g.individuals.s2?.childOf);
  });

  it('fabricates an inferred partner when only one parent is referenced', () => {
    const m = fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' });
    const s = fmh({
      id: 's',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [{ reference: 'FamilyMemberHistory/m', role: ParentRole.Mother }],
    });
    const g = parsePedigree(patient({ id: 'p' }), [m, s]);
    const partnerId = 'inferred:partner-of:m';
    expect(g.individuals[partnerId]?.provenance).toBe(Provenance.Inferred);
    expect(g.individuals[partnerId]?.semantics.sex).toBe(Sex.Male);
    const couple = Object.values(g.couples)[0];
    expect(couple?.partners.includes(partnerId)).toBe(true);
    expect(couple?.partners.includes('m')).toBe(true);
  });

  it('uses opposite-sex inference for a fabricated partner of a known father', () => {
    const f = fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' });
    const s = fmh({
      id: 's',
      patientId: 'p',
      relationship: 'NBRO',
      parentRefs: [{ reference: 'FamilyMemberHistory/f', role: ParentRole.Father }],
    });
    const g = parsePedigree(patient({ id: 'p' }), [f, s]);
    expect(g.individuals['inferred:partner-of:f']?.semantics.sex).toBe(Sex.Female);
  });

  it('fabricated partner is Unknown sex when role is not declared', () => {
    const x = fmh({ id: 'x', patientId: 'p', relationship: 'MTH' });
    const s = fmh({
      id: 's',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [{ reference: 'FamilyMemberHistory/x' }],
    });
    const g = parsePedigree(patient({ id: 'p' }), [x, s]);
    expect(g.individuals['inferred:partner-of:x']?.semantics.sex).toBe(Sex.Unknown);
  });

  it('reuses the same fabricated partner across multiple children of the same single parent', () => {
    const m = fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' });
    const s1 = fmh({
      id: 's1',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [{ reference: 'FamilyMemberHistory/m', role: ParentRole.Mother }],
    });
    const s2 = fmh({
      id: 's2',
      patientId: 'p',
      relationship: 'NBRO',
      parentRefs: [{ reference: 'FamilyMemberHistory/m', role: ParentRole.Mother }],
    });
    const g = parsePedigree(patient({ id: 'p' }), [m, s1, s2]);
    expect(g.individuals.s1?.childOf).toBe(g.individuals.s2?.childOf);
    expect(Object.keys(g.couples)).toHaveLength(1);
  });

  it('only honours the first two parent references when more are present', () => {
    const m = fmh({ id: 'm', patientId: 'p', relationship: 'MTH' });
    const f = fmh({ id: 'f', patientId: 'p', relationship: 'FTH' });
    const z = fmh({ id: 'z', patientId: 'p', relationship: 'MTH' });
    const s = fmh({
      id: 's',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [
        { reference: 'FamilyMemberHistory/m' },
        { reference: 'FamilyMemberHistory/f' },
        { reference: 'FamilyMemberHistory/z' },
      ],
    });
    const g = parsePedigree(patient({ id: 'p' }), [m, f, z, s]);
    expect(Object.keys(g.couples)).toHaveLength(1);
    expect(Object.values(g.couples)[0]?.partners.sort()).toEqual(['f', 'm']);
  });
});

describe('parsePedigree — twin grouping', () => {
  it('does not group plain (different-birth) siblings', () => {
    const a = fmh({
      id: 'a',
      patientId: 'p',
      relationship: 'NSIS',
      siblingRefs: [{ reference: 'FamilyMemberHistory/b', role: SiblingRole.DifferentBirth }],
    });
    const b = fmh({ id: 'b', patientId: 'p', relationship: 'NBRO' });
    const g = parsePedigree(patient({ id: 'p' }), [a, b]);
    expect(g.individuals.a?.twinGroupId).toBeUndefined();
    expect(g.individuals.b?.twinGroupId).toBeUndefined();
    expect(g.individuals.a?.semantics.twin).toBe(TwinType.None);
  });

  it('groups two declared twins under a single twinGroupId', () => {
    const a = fmh({
      id: 'a',
      patientId: 'p',
      relationship: 'TWINSIS',
      siblingRefs: [{ reference: 'FamilyMemberHistory/b', role: SiblingRole.SameBirth }],
    });
    const b = fmh({
      id: 'b',
      patientId: 'p',
      relationship: 'TWINBRO',
    });
    const g = parsePedigree(patient({ id: 'p' }), [a, b]);
    expect(g.individuals.a?.twinGroupId).toBeDefined();
    expect(g.individuals.a?.twinGroupId).toBe(g.individuals.b?.twinGroupId);
    expect(g.individuals.a?.semantics.twin).toBe(TwinType.UnknownZygosity);
    expect(g.individuals.b?.semantics.twin).toBe(TwinType.UnknownZygosity);
  });

  it('handles transitive triplets (A↔B and B↔C produce one group)', () => {
    const a = fmh({
      id: 'a',
      patientId: 'p',
      relationship: 'TWINSIS',
      siblingRefs: [{ reference: 'FamilyMemberHistory/b', role: SiblingRole.SameBirth }],
    });
    const b = fmh({
      id: 'b',
      patientId: 'p',
      relationship: 'TWINBRO',
      siblingRefs: [{ reference: 'FamilyMemberHistory/c', role: SiblingRole.SameBirth }],
    });
    const c = fmh({ id: 'c', patientId: 'p', relationship: 'TWINSIS' });
    const g = parsePedigree(patient({ id: 'p' }), [a, b, c]);
    const gid = g.individuals.a?.twinGroupId;
    expect(gid).toBeDefined();
    expect(g.individuals.b?.twinGroupId).toBe(gid);
    expect(g.individuals.c?.twinGroupId).toBe(gid);
  });

  it('ignores twin references pointing to a missing FMH', () => {
    const a = fmh({
      id: 'a',
      patientId: 'p',
      relationship: 'NSIS',
      siblingRefs: [{ reference: 'FamilyMemberHistory/missing', role: SiblingRole.SameBirth }],
    });
    const g = parsePedigree(patient({ id: 'p' }), [a]);
    expect(g.individuals.a?.twinGroupId).toBeUndefined();
    expect(g.individuals.a?.semantics.twin).toBe(TwinType.None);
  });

  it('skips genetics-sibling on FMHs without an id', () => {
    const noId: R4FamilyMemberHistory = {
      resourceType: 'FamilyMemberHistory',
      status: 'completed',
      patient: { reference: 'Patient/p' },
      relationship: { coding: [{ code: 'NSIS' }] },
    };
    const g = parsePedigree(patient({ id: 'p' }), [noId]);
    expect(Object.keys(g.individuals)).toEqual(['p']);
  });

  it('skips genetics-parent processing on FMHs without an id', () => {
    const noId: R4FamilyMemberHistory = {
      resourceType: 'FamilyMemberHistory',
      status: 'completed',
      patient: { reference: 'Patient/p' },
      relationship: { coding: [{ code: 'NSIS' }] },
      extension: [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/family-member-history-genetics-parent',
          extension: [{ url: 'reference', valueReference: { reference: 'FamilyMemberHistory/x' } }],
        },
      ],
    };
    const g = parsePedigree(patient({ id: 'p' }), [noId]);
    expect(Object.keys(g.couples)).toEqual([]);
  });
});

describe('parsePedigree — relative reference forms', () => {
  it('accepts a bare id (no resource type prefix) as a parent reference', () => {
    const m = fmh({ id: 'm', patientId: 'p', relationship: 'MTH' });
    const f = fmh({ id: 'f', patientId: 'p', relationship: 'FTH' });
    const s = fmh({
      id: 's',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [{ reference: 'm' }, { reference: 'f' }],
    });
    const g = parsePedigree(patient({ id: 'p' }), [m, f, s]);
    expect(Object.keys(g.couples)).toHaveLength(1);
    expect(g.individuals.s?.childOf).toBeDefined();
  });
});
