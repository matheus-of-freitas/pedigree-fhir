import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ONCOLOGY_PALETTE,
  getAgeObservationDisplay,
  getConditionOnsetDisplay,
  getIndividualAgeDisplay,
  getOncologyMarkers,
  matchOncologyPaletteEntry,
} from '../../src/index.js';
import { AffectedStatus, VitalStatus } from '../../src/psc/semantics.js';

describe('getAgeObservationDisplay', () => {
  it('returns undefined when no age observation exists', () => {
    expect(getAgeObservationDisplay(undefined)).toBeUndefined();
  });

  it('formats year quantities without the unit suffix', () => {
    expect(
      getAgeObservationDisplay({ kind: 'quantity', quantity: { value: 45, unit: 'a', code: 'a' } }),
    ).toBe('45');
  });

  it.each([
    [{ value: 45 }, '45'],
    [{ value: 45, unit: 'a' }, '45'],
    [{ value: 45, unit: 'yr' }, '45'],
    [{ value: 45, unit: 'yrs' }, '45'],
    [{ value: 45, unit: 'year' }, '45'],
    [{ value: 45, unit: 'years' }, '45'],
  ])('treats year-like units consistently: %j', (quantity, expected) => {
    expect(getAgeObservationDisplay({ kind: 'quantity', quantity })).toBe(expected);
  });

  it('formats decimal and code-only non-year quantities', () => {
    expect(
      getAgeObservationDisplay({
        kind: 'quantity',
        quantity: { value: 1.5, unit: 'months', code: 'mo' },
      }),
    ).toBe('1.5 months');
    expect(
      getAgeObservationDisplay({
        kind: 'quantity',
        quantity: { value: 6, code: 'mo' },
      }),
    ).toBe('6 mo');
  });

  it('formats non-year quantities with a unit suffix', () => {
    expect(
      getAgeObservationDisplay({
        kind: 'quantity',
        quantity: { value: 6, unit: 'months', code: 'mo' },
      }),
    ).toBe('6 months');
  });

  it('formats ranges compactly', () => {
    expect(
      getAgeObservationDisplay({
        kind: 'range',
        range: {
          low: { value: 45, unit: 'a', code: 'a' },
          high: { value: 50, unit: 'a', code: 'a' },
        },
      }),
    ).toBe('45-50');
  });

  it('formats a single-ended range and text ages', () => {
    expect(
      getAgeObservationDisplay({
        kind: 'range',
        range: { low: { value: 45, unit: 'a', code: 'a' } },
      }),
    ).toBe('45');
    expect(
      getAgeObservationDisplay({
        kind: 'range',
        range: { high: { value: 81, unit: 'a', code: 'a' } },
      }),
    ).toBe('81');
    expect(getAgeObservationDisplay({ kind: 'text', text: 'adulthood' })).toBe('adulthood');
  });
});

describe('getIndividualAgeDisplay', () => {
  it('prefers explicit age metadata for living individuals', () => {
    expect(
      getIndividualAgeDisplay({
        birthDate: '1977-05-04',
        age: { kind: 'quantity', quantity: { value: 47, unit: 'a', code: 'a' } },
        semantics: { vital: VitalStatus.Living },
      }),
    ).toBe('47');
  });

  it('formats deceasedAge for deceased individuals', () => {
    expect(
      getIndividualAgeDisplay({
        deceasedAge: { kind: 'quantity', quantity: { value: 79, unit: 'a', code: 'a' } },
        semantics: { vital: VitalStatus.Deceased },
      }),
    ).toBe('79');
  });

  it('derives age from birthDate when needed', () => {
    expect(
      getIndividualAgeDisplay(
        {
          birthDate: '1977-05-04',
          semantics: { vital: VitalStatus.Living },
        },
        { asOfDate: '2024-06-01' },
      ),
    ).toBe('47');
  });

  it('subtracts one year when the birthday has not occurred yet', () => {
    expect(
      getIndividualAgeDisplay(
        {
          birthDate: '1977-12-20',
          semantics: { vital: VitalStatus.Living },
        },
        { asOfDate: new Date('2024-06-01T00:00:00Z') },
      ),
    ).toBe('46');
  });

  it('subtracts one year when the birthday month matches but the day has not arrived', () => {
    expect(
      getIndividualAgeDisplay(
        {
          birthDate: '1977-06-20',
          semantics: { vital: VitalStatus.Living },
        },
        { asOfDate: new Date('2024-06-01T00:00:00Z') },
      ),
    ).toBe('46');
  });

  it('returns undefined when no age information is available', () => {
    expect(getIndividualAgeDisplay({ semantics: { vital: VitalStatus.Living } })).toBeUndefined();
  });

  it('uses the default current date path when no asOfDate is supplied', () => {
    expect(
      getIndividualAgeDisplay({
        birthDate: '2000-01-01',
        semantics: { vital: VitalStatus.Living },
      }),
    ).toMatch(/^\d+$/);
  });

  it('handles partial and invalid birth dates safely', () => {
    expect(
      getIndividualAgeDisplay(
        {
          birthDate: '1977',
          semantics: { vital: VitalStatus.Living },
        },
        { asOfDate: '2024-06-01' },
      ),
    ).toBe('47');
    expect(
      getIndividualAgeDisplay(
        {
          birthDate: 'invalid',
          semantics: { vital: VitalStatus.Living },
        },
        { asOfDate: '2024-06-01' },
      ),
    ).toBeUndefined();
    expect(
      getIndividualAgeDisplay(
        {
          birthDate: '3000-01-01',
          semantics: { vital: VitalStatus.Living },
        },
        { asOfDate: '2024-06-01' },
      ),
    ).toBeUndefined();
  });
});

