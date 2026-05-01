import { getRelationshipMetadata } from '../../fhir/relationship-codes.js';
import type { PedigreeGraph } from '../../model/types.js';
import { Sex } from '../../psc/semantics.js';
import { type Diagnostic, type Rule, Severity } from '../types.js';

/**
 * Sex / relationship code consistency. If an individual's
 * `relationshipToProband` implies a specific sex (e.g. `MTH` ⇒ female) but
 * the recorded `semantics.sex` disagrees, flag it.
 */
export const sexRelationshipConsistencyRule: Rule = {
  id: 'consistency/sex-relationship',
  run(graph: PedigreeGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const ind of Object.values(graph.individuals)) {
      const code = ind.relationshipToProband;
      if (code === undefined) continue;
      const meta = getRelationshipMetadata(code);
      if (meta === undefined) continue;
      if (meta.sexHint === undefined) continue;
      if (ind.semantics.sex !== Sex.Unknown && ind.semantics.sex !== meta.sexHint) {
        diagnostics.push({
          code: 'consistency/sex-mismatch',
          severity: Severity.Error,
          message: `Individual ${ind.id} has relationship "${code}" (implies ${meta.sexHint}) but recorded sex is ${ind.semantics.sex}.`,
          individualIds: [ind.id],
        });
      }
    }
    return diagnostics;
  },
};
