import { describe, expect, it } from 'vitest';
import { ParentRole } from '../../src/fhir/extensions.js';
import { parsePedigree } from '../../src/fhir/parse.js';
import type { R4FamilyMemberHistory } from '../../src/fhir/types.js';
import { makeCoupleId } from '../../src/model/ids.js';
import { inferRelationships } from '../../src/model/infer.js';
import { type PedigreeGraph, Provenance } from '../../src/model/types.js';
import { Sex, VitalStatus } from '../../src/psc/semantics.js';
import { fmh, patient } from '../fixtures/builders.js';

function buildGraph(...family: R4FamilyMemberHistory[]): PedigreeGraph {
  return parsePedigree(patient({ id: 'p', gender: 'female' }), family);
}

describe('inferRelationships — no evidence', () => {
  it('returns the proband-only graph unchanged when no relatives exist', () => {
    const g = buildGraph();
    const out = inferRelationships(g);
    expect(out.individuals).toEqual(g.individuals);
    expect(out.couples).toEqual({});
    expect(out.individuals.p?.childOf).toBeUndefined();
  });
});

describe('inferRelationships — proband parent couple', () => {
  it('fabricates both parents when only siblings exist', () => {
    const g = buildGraph(fmh({ id: 's', patientId: 'p', relationship: 'NSIS', sex: 'female' }));
    const out = inferRelationships(g);
    const motherId = 'inferred:mother-of:p';
    const fatherId = 'inferred:father-of:p';
    expect(out.individuals[motherId]?.semantics.sex).toBe(Sex.Female);
    expect(out.individuals[motherId]?.provenance).toBe(Provenance.Inferred);
    expect(out.individuals[fatherId]?.semantics.sex).toBe(Sex.Male);
    const expectedCouple = makeCoupleId(motherId, fatherId);
    expect(out.individuals.p?.childOf).toBe(expectedCouple);
    expect(out.individuals.s?.childOf).toBe(expectedCouple);
    expect(out.couples[expectedCouple]?.provenance).toBe(Provenance.Inferred);
    expect(out.couples[expectedCouple]?.consanguineous).toBe(false);
  });

  it('uses an existing mother and fabricates only the father', () => {
    const g = buildGraph(fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }));
    const out = inferRelationships(g);
    const expectedCouple = makeCoupleId('m', 'inferred:father-of:p');
    expect(out.individuals.p?.childOf).toBe(expectedCouple);
    expect(out.individuals.m?.childOf).toBeUndefined(); // no maternal-grandparent evidence
    expect(out.individuals['inferred:mother-of:p']).toBeUndefined();
    expect(out.individuals['inferred:father-of:p']).toBeDefined();
  });

  it('uses both existing parents when both are present', () => {
    const g = buildGraph(
      fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }),
      fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' }),
    );
    const out = inferRelationships(g);
    const expectedCouple = makeCoupleId('m', 'f');
    expect(out.individuals.p?.childOf).toBe(expectedCouple);
    expect(out.couples[expectedCouple]).toBeDefined();
    expect(out.individuals['inferred:mother-of:p']).toBeUndefined();
    expect(out.individuals['inferred:father-of:p']).toBeUndefined();
  });

  it('does not re-parent the proband when childOf was already set by parse', () => {
    // parse wires the proband only when an FMH on the *child* declares a
    // genetics-parent extension. Here we simulate that by having a sibling
    // declare both parents. Then the proband still has no childOf — but the
    // sibling does. After infer, both should share the same parent couple.
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
    const parsed = parsePedigree(patient({ id: 'p' }), [m, f, s]);
    const explicitCouple = parsed.individuals.s?.childOf;
    expect(explicitCouple).toBeDefined();

    const out = inferRelationships(parsed);
    expect(out.individuals.p?.childOf).toBe(explicitCouple);
    expect(out.individuals.s?.childOf).toBe(explicitCouple);
    // Couple from parse should be reused, not duplicated.
    expect(Object.keys(out.couples)).toHaveLength(1);
  });
});

