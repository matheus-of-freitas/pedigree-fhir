import { describe, expect, it } from 'vitest';
import { type PedigreeGraph, Provenance } from '../../src/model/types.js';
import { Sex, TwinType } from '../../src/psc/semantics.js';
import { brokenReferencesRule } from '../../src/validation/rules/broken-references.js';
import { completenessRule } from '../../src/validation/rules/completeness.js';
import { sexRelationshipConsistencyRule } from '../../src/validation/rules/consistency.js';
import { cyclesRule } from '../../src/validation/rules/cycles.js';
import { twinGroupsRule } from '../../src/validation/rules/twin-groups.js';
import { unknownCodesRule } from '../../src/validation/rules/unknown-codes.js';
import { Severity } from '../../src/validation/types.js';
import { couple, graph, individual } from './test-helpers.js';

function codes(g: PedigreeGraph, run = completenessRule.run): string[] {
  return run(g).map((d) => d.code);
}

describe('completenessRule', () => {
  it('passes a complete 3-generation graph with parental siblings represented', () => {
    const g = graph({
      proband: individual('p', { childOf: 'parents', sex: Sex.Female, proband: true }),
      relatives: [
        individual('mother', {
          childOf: 'maternal-grandparents',
          relationshipToProband: 'MTH',
          sex: Sex.Female,
        }),
        individual('father', {
          childOf: 'paternal-grandparents',
          relationshipToProband: 'FTH',
          sex: Sex.Male,
        }),
        individual('mgm', { sex: Sex.Female }),
        individual('mgf', { sex: Sex.Male }),
        individual('pgm', { sex: Sex.Female }),
        individual('pgf', { sex: Sex.Male }),
        individual('maunt', {
          childOf: 'maternal-grandparents',
          relationshipToProband: 'MAUNT',
          sex: Sex.Female,
        }),
        individual('puncle', {
          childOf: 'paternal-grandparents',
          relationshipToProband: 'PUNCLE',
          sex: Sex.Male,
        }),
      ],
      couples: [
        couple('parents', ['mother', 'father']),
        couple('maternal-grandparents', ['mgm', 'mgf']),
        couple('paternal-grandparents', ['pgm', 'pgf']),
      ],
    });

    expect(completenessRule.run(g)).toEqual([]);
  });

  it('returns no diagnostics when the configured proband id is absent', () => {
    expect(completenessRule.run({ proband: 'ghost', individuals: {}, couples: {} })).toEqual([]);
  });

  it('flags a proband with no parent couple', () => {
    const diagnostics = completenessRule.run(
      graph({ proband: individual('p', { proband: true }) }),
    );
    expect(diagnostics).toEqual([
      {
        code: 'completeness/proband-missing-parents',
        severity: Severity.Warning,
        message:
          'Proband has no parent couple. A complete 3-generation pedigree needs both parents.',
        individualIds: ['p'],
      },
    ]);
  });

  it('does not crash when a childOf reference points to a missing parent couple', () => {
    const g = graph({ proband: individual('p', { childOf: 'missing', proband: true }) });
    expect(completenessRule.run(g)).toEqual([]);
  });

  it('flags inferred parents and missing grandparents', () => {
    const g = graph({
      proband: individual('p', { childOf: 'parents', proband: true }),
      relatives: [
        individual('mother', { relationshipToProband: 'MTH', sex: Sex.Female }),
        individual('inferred:father-of:p', {
          sex: Sex.Male,
          provenance: Provenance.Inferred,
        }),
      ],
      couples: [couple('parents', ['mother', 'inferred:father-of:p'])],
    });

    expect(codes(g)).toEqual([
      'completeness/grandparents-missing',
      'completeness/parent-inferred',
      'completeness/grandparents-missing',
    ]);
  });

  it('surfaces inferred grandparents and absent parental siblings', () => {
    const g = graph({
      proband: individual('p', { childOf: 'parents', proband: true }),
      relatives: [
        individual('parent', {
          childOf: 'grandparents',
          relationshipToProband: 'PARENT',
          sex: Sex.Unknown,
        }),
        individual('other-parent', {
          childOf: 'other-grandparents',
          relationshipToProband: 'FTH',
          sex: Sex.Male,
        }),
        individual('inferred:gp', {
          provenance: Provenance.Inferred,
          sex: Sex.Female,
        }),
        individual('explicit:gp', { sex: Sex.Male }),
        individual('other-gm', { sex: Sex.Female }),
        individual('other-gf', { sex: Sex.Male }),
        individual('other-aunt', { childOf: 'other-grandparents', sex: Sex.Female }),
      ],
      couples: [
        couple('parents', ['parent', 'other-parent']),
        couple('grandparents', ['inferred:gp', 'explicit:gp']),
        couple('other-grandparents', ['other-gm', 'other-gf']),
      ],
    });

    expect(codes(g)).toEqual([
      'completeness/grandparent-inferred',
      'completeness/parent-siblings-missing',
    ]);
    expect(completenessRule.run(g)[1]?.coupleIds).toEqual(['grandparents']);
  });

  it('tolerates malformed couples that reference missing individuals', () => {
    const g = graph({
      proband: individual('p', { childOf: 'parents', proband: true }),
      relatives: [
        individual('mother', {
          childOf: 'missing-grandparent',
          relationshipToProband: 'MTH',
          sex: Sex.Female,
        }),
      ],
      couples: [couple('parents', ['mother', 'ghost-parent'])],
    });

    expect(codes(g)).toEqual([]);
  });

  it('tolerates malformed grandparent couples that reference missing individuals', () => {
    const g = graph({
      proband: individual('p', { childOf: 'parents', proband: true }),
      relatives: [
        individual('mother', {
          childOf: 'grandparents',
          relationshipToProband: 'MTH',
          sex: Sex.Female,
        }),
        individual('father', { relationshipToProband: 'FTH', sex: Sex.Male }),
        individual('known-grandparent', { sex: Sex.Male }),
        individual('aunt', { childOf: 'grandparents', sex: Sex.Female }),
      ],
      couples: [
        couple('parents', ['mother', 'father']),
        couple('grandparents', ['missing-grandparent', 'known-grandparent']),
      ],
    });

    expect(codes(g)).toEqual(['completeness/grandparents-missing']);
  });
});

