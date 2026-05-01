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
  const graph = useSyncExternalStore(store.subscribe, () => store.getState().graph);
  const layoutOptions = useSyncExternalStore(store.subscribe, () => store.getState().layoutOptions);
  const layout = useMemo(() => computePedigreeLayout(graph, layoutOptions), [graph, layoutOptions]);
  return { graph, layout, layoutOptions };
}
