import { describe, expect, it } from 'vitest';
import {
  GENETICS_PARENT_EXTENSION,
  GENETICS_SIBLING_EXTENSION,
  ParentRole,
  SiblingRole,
  getGeneticsParents,
  getGeneticsSiblings,
} from '../../src/fhir/extensions.js';
import { parsePedigree } from '../../src/fhir/parse.js';
import { serializePedigree } from '../../src/fhir/serialize.js';
import type { R4FamilyMemberHistory } from '../../src/fhir/types.js';
import { inferRelationships } from '../../src/model/infer.js';
import { type PedigreeGraph, Provenance } from '../../src/model/types.js';
import { AffectedStatus, Sex, VitalStatus } from '../../src/psc/semantics.js';
import { fmh, patient } from '../fixtures/builders.js';

describe('serializePedigree — proband', () => {
  it('returns an empty result when the graph has no resolvable proband', () => {
    const malformed: PedigreeGraph = { proband: 'ghost', individuals: {}, couples: {} };
    const out = serializePedigree(malformed);
    expect(out.patient).toEqual({ resourceType: 'Patient' });
    expect(out.familyHistory).toEqual([]);
  });

  it('writes Patient with id, gender, deceased, and name', () => {
    const g = parsePedigree(
      patient({ id: 'p', gender: 'female', deceased: true, name: 'Ada Byron' }),
      [],
    );
    const out = serializePedigree(g);
    expect(out.patient).toEqual({
      resourceType: 'Patient',
      id: 'p',
      gender: 'female',
      deceasedBoolean: true,
      name: [{ text: 'Ada Byron' }],
    });
    expect(out.familyHistory).toEqual([]);
  });

  it('omits gender when the proband sex is Unknown', () => {
    const g = parsePedigree(patient({ id: 'p' }), []);
    const out = serializePedigree(g);
    expect(out.patient.gender).toBeUndefined();
  });

  it('writes gender=other for Sex.Other', () => {
    const g = parsePedigree(patient({ id: 'p', gender: 'other' }), []);
    expect(serializePedigree(g).patient.gender).toBe('other');
  });

  it('writes gender=male for Sex.Male', () => {
    const g = parsePedigree(patient({ id: 'p', gender: 'male' }), []);
    expect(serializePedigree(g).patient.gender).toBe('male');
  });
});

describe('serializePedigree — FMH list', () => {
  it('emits one FMH per Explicit family member, in graph order', () => {
    const g = parsePedigree(patient({ id: 'p' }), [
      fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }),
      fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' }),
    ]);
    const out = serializePedigree(g);
    expect(out.familyHistory.map((r) => r.id)).toEqual(['m', 'f']);
    expect(out.familyHistory[0]?.relationship?.coding?.[0]?.code).toBe('MTH');
    expect(out.familyHistory[1]?.relationship?.coding?.[0]?.code).toBe('FTH');
    expect(out.familyHistory[0]?.sex?.coding?.[0]?.code).toBe('female');
    expect(out.familyHistory[1]?.sex?.coding?.[0]?.code).toBe('male');
  });

  it('writes deceasedBoolean and conditions onto the FMH', () => {
    const g = parsePedigree(patient({ id: 'p' }), [
      fmh({
        id: 'm',
        patientId: 'p',
        relationship: 'MTH',
        sex: 'female',
        deceased: true,
        conditions: [{ code: '254837009', display: 'Breast cancer' }, { code: 'undisplayed' }],
      }),
    ]);
    const out = serializePedigree(g).familyHistory[0];
    expect(out?.deceasedBoolean).toBe(true);
    expect(out?.condition).toEqual([
      { code: { coding: [{ code: '254837009', display: 'Breast cancer' }] } },
      { code: { coding: [{ code: 'undisplayed' }] } },
    ]);
  });

  it('uses the FAMMEMB default code when relationshipToProband is unset', () => {
    const noRel: R4FamilyMemberHistory = {
      resourceType: 'FamilyMemberHistory',
      id: 'x',
      status: 'completed',
      patient: { reference: 'Patient/p' },
      relationship: { coding: [] },
    };
    const g = parsePedigree(patient({ id: 'p' }), [noRel]);
    const out = serializePedigree(g).familyHistory[0];
    expect(out?.relationship?.coding?.[0]?.code).toBe('FAMMEMB');
  });

  it('skips Inferred individuals (placeholders fabricated by infer)', () => {
    const g = parsePedigree(patient({ id: 'p' }), [
      fmh({ id: 's', patientId: 'p', relationship: 'NSIS' }),
    ]);
    const inferred = inferRelationships(g);
    expect(inferred.individuals['inferred:mother-of:p']).toBeDefined();
    const out = serializePedigree(inferred);
    expect(out.familyHistory.map((r) => r.id)).toEqual(['s']);
  });

  it('preserves the consumer-supplied display name', () => {
    const g = parsePedigree(patient({ id: 'p' }), []);
    g.individuals.p = { ...g.individuals.p!, name: 'Custom name' };
    const out = serializePedigree(g);
    expect(out.patient.name).toEqual([{ text: 'Custom name' }]);
  });

  it('writes the consumer-supplied name onto an FMH individual', () => {
    const g = parsePedigree(patient({ id: 'p' }), [
      fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }),
    ]);
    g.individuals.m = { ...g.individuals.m!, name: 'Mom Smith' };
    const out = serializePedigree(g);
    expect(out.familyHistory.find((r) => r.id === 'm')?.name).toBe('Mom Smith');
  });
});

