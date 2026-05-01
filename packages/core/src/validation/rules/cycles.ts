import type { IndividualId, PedigreeGraph } from '../../model/types.js';
import { type Diagnostic, type Rule, Severity } from '../types.js';

/**
 * Cycle detection: an individual must not be reachable through its own
 * ancestor chain. Parent couples are unordered, so both partners have to be
 * explored; following just one side can miss malformed second-parent cycles.
 */
export const cyclesRule: Rule = {
  id: 'cycles',
  run(graph: PedigreeGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const start of Object.values(graph.individuals)) {
      if (reachesSelf(graph, start.id, start.id, new Set<IndividualId>())) {
        diagnostics.push({
          code: 'cycles/ancestor-cycle',
          severity: Severity.Error,
          message: `Individual ${start.id} is reachable as their own ancestor.`,
          individualIds: [start.id],
        });
      }
    }

    return diagnostics;
  },
};

function reachesSelf(
  graph: PedigreeGraph,
  startId: IndividualId,
  cursorId: IndividualId,
  visited: Set<IndividualId>,
): boolean {
  const ind = graph.individuals[cursorId];
  const couple = ind?.childOf === undefined ? undefined : graph.couples[ind.childOf];
  if (couple === undefined) return false;

  for (const parentId of couple.partners) {
    if (parentId === startId) return true;
    if (visited.has(parentId)) continue;
    visited.add(parentId);
    if (reachesSelf(graph, startId, parentId, visited)) return true;
  }
  return false;
}
