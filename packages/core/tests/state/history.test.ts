import { describe, expect, it } from 'vitest';
import { canRedo, canUndo, emptyHistory, recordEdit, redo, undo } from '../../src/state/history.js';

describe('emptyHistory', () => {
  it('returns past=[] and future=[]', () => {
    const h = emptyHistory<number>();
    expect(h).toEqual({ past: [], future: [] });
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });
});

describe('recordEdit', () => {
  it('pushes prev into past and clears future', () => {
    const h0 = emptyHistory<number>();
    const h1 = recordEdit(h0, 1);
    expect(h1.past).toEqual([1]);
    expect(h1.future).toEqual([]);
  });

  it('always clears future on a new edit', () => {
    const h: { past: number[]; future: number[] } = { past: [1], future: [3] };
    const h2 = recordEdit(h, 2);
    expect(h2.future).toEqual([]);
  });

  it('caps past at 50 entries (drops oldest)', () => {
    let h = emptyHistory<number>();
    for (let i = 0; i < 60; i++) h = recordEdit(h, i);
    expect(h.past).toHaveLength(50);
    expect(h.past[0]).toBe(10); // 10..59
    expect(h.past[h.past.length - 1]).toBe(59);
  });
});

describe('undo / redo', () => {
  it('undo returns the most recent past entry and stashes current to future', () => {
    const h: { past: number[]; future: number[] } = { past: [1, 2], future: [] };
    const out = undo(h, 3);
    expect(out).toBeDefined();
    expect(out?.restored).toBe(2);
    expect(out?.history).toEqual({ past: [1], future: [3] });
  });

  it('undo returns undefined when past is empty', () => {
    expect(undo(emptyHistory<number>(), 0)).toBeUndefined();
  });

  it('redo returns the first future entry and stashes current to past', () => {
    const h: { past: number[]; future: number[] } = { past: [1], future: [3, 4] };
    const out = redo(h, 2);
    expect(out).toBeDefined();
    expect(out?.restored).toBe(3);
    expect(out?.history).toEqual({ past: [1, 2], future: [4] });
  });

  it('redo returns undefined when future is empty', () => {
    expect(redo(emptyHistory<number>(), 0)).toBeUndefined();
  });
});
