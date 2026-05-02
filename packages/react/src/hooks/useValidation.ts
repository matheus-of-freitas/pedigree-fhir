import { type Diagnostic, type RuleRegistry, defaultRegistry } from '@pedigree-fhir/core';
import { useMemo, useSyncExternalStore } from 'react';
import { usePedigreeStore } from '../context.js';

export interface UseValidationResult {
  diagnostics: readonly Diagnostic[];
  registry: RuleRegistry;
}

/**
 * Runs validation against the current graph and recomputes whenever the store
 * graph changes. Consumers can pass a custom registry to replace or extend
 * built-in validation rules.
 */
export function useValidation(registry?: RuleRegistry): UseValidationResult {
  const store = usePedigreeStore();
  const graph = useSyncExternalStore(store.subscribe, () => store.getState().graph);
  const activeRegistry = useMemo(() => registry ?? defaultRegistry(), [registry]);
  const diagnostics = useMemo(() => activeRegistry.validate(graph), [activeRegistry, graph]);

  return { diagnostics, registry: activeRegistry };
}
