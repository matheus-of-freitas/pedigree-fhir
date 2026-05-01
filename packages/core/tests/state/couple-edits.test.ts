import { describe, expect, it } from 'vitest';
import { ParentRole } from '../../src/fhir/extensions.js';
import { parsePedigree } from '../../src/fhir/parse.js';
import type { PedigreeGraph } from '../../src/model/types.js';
import { TwinType } from '../../src/psc/semantics.js';
import { applyCoupleEdit } from '../../src/state/couple-edits.js';
import { fmh, patient } from '../fixtures/builders.js';

function withSiblings(): PedigreeGraph {
  return parsePedigree(patient({ id: 'p', gender: 'female' }), [
    fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }),
    fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' }),
    fmh({
      id: 'a',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [
        { reference: 'FamilyMemberHistory/m', role: ParentRole.Mother },
        { reference: 'FamilyMemberHistory/f', role: ParentRole.Father },
      ],
    }),
    fmh({
      id: 'b',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [
        { reference: 'FamilyMemberHistory/m', role: ParentRole.Mother },
        { reference: 'FamilyMemberHistory/f', role: ParentRole.Father },
      ],
    }),
  ]);
}

describe('setConsanguineous', () => {
  it('flips the consanguineous flag', () => {
    const g = withSiblings();
    const coupleId = Object.keys(g.couples)[0] as string;
    const out = applyCoupleEdit(g, { type: 'setConsanguineous', coupleId, consanguineous: true });
    expect(out.couples[coupleId]?.consanguineous).toBe(true);
  });

  it('is identity when value already matches', () => {
    const g = withSiblings();
    const coupleId = Object.keys(g.couples)[0] as string;
    const out = applyCoupleEdit(g, { type: 'setConsanguineous', coupleId, consanguineous: false });
    expect(out).toBe(g);
  });

  it('is a no-op for unknown couples', () => {
    const g = withSiblings();
    const out = applyCoupleEdit(g, {
      type: 'setConsanguineous',
      coupleId: 'couple:does-not-exist',
      consanguineous: true,
    });
    expect(out).toBe(g);
  });
});

describe('setTwin', () => {
  it('groups two siblings as monozygotic twins', () => {
    const g = withSiblings();
    const out = applyCoupleEdit(g, {
      type: 'setTwin',
      ids: ['a', 'b'],
      type_: TwinType.Monozygotic,
      groupId: 'twin:1',
    });
    expect(out.individuals.a?.twinGroupId).toBe('twin:1');
    expect(out.individuals.b?.twinGroupId).toBe('twin:1');
    expect(out.individuals.a?.semantics.twin).toBe(TwinType.Monozygotic);
  });

  it('clearing with TwinType.None removes the group from all members', () => {
    const g1 = applyCoupleEdit(withSiblings(), {
      type: 'setTwin',
      ids: ['a', 'b'],
      type_: TwinType.Dizygotic,
      groupId: 'twin:dz',
    });
    const out = applyCoupleEdit(g1, {
      type: 'setTwin',
      ids: ['a', 'b'],
      type_: TwinType.None,
      groupId: 'ignored',
    });
    expect(out.individuals.a?.twinGroupId).toBeUndefined();
    expect(out.individuals.b?.twinGroupId).toBeUndefined();
    expect(out.individuals.a?.semantics.twin).toBe(TwinType.None);
  });

  it('clearing via a single member also clears the rest of the group', () => {
    const g1 = applyCoupleEdit(withSiblings(), {
      type: 'setTwin',
      ids: ['a', 'b'],
      type_: TwinType.Monozygotic,
      groupId: 'twin:k',
    });
    const out = applyCoupleEdit(g1, {
      type: 'setTwin',
      ids: ['a'],
      type_: TwinType.None,
      groupId: 'ignored',
    });
    expect(out.individuals.a?.twinGroupId).toBeUndefined();
    expect(out.individuals.b?.twinGroupId).toBeUndefined();
  });

  it('is a no-op when ids is empty', () => {
    const g = withSiblings();
    const out = applyCoupleEdit(g, {
      type: 'setTwin',
      ids: [],
      type_: TwinType.Monozygotic,
      groupId: 'x',
    });
    expect(out).toBe(g);
  });

  it('is a no-op when an id does not exist', () => {
    const g = withSiblings();
    const out = applyCoupleEdit(g, {
      type: 'setTwin',
      ids: ['a', 'ghost'],
      type_: TwinType.Monozygotic,
      groupId: 'x',
    });
    expect(out).toBe(g);
  });

  it('is a no-op when target individuals do not share a parent couple', () => {
    const g = withSiblings();
    // Try to twin proband (no childOf) with sister `a`
    const out = applyCoupleEdit(g, {
      type: 'setTwin',
      ids: ['p', 'a'],
      type_: TwinType.Monozygotic,
      groupId: 'x',
    });
    expect(out).toBe(g);
  });

  it('is a no-op when none of the targets has a parent couple', () => {
    const g = parsePedigree(patient({ id: 'p' }), []);
    const out = applyCoupleEdit(g, {
      type: 'setTwin',
      ids: ['p'],
      type_: TwinType.Monozygotic,
      groupId: 'x',
    });
    expect(out).toBe(g);
  });

  it('is a no-op when targets have different parent couples', () => {
    // Build a graph with two distinct sibships: a/b share couple1; c/d share couple2.
    const g = parsePedigree(patient({ id: 'p' }), [
      fmh({ id: 'm1', patientId: 'p', relationship: 'MTH', sex: 'female' }),
      fmh({ id: 'f1', patientId: 'p', relationship: 'FTH', sex: 'male' }),
      fmh({
        id: 'a',
        patientId: 'p',
        relationship: 'NSIS',
        parentRefs: [
          { reference: 'FamilyMemberHistory/m1', role: ParentRole.Mother },
          { reference: 'FamilyMemberHistory/f1', role: ParentRole.Father },
        ],
      }),
      fmh({ id: 'm2', patientId: 'p', relationship: 'MTH', sex: 'female' }),
      fmh({ id: 'f2', patientId: 'p', relationship: 'FTH', sex: 'male' }),
      fmh({
        id: 'c',
        patientId: 'p',
        relationship: 'NSIS',
        parentRefs: [
          { reference: 'FamilyMemberHistory/m2', role: ParentRole.Mother },
          { reference: 'FamilyMemberHistory/f2', role: ParentRole.Father },
        ],
      }),
    ]);
    expect(g.individuals.a?.childOf).not.toBe(g.individuals.c?.childOf);
    const out = applyCoupleEdit(g, {
      type: 'setTwin',
      ids: ['a', 'c'],
      type_: TwinType.Monozygotic,
      groupId: 'x',
    });
    expect(out).toBe(g);
  });
});
