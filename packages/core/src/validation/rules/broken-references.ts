import type { PedigreeGraph } from '../../model/types.js';
import { type Diagnostic, type Rule, Severity } from '../types.js';

export const brokenReferencesRule: Rule = {
  id: 'structure/broken-references',
  run(graph: PedigreeGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const ind of Object.values(graph.individuals)) {
      if (ind.childOf !== undefined && graph.couples[ind.childOf] === undefined) {
        diagnostics.push({
          code: 'structure/missing-parent-couple',
          severity: Severity.Error,
          message: `Individual ${ind.id} points to missing parent couple "${ind.childOf}".`,
          individualIds: [ind.id],
          coupleIds: [ind.childOf],
        });
      }
    }

    for (const couple of Object.values(graph.couples)) {
      const [a, b] = couple.partners;
      if (a === b) {
        diagnostics.push({
          code: 'structure/duplicate-partner',
          severity: Severity.Error,
          message: `Couple ${couple.id} references the same partner twice (${a}).`,
          individualIds: [a],
          coupleIds: [couple.id],
        });
      }
      for (const partnerId of couple.partners) {
        if (graph.individuals[partnerId] !== undefined) continue;
        diagnostics.push({
          code: 'structure/missing-partner',
          severity: Severity.Error,
          message: `Couple ${couple.id} references missing partner "${partnerId}".`,
          individualIds: [],
          coupleIds: [couple.id],
        });
      }
    }

    return diagnostics;
  },
};
