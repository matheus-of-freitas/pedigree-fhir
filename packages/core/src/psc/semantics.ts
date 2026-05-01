/**
 * Pedigree Standardization Conference (PSC) semantic enums.
 *
 * These types are the headless contract: consumers branch on these values to
 * drive their own SVG/HTML/Canvas rendering. The library never ships visuals.
 *
 * Reference: Bennett RL et al., "Standardized human pedigree nomenclature:
 * update and assessment of the recommendations of the National Society of
 * Genetic Counselors." J Genet Couns. 2008.
 */

export const Sex = {
  Male: 'male',
  Female: 'female',
  Unknown: 'unknown',
  Other: 'other',
} as const;
export type Sex = (typeof Sex)[keyof typeof Sex];

/**
 * Per-condition affected status. Individuals carry an array of these so multi-
 * condition pedigrees (e.g. one allele for breast cancer + one for Lynch) work.
 */
export const AffectedStatus = {
  Unaffected: 'unaffected',
  Affected: 'affected',
  Unknown: 'unknown',
} as const;
export type AffectedStatus = (typeof AffectedStatus)[keyof typeof AffectedStatus];

export interface AgeQuantity {
  value: number;
  unit?: string;
  code?: string;
  system?: string;
}

export interface AgeRange {
  low?: AgeQuantity;
  high?: AgeQuantity;
}

export type AgeObservation =
  | { kind: 'quantity'; quantity: AgeQuantity }
  | { kind: 'range'; range: AgeRange }
  | { kind: 'text'; text: string };

export const CarrierStatus = {
  None: 'none',
  Carrier: 'carrier',
  ObligateCarrier: 'obligateCarrier',
  Presymptomatic: 'presymptomatic',
} as const;
export type CarrierStatus = (typeof CarrierStatus)[keyof typeof CarrierStatus];

/**
 * Vital state covers both living/deceased *and* the special pregnancy outcomes
 * PSC distinguishes (stillbirth, spontaneous miscarriage, terminated pregnancy).
 * Consumers map these to PSC's diamond/triangle shapes and slash overlays.
 */
export const VitalStatus = {
  Living: 'living',
  Deceased: 'deceased',
  Stillbirth: 'stillbirth',
  Miscarriage: 'miscarriage',
  TerminatedPregnancy: 'terminatedPregnancy',
} as const;
export type VitalStatus = (typeof VitalStatus)[keyof typeof VitalStatus];

export const TwinType = {
  None: 'none',
  Monozygotic: 'monozygotic',
  Dizygotic: 'dizygotic',
  UnknownZygosity: 'unknownZygosity',
} as const;
export type TwinType = (typeof TwinType)[keyof typeof TwinType];

export const Adopted = {
  None: 'none',
  AdoptedIn: 'adoptedIn',
  AdoptedOut: 'adoptedOut',
} as const;
export type Adopted = (typeof Adopted)[keyof typeof Adopted];

/** Per-individual condition record: one entry per tracked phenotype. */
export interface ConditionRecord {
  /** Stable code (e.g. SNOMED CT, ICD-10, or consumer-defined). */
  code: string;
  /** Optional human-readable label, surfaced verbatim by consumers. */
  display?: string;
  status: AffectedStatus;
  /** Optional structured onset / age-at-diagnosis metadata. */
  onsetAge?: AgeObservation;
}

/**
 * The full PSC-aligned semantic state for one individual. The library produces
 * this; consumers translate to shapes/fills/slashes on their own.
 */
export interface IndividualSemantics {
  sex: Sex;
  vital: VitalStatus;
  /** Empty array means "no tracked conditions"; not the same as unaffected. */
  conditions: ConditionRecord[];
  carrier: CarrierStatus;
  twin: TwinType;
  proband: boolean;
  adopted: Adopted;
}