describe('oncology palette matching', () => {
  it('matches palette entries by code', () => {
    expect(
      matchOncologyPaletteEntry(
        { code: '254837009', display: 'Breast cancer', status: AffectedStatus.Affected },
        DEFAULT_ONCOLOGY_PALETTE[0],
      ),
    ).toBe(true);
  });

  it('does not match unaffected conditions', () => {
    expect(
      matchOncologyPaletteEntry(
        { code: '254837009', display: 'Breast cancer', status: AffectedStatus.Unaffected },
        DEFAULT_ONCOLOGY_PALETTE[0],
      ),
    ).toBe(false);
  });

  it('matches palette entries by display fallback and returns false when nothing matches', () => {
    expect(
      matchOncologyPaletteEntry(
        { code: 'custom', display: 'Met. Prostate recurrence', status: AffectedStatus.Affected },
        DEFAULT_ONCOLOGY_PALETTE[3],
      ),
    ).toBe(true);
    expect(
      matchOncologyPaletteEntry(
        { code: 'custom', display: 'Glioblastoma', status: AffectedStatus.Affected },
        DEFAULT_ONCOLOGY_PALETTE[0],
      ),
    ).toBe(false);
  });

  it('matches palette entries when the configured display appears as a suffix', () => {
    expect(
      matchOncologyPaletteEntry(
        { code: 'custom', display: 'Recurrent Melanoma', status: AffectedStatus.Affected },
        DEFAULT_ONCOLOGY_PALETTE[6],
      ),
    ).toBe(true);
  });

  it('falls back to the condition code when display is absent and no palette displays exist', () => {
    expect(
      matchOncologyPaletteEntry(
        { code: 'custom', status: AffectedStatus.Affected },
        { key: 'custom', label: 'Custom', color: '#000' },
      ),
    ).toBe(false);
  });
});

describe('getOncologyMarkers', () => {
  it('uses palette order as the priority order and overflows extras into text only', () => {
    const result = getOncologyMarkers([
      { code: '372244006', display: 'Melanoma', status: AffectedStatus.Affected },
      { code: '254837009', display: 'Breast cancer', status: AffectedStatus.Affected },
      { code: '363443007', display: 'Ovarian cancer', status: AffectedStatus.Affected },
      { code: '126906006', display: 'Prostate cancer', status: AffectedStatus.Affected },
      { code: '363406005', display: 'Colorectal cancer', status: AffectedStatus.Affected },
    ]);
    expect(result.markers.map((marker) => marker.key)).toEqual([
      'breast',
      'ovarian',
      'prostate',
      'colorectal',
    ]);
    expect(result.overflowConditions.map((condition) => condition.code)).toEqual(['372244006']);
  });

  it('returns no markers for unknown or unaffected conditions', () => {
    const result = getOncologyMarkers([
      { code: 'custom', display: 'Glioblastoma', status: AffectedStatus.Affected },
      { code: '254837009', display: 'Breast cancer', status: AffectedStatus.Unaffected },
    ]);
    expect(result.markers).toEqual([]);
    expect(result.overflowConditions).toEqual([
      { code: 'custom', display: 'Glioblastoma', status: AffectedStatus.Affected },
    ]);
  });

  it('honors a smaller maxMarkers override', () => {
    const result = getOncologyMarkers(
      [
        { code: '254837009', display: 'Breast cancer', status: AffectedStatus.Affected },
        { code: '363443007', display: 'Ovarian cancer', status: AffectedStatus.Affected },
        { code: '394592004', display: 'Sarcoma', status: AffectedStatus.Affected },
      ],
      DEFAULT_ONCOLOGY_PALETTE,
      { maxMarkers: 2 },
    );
    expect(result.markers.map((marker) => marker.key)).toEqual(['breast', 'ovarian']);
    expect(result.overflowConditions.map((condition) => condition.code)).toEqual(['394592004']);
  });
});

describe('getConditionOnsetDisplay', () => {
  it('formats onset age the same way as other age observations', () => {
    expect(
      getConditionOnsetDisplay({
        onsetAge: { kind: 'quantity', quantity: { value: 68, unit: 'a', code: 'a' } },
      }),
    ).toBe('68');
  });

  it('returns undefined when a condition has no onset metadata', () => {
    expect(getConditionOnsetDisplay({})).toBeUndefined();
  });
});
