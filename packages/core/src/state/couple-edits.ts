import type { CoupleId, Individual, IndividualId, PedigreeGraph } from '../model/types.js';
import { TwinType } from '../psc/semantics.js';

export type CoupleEditAction =
  | { type: 'setConsanguineous'; coupleId: CoupleId; consanguineous: boolean }
  | {
      type: 'setTwin';
      /**
       * The set of individuals to mark as twins of each other. Must all share
       * a `childOf` couple, otherwise the action is a no-op.
       */
      ids: readonly IndividualId[];
      /** `TwinType.None` clears the group. */
      type_: TwinType;
      /**
       * Externally-supplied twin group id. The store doesn't auto-generate
       * one so consumers can keep group ids deterministic across saves /
       * undo. Pass any unique string; ignored when `type_` is `None`.
       */
      groupId: string;
    };

function setConsanguineous(
  graph: PedigreeGraph,
  coupleId: CoupleId,
  consanguineous: boolean,
): PedigreeGraph {
  const couple = graph.couples[coupleId];
  if (couple === undefined) return graph;
  if (couple.consanguineous === consanguineous) return graph;
  return {
    ...graph,
    couples: { ...graph.couples, [coupleId]: { ...couple, consanguineous } },
  };
}

function setTwin(
  graph: PedigreeGraph,
  ids: readonly IndividualId[],
  type: TwinType,
  groupId: string,
): PedigreeGraph {
  if (ids.length === 0) return graph;
  // All target individuals must exist.
  for (const id of ids) {
    if (graph.individuals[id] === undefined) return graph;
  }
  const targets = ids.map((id) => graph.individuals[id] as Individual);
  // All must share the same parent couple, otherwise twin grouping is
  // ill-defined.
  const sharedCouple = targets[0]?.childOf;
  if (sharedCouple === undefined) return graph;
  for (const t of targets) {
    if (t.childOf !== sharedCouple) return graph;
  }

  const individuals = { ...graph.individuals };

  if (type === TwinType.None) {
    // Drop the twin group from any of the named individuals (and any other
    // individual currently in that group, in case the consumer asks to clear
    // an established group via a subset of its members).
    const groupsToClear = new Set<string>();
    for (const t of targets) {
      if (t.twinGroupId !== undefined) groupsToClear.add(t.twinGroupId);
    }
    for (const [id, ind] of Object.entries(individuals)) {
      if (ind.twinGroupId !== undefined && groupsToClear.has(ind.twinGroupId)) {
        const { twinGroupId: _g, ...rest } = ind;
        individuals[id] = {
          ...rest,
          semantics: { ...rest.semantics, twin: TwinType.None },
        };
      }
    }
    return { ...graph, individuals };
  }

  // Assign group + zygosity.
  for (const id of ids) {
    const ind = individuals[id] as Individual;
    individuals[id] = {
      ...ind,
      twinGroupId: groupId,
      semantics: { ...ind.semantics, twin: type },
    };
  }
  return { ...graph, individuals };
}

export function applyCoupleEdit(graph: PedigreeGraph, action: CoupleEditAction): PedigreeGraph {
  switch (action.type) {
    case 'setConsanguineous':
      return setConsanguineous(graph, action.coupleId, action.consanguineous);
    case 'setTwin':
      return setTwin(graph, action.ids, action.type_, action.groupId);
  }
}
