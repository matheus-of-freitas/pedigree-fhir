import type { Individual, IndividualId, NodeLayout } from '@pedigree-fhir/core';
import { usePedigree } from './usePedigree.js';

export interface UseNodeResult {
  individual: Individual;
  position: NodeLayout;
}

/**
 * Look up the layout position and underlying `Individual` for one id. Returns
 * `null` when the id has no layout entry — typically because it's a graph
 * member that the layout pass skipped (e.g. a disconnected relative).
 */
export function useNode(id: IndividualId): UseNodeResult | null {
  const { graph, layout } = usePedigree();
  const individual = graph.individuals[id];
  const position = layout.nodes.find((n) => n.id === id);
  if (individual === undefined || position === undefined) return null;
  return { individual, position };
}
