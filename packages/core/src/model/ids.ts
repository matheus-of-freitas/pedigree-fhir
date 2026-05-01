import type { CoupleId, IndividualId } from './types.js';

/**
 * Build a deterministic couple ID from two individual IDs. Order-independent:
 * `makeCoupleId(a, b)` and `makeCoupleId(b, a)` always produce the same string.
 *
 * Both `parsePedigree` and `inferRelationships` mint couples; they must agree
 * on the ID format so couples created during parse are found (not duplicated)
 * during inference.
 */
export function makeCoupleId(a: IndividualId, b: IndividualId): CoupleId {
  return a < b ? `couple:${a}+${b}` : `couple:${b}+${a}`;
}
