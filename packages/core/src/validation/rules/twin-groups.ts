import type { Individual, PedigreeGraph, TwinGroupId } from '../../model/types.js';
import { TwinType } from '../../psc/semantics.js';
import { type Diagnostic, type Rule, Severity } from '../types.js';

function byTwinGroup(graph: PedigreeGraph): Map<TwinGroupId, Individual[]> {
  const groups = new Map<TwinGroupId, Individual[]>();
  for (const ind of Object.values(graph.individuals)) {
    if (ind.twinGroupId === undefined) continue;
    const seen = groups.get(ind.twinGroupId);
    if (seen === undefined) groups.set(ind.twinGroupId, [ind]);
    else seen.push(ind);
  }
  return groups;
}

export const twinGroupsRule: Rule = {
  id: 'structure/twin-groups',
  run(graph: PedigreeGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const [groupId, members] of byTwinGroup(graph)) {
      const ids = members.map((m) => m.id);
      if (members.length < 2) {
        diagnostics.push({
          code: 'structure/twin-group-singleton',
          severity: Severity.Warning,
          message: `Twin group "${groupId}" has fewer than two members.`,
          individualIds: ids,
        });
      }

      const childOf = new Set(members.map((m) => m.childOf ?? '__missing__'));
      if (childOf.size > 1) {
        diagnostics.push({
          code: 'structure/twin-group-parent-mismatch',
          severity: Severity.Error,
          message: `Twin group "${groupId}" spans multiple parent couples.`,
          individualIds: ids,
        });
      }

      const twinTypes = new Set(members.map((m) => m.semantics.twin));
      if (twinTypes.has(TwinType.None)) {
        diagnostics.push({
          code: 'structure/twin-group-missing-type',
          severity: Severity.Warning,
          message: `Twin group "${groupId}" includes members whose semantics.twin is "none".`,
          individualIds: ids,
        });
      }

      const nonNoneTypes = [...twinTypes].filter((type) => type !== TwinType.None);
      if (new Set(nonNoneTypes).size > 1) {
        diagnostics.push({
          code: 'structure/twin-group-type-mismatch',
          severity: Severity.Error,
          message: `Twin group "${groupId}" mixes multiple twin types.`,
          individualIds: ids,
        });
      }
    }

    return diagnostics;
  },
};
