import { describe, expect, it } from 'vitest';
import { ParentRole } from '../../src/fhir/extensions.js';
import { parsePedigree } from '../../src/fhir/parse.js';
import { type PedigreeGraph, Provenance } from '../../src/model/types.js';
import { Sex } from '../../src/psc/semantics.js';
import { applyGraphEdit } from '../../src/state/graph-edits.js';
import { fmh, patient } from '../fixtures/builders.js';

function withParents(): PedigreeGraph {
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

function probandOnly(): PedigreeGraph {
  return parsePedigree(patient({ id: 'p', gender: 'female' }), []);
}

describe('addRelative — sibling', () => {
  it('adds a sibling sharing the existing parent couple', () => {
    const g = withParents();
    const out = applyGraphEdit(g, {
      type: 'addRelative',
      relativeOf: 's',
      kind: 'sibling',
      newId: 'new-sib',
      sex: Sex.Male,
    });
    expect(out.individuals['new-sib']?.childOf).toBe(g.individuals.s?.childOf);
    expect(out.individuals['new-sib']?.semantics.sex).toBe(Sex.Male);
  });

  it('fabricates a parent couple when target has no childOf', () => {
    const g = probandOnly();
    const out = applyGraphEdit(g, {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'sibling',
      newId: 'sib',
      sex: Sex.Female,
    });
    expect(out.individuals.p?.childOf).toBeDefined();
    expect(out.individuals.sib?.childOf).toBe(out.individuals.p?.childOf);
    expect(out.individuals['inferred:mother-of:p']?.provenance).toBe(Provenance.Inferred);
    expect(out.individuals['inferred:father-of:p']?.provenance).toBe(Provenance.Inferred);
  });
});

describe('addRelative — child', () => {
  it('creates a couple and a child for a target without one', () => {
    const out = applyGraphEdit(probandOnly(), {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'child',
      newId: 'kid',
      sex: Sex.Male,
    });
    expect(out.individuals.kid?.childOf).toBeDefined();
    const couple = out.couples[out.individuals.kid?.childOf as string];
    expect(couple?.partners).toContain('p');
    expect(couple?.partners).toContain('inferred:partner-of:p');
  });

  it('reuses an existing couple', () => {
    const g = probandOnly();
    const first = applyGraphEdit(g, {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'child',
      newId: 'kid1',
      sex: Sex.Male,
    });
    const second = applyGraphEdit(first, {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'child',
      newId: 'kid2',
      sex: Sex.Female,
    });
    expect(second.individuals.kid1?.childOf).toBe(second.individuals.kid2?.childOf);
    expect(Object.keys(second.couples)).toHaveLength(1);
  });
});

describe('addRelative — parent', () => {
  it('creates a parent couple when target has none', () => {
    const out = applyGraphEdit(probandOnly(), {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'parent',
      newId: 'mother',
      sex: Sex.Female,
    });
    expect(out.individuals.mother?.semantics.sex).toBe(Sex.Female);
    expect(out.individuals['inferred:partner-of:mother']?.semantics.sex).toBe(Sex.Male);
    expect(out.individuals.p?.childOf).toBeDefined();
  });

  it('is a no-op when target already has a parent couple', () => {
    // Sister `s` was wired to a parent couple via the FMH genetics-parent extension.
    const before = withParents();
    const after = applyGraphEdit(before, {
      type: 'addRelative',
      relativeOf: 's',
      kind: 'parent',
      newId: 'extra-mom',
      sex: Sex.Female,
    });
    expect(after).toBe(before);
  });
});

describe('addRelative — sex variations for fabricated partners', () => {
  it('fabricated partner of an added male parent is female', () => {
    const out = applyGraphEdit(probandOnly(), {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'parent',
      newId: 'father',
      sex: Sex.Male,
    });
    expect(out.individuals['inferred:partner-of:father']?.semantics.sex).toBe(Sex.Female);
  });

  it('fabricated partner has Unknown sex when added parent has Unknown sex', () => {
    const out = applyGraphEdit(probandOnly(), {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'parent',
      newId: 'parent',
      sex: Sex.Unknown,
    });
    expect(out.individuals['inferred:partner-of:parent']?.semantics.sex).toBe(Sex.Unknown);
  });

  it('fabricated partner of a male target via "child" kind is female', () => {
    const malePatient = parsePedigree(patient({ id: 'p', gender: 'male' }), []);
    const out = applyGraphEdit(malePatient, {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'child',
      newId: 'kid',
      sex: Sex.Female,
    });
    expect(out.individuals['inferred:partner-of:p']?.semantics.sex).toBe(Sex.Female);
  });

  it('a child added to an unknown-sex target gets an unknown-sex inferred partner', () => {
    const unknownPatient = parsePedigree(patient({ id: 'p' }), []);
    const out = applyGraphEdit(unknownPatient, {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'child',
      newId: 'kid',
      sex: Sex.Female,
    });
    expect(out.individuals['inferred:partner-of:p']?.semantics.sex).toBe(Sex.Unknown);
  });
});

describe('findCoupleOf via partner-position lookups', () => {
  it('looks up couple correctly regardless of partner order', () => {
    // Build a couple where the second partner happens to be the target we
    // later query against. The exercise hits the `b === id` branch in
    // findCoupleOf.
    const g1 = applyGraphEdit(probandOnly(), {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'partner',
      newId: 'spouse',
      sex: Sex.Male,
    });
    // Adding a child where the target is "spouse" must reuse the couple
    // even though "spouse" is the second partner in the stored array.
    const g2 = applyGraphEdit(g1, {
      type: 'addRelative',
      relativeOf: 'spouse',
      kind: 'child',
      newId: 'kid',
      sex: Sex.Male,
    });
    expect(Object.keys(g2.couples)).toHaveLength(1);
    expect(g2.individuals.kid?.childOf).toBe(
      g2.individuals.spouse?.childOf ?? Object.keys(g2.couples)[0],
    );
  });
});

describe('addRelative — partner', () => {
  it('creates a couple between target and the new individual', () => {
    const out = applyGraphEdit(probandOnly(), {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'partner',
      newId: 'spouse',
      sex: Sex.Male,
    });
    expect(Object.values(out.couples)).toHaveLength(1);
    const couple = Object.values(out.couples)[0];
    expect(couple?.partners).toContain('p');
    expect(couple?.partners).toContain('spouse');
    expect(couple?.provenance).toBe(Provenance.Explicit);
  });

  it('is a no-op when target already has a partner', () => {
    const g = applyGraphEdit(probandOnly(), {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'partner',
      newId: 'first',
      sex: Sex.Male,
    });
    const after = applyGraphEdit(g, {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'partner',
      newId: 'second',
      sex: Sex.Male,
    });
    expect(after).toBe(g);
  });
});

describe('addRelative — preconditions', () => {
  it('is a no-op when target id is unknown', () => {
    const before = probandOnly();
    const after = applyGraphEdit(before, {
      type: 'addRelative',
      relativeOf: 'ghost',
      kind: 'sibling',
      newId: 'x',
      sex: Sex.Male,
    });
    expect(after).toBe(before);
  });

  it('is a no-op when newId is already in use', () => {
    const before = withParents();
    const after = applyGraphEdit(before, {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'sibling',
      newId: 'm', // already in use
      sex: Sex.Male,
    });
    expect(after).toBe(before);
  });

  it('writes the optional name onto the new individual', () => {
    const out = applyGraphEdit(probandOnly(), {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'sibling',
      newId: 'sib',
      sex: Sex.Male,
      name: 'Older brother',
    });
    expect(out.individuals.sib?.name).toBe('Older brother');
  });
});

describe('removeIndividual', () => {
  it('removes a leaf individual and any couple they were in', () => {
    const out = applyGraphEdit(withParents(), { type: 'removeIndividual', id: 's' });
    expect(out.individuals.s).toBeUndefined();
    // 's' was a child, not a partner — couples unchanged.
    expect(Object.keys(out.couples)).toEqual(Object.keys(withParents().couples));
  });

  it('removing a partner drops their couple and detaches children', () => {
    const out = applyGraphEdit(withParents(), { type: 'removeIndividual', id: 'm' });
    expect(out.individuals.m).toBeUndefined();
    expect(Object.keys(out.couples)).toEqual([]);
    // Sister no longer has a couple to point at.
    expect(out.individuals.s?.childOf).toBeUndefined();
  });

  it('refuses to remove the proband', () => {
    const before = withParents();
    const after = applyGraphEdit(before, { type: 'removeIndividual', id: 'p' });
    expect(after).toBe(before);
  });

  it('is a no-op for unknown ids', () => {
    const before = withParents();
    const after = applyGraphEdit(before, { type: 'removeIndividual', id: 'ghost' });
    expect(after).toBe(before);
  });

  it('clears twinGroupId on surviving twins when one is removed', () => {
    const tw = parsePedigree(patient({ id: 'p' }), [
      fmh({ id: 'a', patientId: 'p', relationship: 'TWINSIS' }),
      fmh({ id: 'b', patientId: 'p', relationship: 'TWINBRO' }),
    ]);
    // Set twinGroupId manually on both a and b.
    tw.individuals.a = { ...tw.individuals.a!, twinGroupId: 'twin:test' };
    tw.individuals.b = { ...tw.individuals.b!, twinGroupId: 'twin:test' };
    const out = applyGraphEdit(tw, { type: 'removeIndividual', id: 'a' });
    expect(out.individuals.b?.twinGroupId).toBeUndefined();
  });
});
