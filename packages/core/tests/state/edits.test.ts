import { describe, expect, it } from 'vitest';
import { ParentRole } from '../../src/fhir/extensions.js';
import { parsePedigree } from '../../src/fhir/parse.js';
import type { PedigreeGraph } from '../../src/model/types.js';
import {
  Adopted,
  AffectedStatus,
  CarrierStatus,
  Sex,
  VitalStatus,
} from '../../src/psc/semantics.js';
import { applyIndividualEdit } from '../../src/state/edits.js';
import { fmh, patient } from '../fixtures/builders.js';

function build(): PedigreeGraph {
  return parsePedigree(patient({ id: 'p', gender: 'female' }), [
    fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }),
    fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' }),
    fmh({
      id: 's',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [
        { reference: 'FamilyMemberHistory/m', role: ParentRole.Mother },
        { reference: 'FamilyMemberHistory/f', role: ParentRole.Father },
      ],
    }),
  ]);
}

describe('setSex', () => {
  it('updates sex on the targeted individual', () => {
    const out = applyIndividualEdit(build(), { type: 'setSex', id: 's', sex: Sex.Male });
    expect(out.individuals.s?.semantics.sex).toBe(Sex.Male);
  });

  it('is a no-op for unknown ids', () => {
    const before = build();
    const out = applyIndividualEdit(before, { type: 'setSex', id: 'ghost', sex: Sex.Male });
    expect(out).toBe(before);
  });
});

describe('setVital', () => {
  it('marks an individual deceased', () => {
    const out = applyIndividualEdit(build(), {
      type: 'setVital',
      id: 'm',
      vital: VitalStatus.Deceased,
    });
    expect(out.individuals.m?.semantics.vital).toBe(VitalStatus.Deceased);
  });
});

describe('upsertCondition', () => {
  it('appends a new condition record', () => {
    const out = applyIndividualEdit(build(), {
      type: 'upsertCondition',
      id: 'p',
      condition: {
        code: 'C1',
        display: 'Some cancer',
        status: AffectedStatus.Affected,
        onsetAge: { kind: 'quantity', quantity: { value: 45, unit: 'a', code: 'a' } },
      },
    });
    expect(out.individuals.p?.semantics.conditions).toEqual([
      {
        code: 'C1',
        display: 'Some cancer',
        status: AffectedStatus.Affected,
        onsetAge: { kind: 'quantity', quantity: { value: 45, unit: 'a', code: 'a' } },
      },
    ]);
  });

  it('replaces an existing condition with the same code, leaves others intact', () => {
    const g = build();
    let cur = g;
    cur = applyIndividualEdit(cur, {
      type: 'upsertCondition',
      id: 'p',
      condition: { code: 'C1', status: AffectedStatus.Unknown },
    });
    cur = applyIndividualEdit(cur, {
      type: 'upsertCondition',
      id: 'p',
      condition: { code: 'C2', status: AffectedStatus.Affected },
    });
    cur = applyIndividualEdit(cur, {
      type: 'upsertCondition',
      id: 'p',
      condition: { code: 'C1', status: AffectedStatus.Affected },
    });
    expect(cur.individuals.p?.semantics.conditions).toEqual([
      { code: 'C1', status: AffectedStatus.Affected },
      { code: 'C2', status: AffectedStatus.Affected },
    ]);
  });
});

describe('removeCondition', () => {
  it('drops the matching condition', () => {
    const g = applyIndividualEdit(build(), {
      type: 'upsertCondition',
      id: 'p',
      condition: { code: 'C1', status: AffectedStatus.Affected },
    });
    const out = applyIndividualEdit(g, { type: 'removeCondition', id: 'p', code: 'C1' });
    expect(out.individuals.p?.semantics.conditions).toEqual([]);
  });

  it('is a no-op when no condition with that code exists', () => {
    const g = build();
    const out = applyIndividualEdit(g, { type: 'removeCondition', id: 'p', code: 'C1' });
    expect(out.individuals.p?.semantics.conditions).toEqual([]);
  });
});

describe('setCarrier and setAdopted', () => {
  it('setCarrier writes the carrier status', () => {
    const out = applyIndividualEdit(build(), {
      type: 'setCarrier',
      id: 's',
      carrier: CarrierStatus.Carrier,
    });
    expect(out.individuals.s?.semantics.carrier).toBe(CarrierStatus.Carrier);
  });

  it('setAdopted writes the adopted state', () => {
    const out = applyIndividualEdit(build(), {
      type: 'setAdopted',
      id: 'p',
      adopted: Adopted.AdoptedIn,
    });
    expect(out.individuals.p?.semantics.adopted).toBe(Adopted.AdoptedIn);
  });
});

describe('setProband', () => {
  it('moves the proband flag and updates graph.proband', () => {
    const out = applyIndividualEdit(build(), { type: 'setProband', id: 's' });
    expect(out.proband).toBe('s');
    expect(out.individuals.s?.semantics.proband).toBe(true);
    expect(out.individuals.p?.semantics.proband).toBe(false);
  });

  it('preserves identity for individuals whose flag did not change', () => {
    const before = build();
    const out = applyIndividualEdit(before, { type: 'setProband', id: 's' });
    // Mother's record didn't need to flip her proband flag (was false, still false).
    expect(out.individuals.m).toBe(before.individuals.m);
  });

  it('is a no-op when targeting an unknown id', () => {
    const before = build();
    const out = applyIndividualEdit(before, { type: 'setProband', id: 'ghost' });
    expect(out).toBe(before);
  });
});
