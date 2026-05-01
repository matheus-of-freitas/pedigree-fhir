import { describe, expect, it } from 'vitest';
import {
  FamilySide,
  getRelationshipDisplay,
  getRelationshipMetadata,
  listRelationshipCodes,
  resolveIndividualDisplayLabel,
} from '../../src/fhir/relationship-codes.js';
import { Sex } from '../../src/psc/semantics.js';

describe('FamilySide', () => {
  it('exposes the four side values', () => {
    expect(FamilySide).toEqual({
      Maternal: 'maternal',
      Paternal: 'paternal',
      Self: 'self',
      Unknown: 'unknown',
    });
  });
});

describe('getRelationshipMetadata', () => {
  it('returns undefined for unknown codes', () => {
    expect(getRelationshipMetadata('NOT-A-CODE')).toBeUndefined();
  });

  it.each([
    ['MTH', -1, FamilySide.Maternal, Sex.Female],
    ['FTH', -1, FamilySide.Paternal, Sex.Male],
    ['NMTH', -1, FamilySide.Maternal, Sex.Female],
    ['NFTH', -1, FamilySide.Paternal, Sex.Male],
    ['MAUNT', -1, FamilySide.Maternal, Sex.Female],
    ['PAUNT', -1, FamilySide.Paternal, Sex.Female],
    ['MUNCLE', -1, FamilySide.Maternal, Sex.Male],
    ['PUNCLE', -1, FamilySide.Paternal, Sex.Male],
    ['MGRMTH', -2, FamilySide.Maternal, Sex.Female],
    ['MGRFTH', -2, FamilySide.Maternal, Sex.Male],
    ['PGRMTH', -2, FamilySide.Paternal, Sex.Female],
    ['PGRFTH', -2, FamilySide.Paternal, Sex.Male],
    ['NSIS', 0, FamilySide.Self, Sex.Female],
    ['NBRO', 0, FamilySide.Self, Sex.Male],
    ['SIS', 0, FamilySide.Self, Sex.Female],
    ['BRO', 0, FamilySide.Self, Sex.Male],
    ['TWINSIS', 0, FamilySide.Self, Sex.Female],
    ['TWINBRO', 0, FamilySide.Self, Sex.Male],
    ['MCOUSN', 0, FamilySide.Maternal, undefined],
    ['PCOUSN', 0, FamilySide.Paternal, undefined],
    ['COUSN', 0, FamilySide.Unknown, undefined],
    ['SON', 1, FamilySide.Self, Sex.Male],
    ['DAU', 1, FamilySide.Self, Sex.Female],
    ['NCHILD', 1, FamilySide.Self, undefined],
    ['CHILD', 1, FamilySide.Self, undefined],
    ['NEPHEW', 1, FamilySide.Unknown, Sex.Male],
    ['NIECE', 1, FamilySide.Unknown, Sex.Female],
  ])('%s → generation=%d, side=%s, sexHint=%s', (code, generation, side, sexHint) => {
    const meta = getRelationshipMetadata(code as string);
    expect(meta).toBeDefined();
    expect(meta?.generation).toBe(generation);
    expect(meta?.side).toBe(side);
    expect(meta?.sexHint).toBe(sexHint);
  });

  it('TWIN code is sex-neutral', () => {
    const meta = getRelationshipMetadata('TWIN');
    expect(meta?.generation).toBe(0);
    expect(meta?.side).toBe(FamilySide.Self);
    expect(meta?.sexHint).toBeUndefined();
  });
});

describe('listRelationshipCodes', () => {
  it('returns every code with the expected metadata fields', () => {
    const codes = listRelationshipCodes();
    expect(codes.length).toBeGreaterThan(0);
    for (const m of codes) {
      expect(m.code).toMatch(/^[A-Z]+$/);
      expect(typeof m.display).toBe('string');
      expect([-2, -1, 0, 1]).toContain(m.generation);
      expect(Object.values(FamilySide)).toContain(m.side);
    }
  });

  it('has unique codes (no accidental duplicates)', () => {
    const codes = listRelationshipCodes().map((m) => m.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('getRelationshipDisplay', () => {
  it('returns the readable display for known codes', () => {
    expect(getRelationshipDisplay('MTH')).toBe('mother');
    expect(getRelationshipDisplay('NSIS')).toBe('natural sister');
  });

  it('returns undefined for unknown or missing codes', () => {
    expect(getRelationshipDisplay('NOPE')).toBeUndefined();
    expect(getRelationshipDisplay(undefined)).toBeUndefined();
  });
});

describe('resolveIndividualDisplayLabel', () => {
  it('defaults to consumer name only', () => {
    expect(resolveIndividualDisplayLabel({ name: 'Ada Byron', relationshipToProband: 'MTH' })).toBe(
      'Ada Byron',
    );
    expect(resolveIndividualDisplayLabel({ relationshipToProband: 'MTH' })).toBeUndefined();
  });

  it('can prefer the relationship label while falling back to name', () => {
    expect(
      resolveIndividualDisplayLabel(
        { name: 'Ada Byron', relationshipToProband: 'MTH' },
        { preferRelationshipLabel: true },
      ),
    ).toBe('mother');
    expect(
      resolveIndividualDisplayLabel({ name: 'Ada Byron' }, { preferRelationshipLabel: true }),
    ).toBe('Ada Byron');
  });
});