describe('sexRelationshipConsistencyRule', () => {
  it('flags relationship codes whose implied sex conflicts with recorded sex', () => {
    const g = graph({
      proband: individual('p', { proband: true }),
      relatives: [
        individual('no-code'),
        individual('unknown-code', { relationshipToProband: 'BOGUS', sex: Sex.Male }),
        individual('neutral-code', { relationshipToProband: 'TWIN', sex: Sex.Other }),
        individual('unknown-sex-mother', {
          relationshipToProband: 'MTH',
          sex: Sex.Unknown,
        }),
        individual('bad-mother', { relationshipToProband: 'MTH', sex: Sex.Male }),
      ],
    });

    expect(sexRelationshipConsistencyRule.run(g)).toEqual([
      {
        code: 'consistency/sex-mismatch',
        severity: Severity.Error,
        message:
          'Individual bad-mother has relationship "MTH" (implies female) but recorded sex is male.',
        individualIds: ['bad-mother'],
      },
    ]);
  });
});

describe('cyclesRule', () => {
  it('passes acyclic graphs and missing parent-couple references', () => {
    const g = graph({
      proband: individual('p', { childOf: 'parents', proband: true }),
      relatives: [
        individual('mother', { sex: Sex.Female }),
        individual('father', { sex: Sex.Male }),
        individual('orphaned-parent', { childOf: 'missing', sex: Sex.Female }),
      ],
      couples: [couple('parents', ['mother', 'father'])],
    });

    expect(cyclesRule.run(g)).toEqual([]);
  });

  it('does not loop when two ancestor paths share the same upstream parent', () => {
    const g = graph({
      proband: individual('p', { childOf: 'parents', proband: true }),
      relatives: [
        individual('mother', { childOf: 'shared-ancestor', sex: Sex.Female }),
        individual('father', { childOf: 'shared-ancestor', sex: Sex.Male }),
        individual('shared-grandparent', { sex: Sex.Female }),
        individual('other-grandparent', { sex: Sex.Male }),
      ],
      couples: [
        couple('parents', ['mother', 'father']),
        couple('shared-ancestor', ['shared-grandparent', 'other-grandparent']),
      ],
    });

    expect(cyclesRule.run(g)).toEqual([]);
  });

  it('detects cycles reachable through either parent slot', () => {
    const g = graph({
      proband: individual('p', { childOf: 'parents', proband: true }),
      relatives: [
        individual('mother', { sex: Sex.Female }),
        individual('father', { childOf: 'father-parents', sex: Sex.Male }),
        individual('grandmother', { sex: Sex.Female }),
      ],
      couples: [
        couple('parents', ['mother', 'father']),
        couple('father-parents', ['grandmother', 'p']),
      ],
    });

    expect(cyclesRule.run(g).map((d) => d.individualIds[0])).toEqual(['p', 'father']);
  });
});

describe('unknownCodesRule', () => {
  it('warns only for relationship codes outside the known v3 FamilyMember table', () => {
    const g = graph({
      proband: individual('p', { proband: true }),
      relatives: [
        individual('no-code'),
        individual('known', { relationshipToProband: 'MTH' }),
        individual('unknown', { relationshipToProband: 'WHAT' }),
      ],
    });

    expect(unknownCodesRule.run(g)).toEqual([
      {
        code: 'unknown-codes/relationship',
        severity: Severity.Warning,
        message: 'Individual unknown has unknown relationship code "WHAT".',
        individualIds: ['unknown'],
      },
    ]);
  });
});

