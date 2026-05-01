import { describe, expect, it } from 'vitest';
import { Provenance } from '../../src/model/types.js';

describe('model types', () => {
  it('Provenance values are stable', () => {
    expect(Provenance).toEqual({
      Explicit: 'explicit',
      Inferred: 'inferred',
    });
  });
});
