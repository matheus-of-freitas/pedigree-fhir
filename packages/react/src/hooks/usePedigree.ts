import {
  type LaidOutPedigree,
  type LayoutOptions,
  type PedigreeGraph,
  computePedigreeLayout,
} from '@pedigree/core';
import { useMemo, useSyncExternalStore } from 'react';
import { usePedigreeStore } from '../context.js';

export interface UsePedigreeResult {
  graph: PedigreeGraph;
  layout: LaidOutPedigree;
  layoutOptions: LayoutOptions;
}

/**
 * Top-level state hook: subscribes to the store and recomputes the layout
 * whenever the graph or its options change. The layout is memoised on the
 * (graph, options) pair, so consumers iterating over `layout.nodes` etc.
 * don't pay for re-layout on unrelated re-renders.
 */
export function usePedigree(): UsePedigreeResult {
  const store = usePedigreeStore();
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const layout = useMemo(
    () => computePedigreeLayout(state.graph, state.layoutOptions),
    [state.graph, state.layoutOptions],
  );
  return { graph: state.graph, layout, layoutOptions: state.layoutOptions };
}