describe('brokenReferencesRule', () => {
  it('flags missing parent couples, missing partners, and duplicated couple partners', () => {
    const g = graph({
      proband: individual('p', { childOf: 'missing-couple', proband: true }),
      relatives: [individual('known-partner', { sex: Sex.Female })],
      couples: [
        couple('broken-couple', ['known-partner', 'ghost-partner']),
        couple('duplicated-partners', ['known-partner', 'known-partner']),
      ],
    });

    expect(brokenReferencesRule.run(g).map((d) => d.code)).toEqual([
      'structure/missing-parent-couple',
      'structure/missing-partner',
      'structure/duplicate-partner',
    ]);
  });

  it('passes structurally sound graphs', () => {
    const g = graph({
      proband: individual('p', { childOf: 'parents', proband: true }),
      relatives: [
        individual('mother', { sex: Sex.Female }),
        individual('father', { sex: Sex.Male }),
      ],
      couples: [couple('parents', ['mother', 'father'])],
    });

    expect(brokenReferencesRule.run(g)).toEqual([]);
  });
});

describe('twinGroupsRule', () => {
  it('passes consistent twin groups', () => {
    const twinA = {
      ...individual('t1', { childOf: 'parents', sex: Sex.Female }),
      twinGroupId: 'tg',
      semantics: {
        ...individual('t1', { childOf: 'parents', sex: Sex.Female }).semantics,
        twin: TwinType.Dizygotic,
      },
    };
    const twinB = {
      ...individual('t2', { childOf: 'parents', sex: Sex.Male }),
      twinGroupId: 'tg',
      semantics: {
        ...individual('t2', { childOf: 'parents', sex: Sex.Male }).semantics,
        twin: TwinType.Dizygotic,
      },
    };
    const g = graph({
      proband: individual('p', { childOf: 'parents', proband: true }),
      relatives: [
        twinA,
        twinB,
        individual('mother', { sex: Sex.Female }),
        individual('father', { sex: Sex.Male }),
      ],
      couples: [couple('parents', ['mother', 'father'])],
    });

    expect(twinGroupsRule.run(g)).toEqual([]);
  });

  it('flags singleton, parent-mismatched, missing-type, and mixed-type twin groups', () => {
    const singleton = {
      ...individual('singleton', { childOf: 'parents', sex: Sex.Female }),
      twinGroupId: 'single',
      semantics: {
        ...individual('singleton', { childOf: 'parents', sex: Sex.Female }).semantics,
        twin: TwinType.UnknownZygosity,
      },
    };
    const mixedA = {
      ...individual('mixed-a', { childOf: 'parents', sex: Sex.Female }),
      twinGroupId: 'mixed',
      semantics: {
        ...individual('mixed-a', { childOf: 'parents', sex: Sex.Female }).semantics,
        twin: TwinType.None,
      },
    };
    const mixedB = {
      ...individual('mixed-b', { childOf: 'other-parents', sex: Sex.Male }),
      twinGroupId: 'mixed',
      semantics: {
        ...individual('mixed-b', { childOf: 'other-parents', sex: Sex.Male }).semantics,
        twin: TwinType.Monozygotic,
      },
    };
    const mixedC = {
      ...individual('mixed-c', { childOf: 'parents', sex: Sex.Male }),
      twinGroupId: 'mixed',
      semantics: {
        ...individual('mixed-c', { childOf: 'parents', sex: Sex.Male }).semantics,
        twin: TwinType.Dizygotic,
      },
    };

    const g = graph({
      proband: individual('p', { childOf: 'parents', proband: true }),
      relatives: [
        singleton,
        mixedA,
        mixedB,
        mixedC,
        individual('mother', { sex: Sex.Female }),
        individual('father', { sex: Sex.Male }),
        individual('other-mother', { sex: Sex.Female }),
        individual('other-father', { sex: Sex.Male }),
      ],
      couples: [
        couple('parents', ['mother', 'father']),
        couple('other-parents', ['other-mother', 'other-father']),
      ],
    });

    expect(twinGroupsRule.run(g).map((d) => d.code)).toEqual([
      'structure/twin-group-singleton',
      'structure/twin-group-parent-mismatch',
      'structure/twin-group-missing-type',
      'structure/twin-group-type-mismatch',
    ]);
  });

  it('accepts twin groups whose parents are not yet assigned', () => {
    const g = graph({
      proband: individual('p', { proband: true }),
      relatives: [
        {
          ...individual('t1', { sex: Sex.Female }),
          twinGroupId: 'tg',
          semantics: {
            ...individual('t1', { sex: Sex.Female }).semantics,
            twin: TwinType.Monozygotic,
          },
        },
        {
          ...individual('t2', { sex: Sex.Male }),
          twinGroupId: 'tg',
          semantics: {
            ...individual('t2', { sex: Sex.Male }).semantics,
            twin: TwinType.Monozygotic,
          },
        },
      ],
    });

    expect(twinGroupsRule.run(g)).toEqual([]);
  });
});
