import { useSyncExternalStore } from 'react';
import { usePedigreeStore } from '../context.js';

export type CompactSide = 'maternal' | 'paternal';

export interface CompactState {
  maternal: boolean;
  paternal: boolean;
}

export interface UseCompactResult {
  compact: CompactState;
  setCompact: (next: CompactState) => void;
  toggle: (side: CompactSide) => void;
}

const DEFAULT_COMPACT: CompactState = { maternal: false, paternal: false };

/**
 * Read + write the compact-mode toggles that hide aunts/uncles per side.
 * Compact rides on top of `setLayoutOptions` since it's a layout-only switch
 * (the underlying graph is untouched).
 */
export function useCompact(): UseCompactResult {
  const store = usePedigreeStore();
  const compact = useSyncExternalStore(store.subscribe, () => {
    return store.getState().layoutOptions.hideAuntsUncles ?? DEFAULT_COMPACT;
  });
  return {
    compact,
    setCompact: (next) =>
      store.dispatch({ type: 'setLayoutOptions', options: { hideAuntsUncles: next } }),
    toggle: (side) =>
      store.dispatch({
        type: 'setLayoutOptions',
        options: { hideAuntsUncles: { ...compact, [side]: !compact[side] } },
      }),
  };
}
