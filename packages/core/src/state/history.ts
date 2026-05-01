/**
 * Linear undo/redo history. Each edit pushes the previous value to `past`
 * and clears `future` (branching after undo+edit drops the redo trail). Undo
 * pops `past` to current and pushes current to `future`; redo is symmetric.
 *
 * Capped at 50 entries to bound memory; oldest entries are evicted when the
 * cap is exceeded.
 */

const HISTORY_CAP = 50;

export interface History<T> {
  readonly past: readonly T[];
  readonly future: readonly T[];
}

export function emptyHistory<T>(): History<T> {
  return { past: [], future: [] };
}

export function recordEdit<T>(history: History<T>, previous: T): History<T> {
  const next = [...history.past, previous];
  const past = next.length > HISTORY_CAP ? next.slice(next.length - HISTORY_CAP) : next;
  return { past, future: [] };
}

export interface UndoOutcome<T> {
  history: History<T>;
  restored: T;
}

export function undo<T>(history: History<T>, current: T): UndoOutcome<T> | undefined {
  const len = history.past.length;
  if (len === 0) return undefined;
  const restored = history.past[len - 1] as T;
  return {
    history: { past: history.past.slice(0, len - 1), future: [current, ...history.future] },
    restored,
  };
}

export function redo<T>(history: History<T>, current: T): UndoOutcome<T> | undefined {
  if (history.future.length === 0) return undefined;
  const restored = history.future[0] as T;
  return {
    history: { past: [...history.past, current], future: history.future.slice(1) },
    restored,
  };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0;
}
