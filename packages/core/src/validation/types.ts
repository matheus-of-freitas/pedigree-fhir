import type { CoupleId, IndividualId, PedigreeGraph } from '../model/types.js';

export const Severity = {
  Info: 'info',
  Warning: 'warning',
  Error: 'error',
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export interface Diagnostic {
  /** Stable machine-readable code, e.g. `'completeness/missing-grandparent'`. */
  code: string;
  severity: Severity;
  /** Human-readable summary; consumers may prefer to localise from `code`. */
  message: string;
  /** Individuals related to this diagnostic. Empty when graph-wide. */
  individualIds: readonly IndividualId[];
  /** Couples related to this diagnostic, when applicable. */
  coupleIds?: readonly CoupleId[];
}

export interface Rule {
  /** Stable identifier; used as the key when consumers replace built-ins. */
  id: string;
  run: (graph: PedigreeGraph) => Diagnostic[];
}
