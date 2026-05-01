import { describe, expect, it, vi } from 'vitest';
import { parsePedigree } from '../../src/fhir/parse.js';
import type { PedigreeGraph } from '../../src/model/types.js';
import { emptyHistory } from '../../src/state/history.js';
import { type PedigreeState, createPedigreeStore, reducer } from '../../src/state/store.js';
import { fmh, patient } from '../fixtures/builders.js';

function makeGraph(): PedigreeGraph {
  return parsePedigree(patient({ id: 'p' }), [
    fmh({ id: 'm', patientId: 'p', relationship: 'MTH', sex: 'female' }),
  ]);
}

function blankState(
  graph: PedigreeGraph,
  layoutOptions: PedigreeState['layoutOptions'] = {},
  selectedId: PedigreeState['selectedId'] = undefined,
): PedigreeState {
  return { graph, layoutOptions, selectedId, history: emptyHistory<PedigreeGraph>() };
}

describe('reducer', () => {
  it('load replaces the graph and preserves layoutOptions, clears history', () => {
    const a = makeGraph();
    const b = parsePedigree(patient({ id: 'p2' }), []);
    const before = blankState(a, { siblingPitch: 100 });
    const after = reducer(before, { type: 'load', graph: b });
    expect(after.graph).toBe(b);
    expect(after.layoutOptions).toEqual({ siblingPitch: 100 });
    expect(after.history).toEqual({ past: [], future: [] });
  });

  it('setLayoutOptions merges over existing options', () => {
    const a = makeGraph();
    const before = blankState(a, { siblingPitch: 100, couplePitch: 50 });
    const after = reducer(before, {
      type: 'setLayoutOptions',
      options: { couplePitch: 80 },
    });
    expect(after.layoutOptions).toEqual({ siblingPitch: 100, couplePitch: 80 });
    expect(after.graph).toBe(a);
  });

  it('selectIndividual sets selectedId', () => {
    const a = makeGraph();
    const after = reducer(blankState(a), { type: 'selectIndividual', id: 'm' });
    expect(after.selectedId).toBe('m');
    expect(after.graph).toBe(a);
  });

  it('selectIndividual replaces the previous selection', () => {
    const a = makeGraph();
    const after = reducer(blankState(a, {}, 'm'), { type: 'selectIndividual', id: 'p' });
    expect(after.selectedId).toBe('p');
  });

  it('clearSelection resets selectedId to undefined', () => {
    const a = makeGraph();
    const after = reducer(blankState(a, {}, 'm'), { type: 'clearSelection' });
    expect(after.selectedId).toBeUndefined();
  });

  it('routes individual edit actions through applyIndividualEdit and records history', () => {
    const a = makeGraph();
    const before = blankState(a);
    const after = reducer(before, { type: 'setSex', id: 'm', sex: 'male' as const });
    expect(after.graph.individuals.m?.semantics.sex).toBe('male');
    expect(after.history.past).toEqual([a]);
    expect(after.layoutOptions).toBe(before.layoutOptions);
  });

  it('routes graph edit actions through applyGraphEdit and records history', () => {
    const a = makeGraph();
    const after = reducer(blankState(a), {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'sibling',
      newId: 'sib',
      sex: 'female' as const,
    });
    expect(after.graph.individuals.sib).toBeDefined();
    expect(after.history.past).toEqual([a]);
  });

  it('routes couple edit actions through applyCoupleEdit and records history', () => {
    const a = makeGraph();
    const seeded = reducer(blankState(a), {
      type: 'addRelative',
      relativeOf: 'p',
      kind: 'partner',
      newId: 'spouse',
      sex: 'male' as const,
    });
    const coupleId = Object.keys(seeded.graph.couples)[0] as string;
    const after = reducer(seeded, {
      type: 'setConsanguineous',
      coupleId,
      consanguineous: true,
    });
    expect(after.graph.couples[coupleId]?.consanguineous).toBe(true);
    expect(after.history.past).toHaveLength(2);
  });

  it('no-op edits skip history', () => {
    const a = makeGraph();
    const before = blankState(a);
    const after = reducer(before, { type: 'setSex', id: 'ghost', sex: 'male' as const });
    expect(after).toBe(before);
  });
});

