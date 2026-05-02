import type { IndividualId } from '@pedigree-fhir/core';
import { useSyncExternalStore } from 'react';
import { usePedigreeStore } from '../context.js';

export interface UseSelectionResult {
  selectedId: IndividualId | undefined;
  selectIndividual: (id: IndividualId) => void;
  clearSelection: () => void;
  /** Selects `id` if not already selected; clears the selection if it is. */
  toggleSelection: (id: IndividualId) => void;
}

/**
 * Read + write the currently-selected individual. The store keeps a single
 * selection; consumers wanting multi-select can model it themselves.
 */
export function useSelection(): UseSelectionResult {
  const store = usePedigreeStore();
  const selectedId = useSyncExternalStore(store.subscribe, () => store.getState().selectedId);
  return {
    selectedId,
    selectIndividual: (id) => store.dispatch({ type: 'selectIndividual', id }),
    clearSelection: () => store.dispatch({ type: 'clearSelection' }),
    toggleSelection: (id) => {
      if (store.getState().selectedId === id) {
        store.dispatch({ type: 'clearSelection' });
      } else {
        store.dispatch({ type: 'selectIndividual', id });
      }
    },
  };
}
