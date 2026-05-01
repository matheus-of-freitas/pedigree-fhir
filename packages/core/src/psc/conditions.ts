import { AffectedStatus, type ConditionRecord } from './semantics.js';

export interface ConditionDisplayOptions {
  maxItems?: number;
}

export function getConditionDisplay(condition: ConditionRecord): string {
  const label = condition.display ?? condition.code;
  switch (condition.status) {
    case AffectedStatus.Unaffected:
      return `No ${label}`;
    case AffectedStatus.Unknown:
      return `${label} (?)`;
    case AffectedStatus.Affected:
      return label;
  }
}

export function getConditionDisplayList(
  conditions: readonly ConditionRecord[],
  options: ConditionDisplayOptions = {},
): readonly string[] {
  const labels = conditions.map(getConditionDisplay);
  const maxItems = options.maxItems;
  if (maxItems === undefined || labels.length <= maxItems) return labels;
  const remaining = labels.length - maxItems;
  return [...labels.slice(0, maxItems), `+${remaining} more`];
}

export function hasAffectedConditions(conditions: readonly ConditionRecord[]): boolean {
  return conditions.some((condition) => condition.status === AffectedStatus.Affected);
}