describe('reducer — undo/redo', () => {
  function buildSequence() {
    const initial = makeGraph();
    let state = blankState(initial);
    state = reducer(state, { type: 'setSex', id: 'm', sex: 'male' as const });
    state = reducer(state, {
      type: 'upsertCondition',
      id: 'm',
      condition: { code: 'C1', status: 'affected' as const },
    });
    return { initial, state };
  }

  it('undo restores the previous graph', () => {
    const { state } = buildSequence();
    const after = reducer(state, { type: 'undo' });
    expect(after.graph.individuals.m?.semantics.conditions).toEqual([]);
    // Sex was changed earlier, so still 'male' after undoing the condition.
    expect(after.graph.individuals.m?.semantics.sex).toBe('male');
    expect(after.history.future).toHaveLength(1);
  });

  it('undo+undo unwinds two edits', () => {
    const { initial, state } = buildSequence();
    const a1 = reducer(state, { type: 'undo' });
    const a2 = reducer(a1, { type: 'undo' });
    expect(a2.graph).toBe(initial);
    expect(a2.history.past).toEqual([]);
    expect(a2.history.future).toHaveLength(2);
  });

  it('redo re-applies the most recently undone edit', () => {
    const { state } = buildSequence();
    const undone = reducer(state, { type: 'undo' });
    const redone = reducer(undone, { type: 'redo' });
    expect(redone.graph).toBe(state.graph);
  });

  it('editing after undo discards the redo trail', () => {
    const { state } = buildSequence();
    const undone = reducer(state, { type: 'undo' });
    const branched = reducer(undone, {
      type: 'setVital',
      id: 'm',
      vital: 'deceased' as const,
    });
    expect(branched.history.future).toEqual([]);
  });

  it('undo is a no-op when history is empty', () => {
    const a = makeGraph();
    const before = blankState(a);
    const after = reducer(before, { type: 'undo' });
    expect(after).toBe(before);
  });

  it('redo is a no-op when there is no future', () => {
    const a = makeGraph();
    const before = blankState(a);
    const after = reducer(before, { type: 'redo' });
    expect(after).toBe(before);
  });

  it('load clears history', () => {
    const { state } = buildSequence();
    const fresh = parsePedigree(patient({ id: 'newone' }), []);
    const after = reducer(state, { type: 'load', graph: fresh });
    expect(after.history).toEqual({ past: [], future: [] });
    const undone = reducer(after, { type: 'undo' });
    expect(undone).toBe(after);
  });
});

describe('createPedigreeStore', () => {
  it('returns initial state with selectedId defaulted to undefined', () => {
    const graph = makeGraph();
    const store = createPedigreeStore({ graph, layoutOptions: {} });
    expect(store.getState().graph).toBe(graph);
    expect(store.getState().selectedId).toBeUndefined();
  });

  it('honours an explicit initial selectedId', () => {
    const graph = makeGraph();
    const store = createPedigreeStore({ graph, layoutOptions: {}, selectedId: 'm' });
    expect(store.getState().selectedId).toBe('m');
  });

  it('selectIndividual + clearSelection round-trip via dispatch', () => {
    const store = createPedigreeStore({ graph: makeGraph(), layoutOptions: {} });
    store.dispatch({ type: 'selectIndividual', id: 'm' });
    expect(store.getState().selectedId).toBe('m');
    store.dispatch({ type: 'clearSelection' });
    expect(store.getState().selectedId).toBeUndefined();
  });

  it('dispatch updates state and notifies all subscribers', () => {
    const store = createPedigreeStore({ graph: makeGraph(), layoutOptions: {} });
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);
    const next = parsePedigree(patient({ id: 'q' }), []);
    store.dispatch({ type: 'load', graph: next });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(store.getState().graph).toBe(next);
    const arg = a.mock.calls[0]?.[0];
    expect(arg?.graph).toBe(next);
  });

  it('unsubscribe stops further notifications', () => {
    const store = createPedigreeStore({ graph: makeGraph(), layoutOptions: {} });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.dispatch({ type: 'setLayoutOptions', options: { couplePitch: 99 } });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.dispatch({ type: 'setLayoutOptions', options: { couplePitch: 11 } });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribing twice with the same listener still results in a single registration (Set semantics)', () => {
    const store = createPedigreeStore({ graph: makeGraph(), layoutOptions: {} });
    const listener = vi.fn();
    store.subscribe(listener);
    store.subscribe(listener);
    store.dispatch({ type: 'setLayoutOptions', options: {} });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
