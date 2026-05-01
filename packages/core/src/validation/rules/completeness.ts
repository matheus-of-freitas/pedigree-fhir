import type { Individual, PedigreeGraph } from '../../model/types.js';
import { Provenance } from '../../model/types.js';
import { type Diagnostic, type Rule, Severity } from '../types.js';

/**
 * Flags missing pieces of a 3-generation pedigree: parents, all four
 * grandparents, and parents' siblings (or at least an explicit "unknown"
 * placeholder). Inferred placeholders count as missing — they exist in the
 * graph for layout purposes but represent genuinely unknown information that
 * a clinician should confirm.
 */
export const completenessRule: Rule = {
  id: 'completeness',
  run(graph: PedigreeGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const proband = graph.individuals[graph.proband];
    if (proband === undefined) return diagnostics;

    if (proband.childOf === undefined) {
      diagnostics.push({
        code: 'completeness/proband-missing-parents',
        severity: Severity.Warning,
        message:
          'Proband has no parent couple. A complete 3-generation pedigree needs both parents.',
        individualIds: [proband.id],
      });
      return diagnostics;
    }

    const parentCouple = graph.couples[proband.childOf];
    if (parentCouple === undefined) return diagnostics;

    for (const partnerId of parentCouple.partners) {
      const partner = graph.individuals[partnerId];
      if (partner === undefined) continue;
      if (partner.provenance === Provenance.Inferred) {
        diagnostics.push({
          code: 'completeness/parent-inferred',
          severity: Severity.Warning,
          message: `Parent (${partnerId}) is an inferred placeholder. Confirm or fill in their details.`,
          individualIds: [partnerId],
        });
      }
      // Missing grandparents on this side?
      const sideName = isMaternalSide(graph, partner) ? 'maternal' : 'paternal';
      if (partner.childOf === undefined) {
        diagnostics.push({
          code: 'completeness/grandparents-missing',
          severity: Severity.Warning,
          message: `${capitalize(sideName)} grandparents are not in the pedigree.`,
          individualIds: [partnerId],
        });
        continue;
      }
      const gpCouple = graph.couples[partner.childOf];
      if (gpCouple === undefined) continue;
      for (const gpId of gpCouple.partners) {
        const gp = graph.individuals[gpId];
        if (gp === undefined) continue;
        if (gp.provenance === Provenance.Inferred) {
          diagnostics.push({
            code: 'completeness/grandparent-inferred',
            severity: Severity.Info,
            message: `${capitalize(sideName)} grandparent (${gpId}) is an inferred placeholder.`,
            individualIds: [gpId],
          });
        }
      }
      const parentSiblings = Object.values(graph.individuals).filter(
        (ind) => ind.id !== partner.id && ind.childOf === partner.childOf,
      );
      if (parentSiblings.length === 0) {
        diagnostics.push({
          code: 'completeness/parent-siblings-missing',
          severity: Severity.Info,
          message: `No ${sideName} aunts/uncles or explicit unknown placeholder are represented.`,
          individualIds: [partner.id],
          coupleIds: [partner.childOf],
        });
      }
    }

    return diagnostics;
  },
};

function isMaternalSide(graph: PedigreeGraph, parent: Individual): boolean {
  const code = parent.relationshipToProband;
  if (code === 'MTH' || code === 'NMTH') return true;
  // Heuristic: if the partner's relationshipToProband says paternal, fall back to false.
  for (const other of Object.values(graph.individuals)) {
    if (other.id === parent.id) continue;
    if (other.childOf === parent.childOf) {
      const ocode = other.relationshipToProband;
      if (ocode === 'MTH' || ocode === 'NMTH') return false;
    }
  }
  return false;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
