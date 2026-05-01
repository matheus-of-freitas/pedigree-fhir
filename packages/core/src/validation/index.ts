import { type RuleRegistry, createRegistry } from './registry.js';
import { brokenReferencesRule } from './rules/broken-references.js';
import { completenessRule } from './rules/completeness.js';
import { sexRelationshipConsistencyRule } from './rules/consistency.js';
import { cyclesRule } from './rules/cycles.js';
import { twinGroupsRule } from './rules/twin-groups.js';
import { unknownCodesRule } from './rules/unknown-codes.js';

/** Default registry: all built-in rules in declaration order. */
export function defaultRegistry(): RuleRegistry {
  return createRegistry([
    completenessRule,
    sexRelationshipConsistencyRule,
    cyclesRule,
    brokenReferencesRule,
    twinGroupsRule,
    unknownCodesRule,
  ]);
}

export { validateFhirInput } from './input.js';
export { createRegistry } from './registry.js';
export type { RuleRegistry } from './registry.js';
export { Severity } from './types.js';
export type { Diagnostic, DiagnosticResourceRef, Rule } from './types.js';
export { completenessRule } from './rules/completeness.js';
export { sexRelationshipConsistencyRule } from './rules/consistency.js';
export { cyclesRule } from './rules/cycles.js';
export { brokenReferencesRule } from './rules/broken-references.js';
export { twinGroupsRule } from './rules/twin-groups.js';
export { unknownCodesRule } from './rules/unknown-codes.js';
