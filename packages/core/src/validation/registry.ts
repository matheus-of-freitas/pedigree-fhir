import type { PedigreeGraph } from '../model/types.js';
import type { Diagnostic, Rule } from './types.js';

/**
 * Tiny composable validation registry. Consumers may extend, replace, or
 * disable individual rules; the default registry includes all built-ins.
 *
 * Pure: rule execution doesn't mutate state and the registry itself is
 * immutable — every modifier returns a new registry.
 */
export interface RuleRegistry {
  list(): readonly Rule[];
  with(rule: Rule): RuleRegistry;
  without(id: string): RuleRegistry;
  validate(graph: PedigreeGraph): Diagnostic[];
}

export function createRegistry(rules: readonly Rule[] = []): RuleRegistry {
  // Dedupe by id, keeping the last occurrence (so `with()` overrides).
  const byId = new Map<string, Rule>();
  for (const r of rules) byId.set(r.id, r);
  const ordered = [...byId.values()];

  return {
    list() {
      return ordered;
    },
    with(rule) {
      return createRegistry([...ordered.filter((r) => r.id !== rule.id), rule]);
    },
    without(id) {
      return createRegistry(ordered.filter((r) => r.id !== id));
    },
    validate(graph) {
      const out: Diagnostic[] = [];
      for (const rule of ordered) {
        for (const d of rule.run(graph)) out.push(d);
      }
      return out;
    },
  };
}