describe('serializePedigree — genetics-parent extension', () => {
  it('emits both parents when both are Explicit, with role from sex', () => {
    const m = fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' });
    const f = fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' });
    const s = fmh({
      id: 's',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [
        { reference: 'FamilyMemberHistory/m', role: ParentRole.Mother },
        { reference: 'FamilyMemberHistory/f', role: ParentRole.Father },
      ],
    });
    const g = parsePedigree(patient({ id: 'p' }), [m, f, s]);
    const out = serializePedigree(g);
    const sib = out.familyHistory.find((r) => r.id === 's');
    expect(sib).toBeDefined();
    expect(getGeneticsParents(sib!)).toEqual([
      { reference: 'FamilyMemberHistory/m', role: 'NMTH' },
      { reference: 'FamilyMemberHistory/f', role: 'NFTH' },
    ]);
  });

  it('omits role on parent ref when the parent has Unknown sex', () => {
    const m = fmh({ id: 'm', patientId: 'p', relationship: 'MTH' }); // no sex
    const s = fmh({
      id: 's',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [{ reference: 'FamilyMemberHistory/m' }],
    });
    const g = parsePedigree(patient({ id: 'p' }), [m, s]);
    // After parse, partner-of:m is Inferred. Serialize should reference m only.
    const out = serializePedigree(g);
    const sib = out.familyHistory.find((r) => r.id === 's');
    expect(getGeneticsParents(sib!)).toEqual([{ reference: 'FamilyMemberHistory/m' }]);
  });

  it('drops Inferred parent refs from the extension', () => {
    const m = fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' });
    const s = fmh({
      id: 's',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [
        { reference: 'FamilyMemberHistory/m', role: ParentRole.Mother },
        // partner-of:m will be fabricated by parse → Inferred
      ],
    });
    const g = parsePedigree(patient({ id: 'p' }), [m, s]);
    const out = serializePedigree(g);
    const sib = out.familyHistory.find((r) => r.id === 's');
    expect(getGeneticsParents(sib!)).toEqual([
      { reference: 'FamilyMemberHistory/m', role: 'NMTH' },
    ]);
  });

  it('emits no parent extension when both partners are Inferred', () => {
    const g = parsePedigree(patient({ id: 'p' }), [
      fmh({ id: 's', patientId: 'p', relationship: 'NSIS' }),
    ]);
    const inferred = inferRelationships(g);
    const out = serializePedigree(inferred);
    const sib = out.familyHistory.find((r) => r.id === 's');
    expect(sib?.extension?.some((e) => e.url === GENETICS_PARENT_EXTENSION)).not.toBe(true);
  });

  it('writes role NFTH when partner sex is male', () => {
    const f = fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' });
    const s = fmh({
      id: 's',
      patientId: 'p',
      relationship: 'NBRO',
      parentRefs: [{ reference: 'FamilyMemberHistory/f', role: ParentRole.Father }],
    });
    const g = parsePedigree(patient({ id: 'p' }), [f, s]);
    const out = serializePedigree(g);
    const sib = out.familyHistory.find((r) => r.id === 's');
    expect(getGeneticsParents(sib!)).toEqual([
      { reference: 'FamilyMemberHistory/f', role: 'NFTH' },
    ]);
  });

  it('skips genetics-parent when childOf points to a missing couple (proband)', () => {
    const g = parsePedigree(patient({ id: 'p' }), []);
    g.individuals.p = { ...g.individuals.p!, childOf: 'couple:nonexistent' };
    const out = serializePedigree(g);
    expect(out.familyHistory).toEqual([]); // proband isn't FMH'd anyway
  });

  it('skips genetics-parent when an FMH individual points to a missing couple', () => {
    const g = parsePedigree(patient({ id: 'p' }), [
      fmh({ id: 's', patientId: 'p', relationship: 'NSIS' }),
    ]);
    g.individuals.s = { ...g.individuals.s!, childOf: 'couple:nonexistent' };
    const out = serializePedigree(g);
    const sib = out.familyHistory.find((r) => r.id === 's');
    expect(sib?.extension?.some((e) => e.url === GENETICS_PARENT_EXTENSION)).not.toBe(true);
  });

  it('skips genetics-parent when a partner id does not resolve to an individual', () => {
    const m = fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' });
    const s = fmh({
      id: 's',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [
        { reference: 'FamilyMemberHistory/m', role: ParentRole.Mother },
        { reference: 'FamilyMemberHistory/f', role: ParentRole.Father },
      ],
    });
    const g = parsePedigree(patient({ id: 'p' }), [m, s]);
    // Hand-corrupt: drop 'f' from individuals but leave the couple reference.
    delete g.individuals.f;
    const out = serializePedigree(g);
    const sib = out.familyHistory.find((r) => r.id === 's');
    expect(getGeneticsParents(sib!)).toEqual([
      { reference: 'FamilyMemberHistory/m', role: 'NMTH' },
    ]);
  });
});

