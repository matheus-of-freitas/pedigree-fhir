import type { Individual, IndividualId, PedigreeGraph } from '../model/types.js';
import type {
  Adopted,
  CarrierStatus,
  ConditionRecord,
  Sex,
  VitalStatus,
} from '../psc/semantics.js';

/**
 * Per-individual / graph-level edit actions. Couple-level edits
 * (consanguineous, twin grouping) live alongside in `couple-edits.ts`. Graph
 * mutations (add/remove relative) live in `graph-edits.ts`. Splitting keeps
 * each file's pure-function reducer narrow and testable.
 */
export type IndividualEditAction =
  | { type: 'setSex'; id: IndividualId; sex: Sex }
  | { type: 'setVital'; id: IndividualId; vital: VitalStatus }
  | { type: 'upsertCondition'; id: IndividualId; condition: ConditionRecord }
  | { type: 'removeCondition'; id: IndividualId; code: string }
  | { type: 'setCarrier'; id: IndividualId; carrier: CarrierStatus }
  | { type: 'setAdopted'; id: IndividualId; adopted: Adopted }
  | { type: 'setProband'; id: IndividualId };

function updateIndividual(
  graph: PedigreeGraph,
  id: IndividualId,
  patch: (ind: Individual) => Individual,
): PedigreeGraph {
  const existing = graph.individuals[id];
  if (existing === undefined) return graph;
  return {
    ...graph,
    individuals: { ...graph.individuals, [id]: patch(existing) },
  };
}

export function applyIndividualEdit(
  graph: PedigreeGraph,
  action: IndividualEditAction,
): PedigreeGraph {
  switch (action.type) {
    case 'setSex':
      return updateIndividual(graph, action.id, (ind) => ({
        ...ind,
        semantics: { ...ind.semantics, sex: action.sex },
      }));
    case 'setVital':
      return updateIndividual(graph, action.id, (ind) => ({
        ...ind,
        semantics: { ...ind.semantics, vital: action.vital },
      }));
    case 'upsertCondition':
      return updateIndividual(graph, action.id, (ind) => {
        const existingConditions = ind.semantics.conditions;
        const existingIndex = existingConditions.findIndex((c) => c.code === action.condition.code);
        const conditions =
          existingIndex === -1
            ? [...existingConditions, action.condition]
            : existingConditions.map((c, i) => (i === existingIndex ? action.condition : c));
        return { ...ind, semantics: { ...ind.semantics, conditions } };
      });
    case 'removeCondition':
      return updateIndividual(graph, action.id, (ind) => ({
        ...ind,
        semantics: {
          ...ind.semantics,
          conditions: ind.semantics.conditions.filter((c) => c.code !== action.code),
        },
      }));
    case 'setCarrier':
      return updateIndividual(graph, action.id, (ind) => ({
        ...ind,
        semantics: { ...ind.semantics, carrier: action.carrier },
      }));
    case 'setAdopted':
      return updateIndividual(graph, action.id, (ind) => ({
        ...ind,
        semantics: { ...ind.semantics, adopted: action.adopted },
      }));
    case 'setProband': {
      const target = graph.individuals[action.id];
      if (target === undefined) return graph;
      // Flip proband flag: only one individual carries it at a time.
      const individuals: Record<IndividualId, Individual> = {};
      for (const [id, ind] of Object.entries(graph.individuals)) {
        const isProband = id === action.id;
        if (ind.semantics.proband === isProband) {
          individuals[id] = ind;
        } else {
          individuals[id] = { ...ind, semantics: { ...ind.semantics, proband: isProband } };
        }
      }
      return { ...graph, proband: action.id, individuals };
    }
  }
}
