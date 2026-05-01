import { describe, expect, it } from 'vitest';
import {
  Adopted,
  AffectedStatus,
  CarrierStatus,
  Sex,
  TwinType,
  VitalStatus,
} from '../../src/psc/semantics.js';

/**
 * These enum values are part of the public API: changing a string is a
 * breaking change for every consumer rendering against them. Lock them in.
 */

describe('PSC semantics enums', () => {
  it('Sex values are stable', () => {
    expect(Sex).toEqual({
      Male: 'male',
      Female: 'female',
      Unknown: 'unknown',
      Other: 'other',
    });
  });

  it('AffectedStatus values are stable', () => {
    expect(AffectedStatus).toEqual({
      Unaffected: 'unaffected',
      Affected: 'affected',
      Unknown: 'unknown',
    });
  });

  it('CarrierStatus values are stable', () => {
    expect(CarrierStatus).toEqual({
      None: 'none',
      Carrier: 'carrier',
      ObligateCarrier: 'obligateCarrier',
      Presymptomatic: 'presymptomatic',
    });
  });

  it('VitalStatus values are stable and cover all PSC pregnancy outcomes', () => {
    expect(VitalStatus).toEqual({
      Living: 'living',
      Deceased: 'deceased',
      Stillbirth: 'stillbirth',
      Miscarriage: 'miscarriage',
      TerminatedPregnancy: 'terminatedPregnancy',
    });
  });

  it('TwinType values are stable', () => {
    expect(TwinType).toEqual({
      None: 'none',
      Monozygotic: 'monozygotic',
      Dizygotic: 'dizygotic',
      UnknownZygosity: 'unknownZygosity',
    });
  });

  it('Adopted values are stable', () => {
    expect(Adopted).toEqual({
      None: 'none',
      AdoptedIn: 'adoptedIn',
      AdoptedOut: 'adoptedOut',
    });
  });
});