describe('serializePedigree — genetics-sibling extension', () => {
  it('emits reciprocal twin extensions among Explicit twin members', () => {
    const a = fmh({
      id: 'a',
      patientId: 'p',
      relationship: 'TWINSIS',
      siblingRefs: [{ reference: 'FamilyMemberHistory/b', role: SiblingRole.SameBirth }],
    });
    const b = fmh({ id: 'b', patientId: 'p', relationship: 'TWINBRO' });
    const g = parsePedigree(patient({ id: 'p' }), [a, b]);
    const out = serializePedigree(g);
    expect(getGeneticsSiblings(out.familyHistory.find((r) => r.id === 'a')!)).toEqual([
      { reference: 'FamilyMemberHistory/b', role: 'TWIN' },
    ]);
    expect(getGeneticsSiblings(out.familyHistory.find((r) => r.id === 'b')!)).toEqual([
      { reference: 'FamilyMemberHistory/a', role: 'TWIN' },
    ]);
  });

  it('emits no sibling extension for non-twin siblings', () => {
    const g = parsePedigree(patient({ id: 'p' }), [
      fmh({ id: 's', patientId: 'p', relationship: 'NSIS' }),
    ]);
    const out = serializePedigree(g);
    const sib = out.familyHistory.find((r) => r.id === 's');
    expect(sib?.extension?.some((e) => e.url === GENETICS_SIBLING_EXTENSION)).not.toBe(true);
  });

  it('drops sibling refs to Inferred individuals from the twin group', () => {
    // Construct a graph where one twin is Explicit and one is Inferred,
    // sharing a twinGroupId. Then serialize should only emit the Explicit
    // member's ref from the other twin's extension list.
    const a = fmh({ id: 'a', patientId: 'p', relationship: 'TWINSIS' });
    const g = parsePedigree(patient({ id: 'p' }), [a]);
    g.individuals.a = { ...g.individuals.a!, twinGroupId: 'twin:test' };
    const fakeTwin = {
      id: 'inferred:twin',
      semantics: g.individuals.a!.semantics,
      provenance: Provenance.Inferred,
      twinGroupId: 'twin:test',
    };
    g.individuals['inferred:twin'] = fakeTwin;
    const out = serializePedigree(g);
    const aFmh = out.familyHistory.find((r) => r.id === 'a');
    expect(getGeneticsSiblings(aFmh!)).toEqual([]);
  });

  it('handles a twin group of one (no co-twins to reference)', () => {
    const g = parsePedigree(patient({ id: 'p' }), [
      fmh({ id: 'a', patientId: 'p', relationship: 'TWINSIS' }),
    ]);
    g.individuals.a = { ...g.individuals.a!, twinGroupId: 'twin:lonely' };
    const out = serializePedigree(g);
    const aFmh = out.familyHistory.find((r) => r.id === 'a');
    expect(getGeneticsSiblings(aFmh!)).toEqual([]);
  });
});