describe('inferRelationships — siblings', () => {
  it('wires multiple sibling codes (NSIS/NBRO/SIS/BRO/TWIN…) to the parent couple', () => {
    const g = buildGraph(
      fmh({ id: 's1', patientId: 'p', relationship: 'NSIS' }),
      fmh({ id: 's2', patientId: 'p', relationship: 'NBRO' }),
      fmh({ id: 's3', patientId: 'p', relationship: 'TWINSIS' }),
      fmh({ id: 's4', patientId: 'p', relationship: 'TWINBRO' }),
      fmh({ id: 's5', patientId: 'p', relationship: 'TWIN' }),
      fmh({ id: 's6', patientId: 'p', relationship: 'SIS' }),
      fmh({ id: 's7', patientId: 'p', relationship: 'BRO' }),
    );
    const out = inferRelationships(g);
    const couple = out.individuals.p?.childOf;
    expect(couple).toBeDefined();
    for (const sid of ['s1', 's2', 's3', 's4', 's5', 's6', 's7']) {
      expect(out.individuals[sid]?.childOf).toBe(couple);
    }
  });

  it('does not re-parent siblings that already have childOf from parse', () => {
    const m = fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' });
    const f = fmh({ id: 'f', patientId: 'p', relationship: 'FTH', sex: 'male' });
    const s1 = fmh({
      id: 's1',
      patientId: 'p',
      relationship: 'NSIS',
      parentRefs: [{ reference: 'FamilyMemberHistory/m' }, { reference: 'FamilyMemberHistory/f' }],
    });
    const parsed = parsePedigree(patient({ id: 'p' }), [m, f, s1]);
    const out = inferRelationships(parsed);
    expect(out.individuals.s1?.childOf).toBe(parsed.individuals.s1?.childOf);
    expect(Object.keys(out.couples)).toHaveLength(1);
  });
});

describe('inferRelationships — maternal grandparents', () => {
  it('fabricates maternal grandparent couple from a single MGRMTH FMH', () => {
    const g = buildGraph(fmh({ id: 'mgm', patientId: 'p', relationship: 'MGRMTH', sex: 'female' }));
    const out = inferRelationships(g);
    const motherId = 'inferred:mother-of:p';
    const fatherId = 'inferred:father-of:p';
    const expectedMgpCouple = makeCoupleId('mgm', 'inferred:mgf-of:p');
    expect(out.individuals[motherId]?.childOf).toBe(expectedMgpCouple);
    expect(out.individuals[fatherId]?.childOf).toBeUndefined();
    expect(out.individuals['inferred:mgf-of:p']?.semantics.sex).toBe(Sex.Male);
    expect(out.individuals['inferred:mgf-of:p']?.provenance).toBe(Provenance.Inferred);
  });

  it('uses both MGRMTH and MGRFTH when present', () => {
    const g = buildGraph(
      fmh({ id: 'mgm', patientId: 'p', relationship: 'MGRMTH', sex: 'female' }),
      fmh({ id: 'mgf', patientId: 'p', relationship: 'MGRFTH', sex: 'male' }),
    );
    const out = inferRelationships(g);
    const expected = makeCoupleId('mgm', 'mgf');
    const motherId = 'inferred:mother-of:p';
    expect(out.individuals[motherId]?.childOf).toBe(expected);
    expect(out.couples[expected]).toBeDefined();
    expect(out.individuals['inferred:mgm-of:p']).toBeUndefined();
    expect(out.individuals['inferred:mgf-of:p']).toBeUndefined();
  });

  it('wires maternal aunts and uncles to the MGP couple', () => {
    const g = buildGraph(
      fmh({ id: 'maunt', patientId: 'p', relationship: 'MAUNT', sex: 'female' }),
      fmh({ id: 'muncle', patientId: 'p', relationship: 'MUNCLE', sex: 'male' }),
    );
    const out = inferRelationships(g);
    // No grandparents declared → both fabricated.
    const couple = makeCoupleId('inferred:mgm-of:p', 'inferred:mgf-of:p');
    expect(out.individuals.maunt?.childOf).toBe(couple);
    expect(out.individuals.muncle?.childOf).toBe(couple);
    // Maternal aunt/uncle alone is enough evidence to also fabricate the
    // mother and the proband's parent couple.
    expect(out.individuals['inferred:mother-of:p']?.childOf).toBe(couple);
  });
});

