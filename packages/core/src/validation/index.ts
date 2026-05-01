import { type RuleRegistry, createRegistry } from './registry.js';
import { completenessRule } from './rules/completeness.js';
import { sexRelationshipConsistencyRule } from './rules/consistency.js';
import { cyclesRule } from './rules/cycles.js';
import { unknownCodesRule } from './rules/unknown-codes.js';

/** Default registry: all built-in rules in declaration order. */
export function defaultRegistry(): RuleRegistry {
  return createRegistry([
    completenessRule,
    sexRelationshipConsistencyRule,
    cyclesRule,
    unknownCodesRule,
  ]);
}

export { createRegistry } from './registry.js';
export type { RuleRegistry } from './registry.js';
export { Severity } from './types.js';
export type { Diagnostic, Rule } from './types.js';
export { completenessRule } from './rules/completeness.js';
export { sexRelationshipConsistencyRule } from './rules/consistency.js';
export { cyclesRule } from './rules/cycles.js';
export { unknownCodesRule } from './rules/unknown-codes.js';
