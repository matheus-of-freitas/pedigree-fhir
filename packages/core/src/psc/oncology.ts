import type { Individual } from '../model/types.js';
import {
  AffectedStatus,
  type AgeObservation,
  type ConditionRecord,
  VitalStatus,
} from './semantics.js';

export interface OncologyPaletteEntry {
  key: string;
  label: string;
  color: string;
  codes?: readonly string[];
  displays?: readonly string[];
}

export interface OncologyMarker {
  key: string;
  label: string;
  color: string;
  condition: ConditionRecord;
}

export interface OncologyMarkerOptions {
  maxMarkers?: number;
}

export interface OncologyMarkerResult {
  markers: readonly OncologyMarker[];
  overflowConditions: readonly ConditionRecord[];
}

export interface AgeDisplayOptions {
  asOfDate?: Date | string;
}

export const DEFAULT_ONCOLOGY_PALETTE: readonly OncologyPaletteEntry[] = [
  {
    key: 'breast',
    label: 'Breast cancer',
    color: '#f4b7d8',
    codes: ['254837009'],
    displays: ['Breast cancer', 'Breast'],
  },
  {
    key: 'ovarian',
    label: 'Ovarian cancer',
    color: '#7ec9cf',
    codes: ['363443007'],
    displays: ['Ovarian cancer', 'Ovarian'],
  },
  {
    key: 'sarcoma',
    label: 'Sarcoma',
    color: '#f7de6a',
    displays: ['Sarcoma', 'Sarcoma (Bone) Cancer'],
  },
  {
    key: 'prostate',
    label: 'Prostate cancer',
    color: '#d6eef6',
    codes: ['126906006'],
    displays: ['Prostate cancer', 'Met. Prostate'],
  },
  {
    key: 'colorectal',
    label: 'Colorectal cancer',
    color: '#8fd19e',
    codes: ['363406005'],
    displays: ['Colorectal cancer', 'Colon cancer', 'Colorectal'],
  },
  {
    key: 'cervical',
    label: 'Cervical cancer',
    color: '#b98b57',
    displays: ['Cervical cancer', 'Cervical'],
  },
  {
    key: 'melanoma',
    label: 'Melanoma',
    color: '#111827',
    codes: ['372244006'],
    displays: ['Melanoma'],
  },
];

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isYearUnit(unit: string | undefined, code: string | undefined): boolean {
  const normalizedUnit = unit === undefined ? undefined : normalizeToken(unit);
  return (
    code === 'a' ||
    (normalizedUnit === undefined && code === undefined) ||
    normalizedUnit === 'a' ||
    normalizedUnit === 'yr' ||
    normalizedUnit === 'yrs' ||
    normalizedUnit === 'year' ||
    normalizedUnit === 'years'
  );
}

function formatQuantityValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function formatAgeQuantity(age: { value: number; unit?: string; code?: string }): string {
  const value = formatQuantityValue(age.value);
  if (isYearUnit(age.unit, age.code)) return value;
  const unit = age.unit ?? age.code;
  /* v8 ignore next -- the non-year path above guarantees either unit or code is present. */
  return unit === undefined ? value : `${value} ${unit}`;
}

function toDate(value: Date | string | undefined): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return new Date();
}

function yearsFromBirthDate(birthDate: string, asOfDate: Date): string | undefined {
  const parts = birthDate.split('-');
  const year = Number(parts[0]);
  if (!Number.isFinite(year)) return undefined;

  let age = asOfDate.getUTCFullYear() - year;
  const month = parts[1] === undefined ? undefined : Number(parts[1]);
  const day = parts[2] === undefined ? undefined : Number(parts[2]);
  if (
    month !== undefined &&
    day !== undefined &&
    (asOfDate.getUTCMonth() + 1 < month ||
      (asOfDate.getUTCMonth() + 1 === month && asOfDate.getUTCDate() < day))
  ) {
    age -= 1;
  }

  return age < 0 ? undefined : String(age);
}

export function getAgeObservationDisplay(age: AgeObservation | undefined): string | undefined {
  if (age === undefined) return undefined;

  if (age.kind === 'quantity') return formatAgeQuantity(age.quantity);

  if (age.kind === 'range') {
    const low = age.range.low === undefined ? undefined : formatAgeQuantity(age.range.low);
    const high = age.range.high === undefined ? undefined : formatAgeQuantity(age.range.high);
    if (low !== undefined && high !== undefined) return `${low}-${high}`;
    return low ?? high;
  }

  return age.text;
}

export function getIndividualAgeDisplay(
  individual: Pick<Individual, 'birthDate' | 'age' | 'deceasedAge' | 'semantics'>,
  options: AgeDisplayOptions = {},
): string | undefined {
  if (individual.semantics.vital === VitalStatus.Deceased) {
    return getAgeObservationDisplay(individual.deceasedAge);
  }

  const explicitAge = getAgeObservationDisplay(individual.age);
  if (explicitAge !== undefined) return explicitAge;

  if (individual.birthDate === undefined) return undefined;
  return yearsFromBirthDate(individual.birthDate, toDate(options.asOfDate));
}

export function getConditionOnsetDisplay(
  condition: Pick<ConditionRecord, 'onsetAge'>,
): string | undefined {
  return getAgeObservationDisplay(condition.onsetAge);
}

export function matchOncologyPaletteEntry(
  condition: Pick<ConditionRecord, 'code' | 'display' | 'status'>,
  entry: OncologyPaletteEntry,
): boolean {
  if (condition.status !== AffectedStatus.Affected) return false;
  const normalizedCode = normalizeToken(condition.code);
  if (entry.codes?.some((code) => normalizeToken(code) === normalizedCode)) return true;

  const label = condition.display ?? condition.code;
  const normalizedLabel = normalizeToken(label);
  return (
    entry.displays?.some((display) => {
      const normalizedDisplay = normalizeToken(display);
      return (
        normalizedDisplay === normalizedLabel ||
        normalizedLabel.endsWith(` ${normalizedDisplay}`) ||
        normalizedLabel.startsWith(`${normalizedDisplay} `)
      );
    }) ?? false
  );
}

export function getOncologyMarkers(
  conditions: readonly ConditionRecord[],
  palette: readonly OncologyPaletteEntry[] = DEFAULT_ONCOLOGY_PALETTE,
  options: OncologyMarkerOptions = {},
): OncologyMarkerResult {
  const maxMarkers = options.maxMarkers ?? 4;
  const markers: OncologyMarker[] = [];
  const represented = new Set<string>();

  for (const entry of palette) {
    const condition = conditions.find((candidate) => matchOncologyPaletteEntry(candidate, entry));
    if (condition === undefined) continue;
    markers.push({
      key: entry.key,
      label: entry.label,
      color: entry.color,
      condition,
    });
    represented.add(condition.code);
    if (markers.length === maxMarkers) break;
  }

  const overflowConditions = conditions.filter(
    (condition) => condition.status === AffectedStatus.Affected && !represented.has(condition.code),
  );
  return { markers, overflowConditions };
}