describe('inferRelationships — paternal grandparents', () => {
  it('infers paternal grandparents independently of maternal side', () => {
    const g = buildGraph(
      fmh({ id: 'pgf', patientId: 'p', relationship: 'PGRFTH', sex: 'male' }),
      fmh({ id: 'paunt', patientId: 'p', relationship: 'PAUNT', sex: 'female' }),
    );
    const out = inferRelationships(g);
    const couple = makeCoupleId('inferred:pgm-of:p', 'pgf');
    expect(out.individuals.paunt?.childOf).toBe(couple);
    expect(out.individuals['inferred:father-of:p']?.childOf).toBe(couple);
    // No maternal evidence: no maternal grandparents fabricated.
    expect(out.individuals['inferred:mgm-of:p']).toBeUndefined();
    expect(out.individuals['inferred:mgf-of:p']).toBeUndefined();
    // The maternal-side fabricated mother still has no childOf.
    expect(out.individuals['inferred:mother-of:p']?.childOf).toBeUndefined();
  });
});

describe('inferRelationships — idempotency', () => {
  it('does not re-parent a mother who already has childOf from parse', () => {
    // Mother explicitly declares her own parents via genetics-parent.
    const mgm = fmh({ id: 'mgm', patientId: 'p', relationship: 'MGRMTH', sex: 'female' });
    const mgf = fmh({ id: 'mgf', patientId: 'p', relationship: 'MGRFTH', sex: 'male' });
    const m = fmh({
      id: 'm',
      patientId: 'p',
      relationship: 'MTH',
      sex: 'female',
      parentRefs: [
        { reference: 'FamilyMemberHistory/mgm' },
        { reference: 'FamilyMemberHistory/mgf' },
      ],
    });
    const parsed = parsePedigree(patient({ id: 'p' }), [mgm, mgf, m]);
    const explicitMgpCouple = parsed.individuals.m?.childOf;
    expect(explicitMgpCouple).toBeDefined();

    const out = inferRelationships(parsed);
    expect(out.individuals.m?.childOf).toBe(explicitMgpCouple);
    // No duplicate maternal grandparent couple.
    const mgpCouples = Object.values(out.couples).filter(
      (c) => (c.partners as string[]).includes('mgm') && (c.partners as string[]).includes('mgf'),
    );
    expect(mgpCouples).toHaveLength(1);
  });

  it('running infer twice yields the same graph (fixed point)', () => {
    const g = buildGraph(
      fmh({ id: 's', patientId: 'p', relationship: 'NSIS' }),
      fmh({ id: 'mgm', patientId: 'p', relationship: 'MGRMTH', sex: 'female' }),
      fmh({ id: 'paunt', patientId: 'p', relationship: 'PAUNT', sex: 'female' }),
    );
    const once = inferRelationships(g);
    const twice = inferRelationships(once);
    expect(twice).toEqual(once);
  });
});

describe('inferRelationships — malformed input', () => {
  it('returns the graph unchanged when proband id does not resolve', () => {
    const malformed: PedigreeGraph = {
      proband: 'ghost',
      individuals: {},
      couples: {},
    };
    const out = inferRelationships(malformed);
    expect(out).toEqual(malformed);
  });
});

describe('inferRelationships — fabricated individuals are properly initialised', () => {
  it('inferred individuals default to Living and an empty conditions list', () => {
    const g = buildGraph(fmh({ id: 's', patientId: 'p', relationship: 'NSIS' }));
    const out = inferRelationships(g);
    const mother = out.individuals['inferred:mother-of:p'];
    expect(mother?.semantics.vital).toBe(VitalStatus.Living);
    expect(mother?.semantics.conditions).toEqual([]);
    expect(mother?.semantics.proband).toBe(false);
  });
});
