import { describe, expect, it } from 'vitest';
import {
  getConditionDisplay,
  getConditionDisplayList,
  hasAffectedConditions,
} from '../../src/index.js';
import { AffectedStatus } from '../../src/psc/semantics.js';

describe('getConditionDisplay', () => {
  it('prefers the display label when the condition is affected', () => {
    expect(
      getConditionDisplay({
        code: '254837009',
        display: 'Breast cancer',
        status: AffectedStatus.Affected,
      }),
    ).toBe('Breast cancer');
  });

  it('falls back to the code when no display label exists', () => {
    expect(getConditionDisplay({ code: 'C50', status: AffectedStatus.Affected })).toBe('C50');
  });

  it('formats unaffected conditions as negative findings', () => {
    expect(
      getConditionDisplay({
        code: '254837009',
        display: 'Breast cancer',
        status: AffectedStatus.Unaffected,
      }),
    ).toBe('No Breast cancer');
  });

  it('marks unknown conditions clearly', () => {
    expect(
      getConditionDisplay({
        code: '363406005',
        display: 'Malignant tumor',
        status: AffectedStatus.Unknown,
      }),
    ).toBe('Malignant tumor (?)');
  });
});

describe('getConditionDisplayList', () => {
  it('returns all condition display labels by default', () => {
    expect(
      getConditionDisplayList([
        { code: 'c1', display: 'Breast cancer', status: AffectedStatus.Affected },
        { code: 'c2', display: 'Ovarian cancer', status: AffectedStatus.Affected },
      ]),
    ).toEqual(['Breast cancer', 'Ovarian cancer']);
  });

  it('caps the list and appends a remainder line', () => {
    expect(
      getConditionDisplayList(
        [
          { code: 'c1', display: 'Breast cancer', status: AffectedStatus.Affected },
          { code: 'c2', display: 'Ovarian cancer', status: AffectedStatus.Affected },
          { code: 'c3', display: 'Melanoma', status: AffectedStatus.Affected },
        ],
        { maxItems: 2 },
      ),
    ).toEqual(['Breast cancer', 'Ovarian cancer', '+1 more']);
  });
});

describe('hasAffectedConditions', () => {
  it('returns true when any tracked condition is affected', () => {
    expect(
      hasAffectedConditions([
        { code: 'c1', display: 'Breast cancer', status: AffectedStatus.Unknown },
        { code: 'c2', display: 'Ovarian cancer', status: AffectedStatus.Affected },
      ]),
    ).toBe(true);
  });

  it('returns false when no tracked condition is affected', () => {
    expect(
      hasAffectedConditions([
        { code: 'c1', display: 'Breast cancer', status: AffectedStatus.Unknown },
        { code: 'c2', display: 'Ovarian cancer', status: AffectedStatus.Unaffected },
      ]),
    ).toBe(false);
  });
});
