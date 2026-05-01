import { getRelationshipMetadata } from '../../fhir/relationship-codes.js';
import type { PedigreeGraph } from '../../model/types.js';
import { type Diagnostic, type Rule, Severity } from '../types.js';

/**
 * Flags `relationshipToProband` codes that aren't in our v3 FamilyMember
 * subset table. Surfacing them lets consumers catch typos in source data
 * before they silently disappear from the layout.
 */
export const unknownCodesRule: Rule = {
  id: 'unknown-codes',
  run(graph: PedigreeGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const ind of Object.values(graph.individuals)) {
      const code = ind.relationshipToProband;
      if (code === undefined) continue;
      if (getRelationshipMetadata(code) !== undefined) continue;
      diagnostics.push({
        code: 'unknown-codes/relationship',
        severity: Severity.Warning,
        message: `Individual ${ind.id} has unknown relationship code "${code}".`,
        individualIds: [ind.id],
      });
    }
    return diagnostics;
  },
};