describe('serializePedigree — round-trip', () => {
  it('parse → serialize → parse preserves individuals and couples (3-gen example)', () => {
    const original = parsePedigree(patient({ id: 'p', gender: 'female', name: 'Ada' }), [
      fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }),
      fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' }),
      fmh({ id: 'mgm', patientId: 'p', relationship: 'MGRMTH', sex: 'female' }),
      fmh({ id: 'mgf', patientId: 'p', relationship: 'MGRFTH', sex: 'male' }),
      fmh({
        id: 's',
        patientId: 'p',
        relationship: 'NSIS',
        parentRefs: [
          { reference: 'FamilyMemberHistory/m', role: ParentRole.Mother },
          { reference: 'FamilyMemberHistory/f', role: ParentRole.Father },
        ],
      }),
      fmh({
        id: 'm-explicit-parents',
        patientId: 'p',
        relationship: 'MAUNT',
        sex: 'female',
        parentRefs: [
          { reference: 'FamilyMemberHistory/mgm', role: ParentRole.Mother },
          { reference: 'FamilyMemberHistory/mgf', role: ParentRole.Father },
        ],
      }),
    ]);
    const ser = serializePedigree(original);
    const reparsed = parsePedigree(ser.patient, ser.familyHistory);
    expect(Object.keys(reparsed.individuals).sort()).toEqual(
      Object.keys(original.individuals).sort(),
    );
    expect(Object.keys(reparsed.couples).sort()).toEqual(Object.keys(original.couples).sort());
    expect(reparsed.individuals.s?.childOf).toBe(original.individuals.s?.childOf);
  });

  it('round-trips condition coding (code + display)', () => {
    const original = parsePedigree(patient({ id: 'p' }), [
      fmh({
        id: 'm',
        patientId: 'p',
        relationship: 'MTH',
        sex: 'female',
        conditions: [{ code: 'C1', display: 'Cancer 1' }],
      }),
    ]);
    const ser = serializePedigree(original);
    const reparsed = parsePedigree(ser.patient, ser.familyHistory);
    expect(reparsed.individuals.m?.semantics.conditions).toEqual([
      { code: 'C1', display: 'Cancer 1', status: AffectedStatus.Affected },
    ]);
  });

  it('round-trips deceased + sex on the proband', () => {
    const original = parsePedigree(
      patient({ id: 'p', gender: 'male', deceased: true, name: 'X' }),
      [],
    );
    const ser = serializePedigree(original);
    const reparsed = parsePedigree(ser.patient, ser.familyHistory);
    expect(reparsed.individuals.p?.semantics.sex).toBe(Sex.Male);
    expect(reparsed.individuals.p?.semantics.vital).toBe(VitalStatus.Deceased);
    expect(reparsed.individuals.p?.name).toBe('X');
  });
});
