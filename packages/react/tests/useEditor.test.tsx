import { Adopted, AffectedStatus, CarrierStatus, Sex, TwinType, VitalStatus } from '@pedigree/core';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { PedigreeProvider } from '../src/context.js';
import { useEditor } from '../src/hooks/useEditor.js';
import { usePedigree } from '../src/hooks/usePedigree.js';
import { tinyStore } from './fixtures/graph.js';

function withStore(store = tinyStore()) {
  return {
    store,
    wrapper: ({ children }: { children: ReactNode }) => (
      <PedigreeProvider store={store}>{children}</PedigreeProvider>
    ),
  };
}

describe('useEditor — per-individual edits', () => {
  it('setSex dispatches and updates state', () => {
    const { wrapper, store } = withStore();
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() => result.current.setSex('m', Sex.Male));
    expect(store.getState().graph.individuals.m?.semantics.sex).toBe(Sex.Male);
  });

  it('setVital, upsertCondition, removeCondition, setCarrier, setAdopted dispatch', () => {
    const { wrapper, store } = withStore();
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() => result.current.setVital('m', VitalStatus.Deceased));
    act(() =>
      result.current.upsertCondition('m', {
        code: 'C1',
        status: AffectedStatus.Affected,
      }),
    );
    act(() => result.current.setCarrier('m', CarrierStatus.Carrier));
    act(() => result.current.setAdopted('m', Adopted.AdoptedIn));
    const m = store.getState().graph.individuals.m;
    expect(m?.semantics.vital).toBe(VitalStatus.Deceased);
    expect(m?.semantics.conditions[0]?.code).toBe('C1');
    expect(m?.semantics.carrier).toBe(CarrierStatus.Carrier);
    expect(m?.semantics.adopted).toBe(Adopted.AdoptedIn);
    act(() => result.current.removeCondition('m', 'C1'));
    expect(store.getState().graph.individuals.m?.semantics.conditions).toEqual([]);
  });

  it('setProband moves the proband flag', () => {
    const { wrapper, store } = withStore();
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() => result.current.setProband('m'));
    expect(store.getState().graph.proband).toBe('m');
  });
});

describe('useEditor — graph mutations', () => {
  it('addRelative inserts a new individual', () => {
    const { wrapper, store } = withStore();
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() =>
      result.current.addRelative({
        relativeOf: 'p',
        kind: 'sibling',
        newId: 'sib',
        sex: Sex.Male,
        name: 'Sib',
      }),
    );
    expect(store.getState().graph.individuals.sib?.name).toBe('Sib');
  });

  it('addRelative without name still works', () => {
    const { wrapper, store } = withStore();
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() =>
      result.current.addRelative({
        relativeOf: 'p',
        kind: 'sibling',
        newId: 'no-name',
        sex: Sex.Male,
      }),
    );
    expect(store.getState().graph.individuals['no-name']?.name).toBeUndefined();
  });

  it('removeIndividual drops the target', () => {
    const { wrapper, store } = withStore();
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() => result.current.removeIndividual('m'));
    expect(store.getState().graph.individuals.m).toBeUndefined();
  });
});

describe('useEditor — couple-level', () => {
  it('setConsanguineous flips the flag on the parent couple', () => {
    const { wrapper, store } = withStore();
    const { result } = renderHook(() => useEditor(), { wrapper });
    const coupleId = Object.keys(store.getState().graph.couples)[0] as string;
    act(() => result.current.setConsanguineous(coupleId, true));
    expect(store.getState().graph.couples[coupleId]?.consanguineous).toBe(true);
  });

  it('setTwin requires shared parents — no-op for proband-with-mother', () => {
    const { wrapper, store } = withStore();
    const before = store.getState().graph;
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() => result.current.setTwin(['p', 'm'], TwinType.Monozygotic, 'twin:x'));
    expect(store.getState().graph).toBe(before);
  });
});

describe('useEditor — undo/redo', () => {
  it('undo reverses the last edit; redo re-applies it', () => {
    const { wrapper, store } = withStore();
    const { result } = renderHook(() => useEditor(), { wrapper });
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.setSex('m', Sex.Male));
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(store.getState().graph.individuals.m?.semantics.sex).toBe(Sex.Female);
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.redo());
    expect(store.getState().graph.individuals.m?.semantics.sex).toBe(Sex.Male);
  });
});

describe('useEditor — interaction with usePedigree', () => {
  it('edits trigger usePedigree to recompute layout', () => {
    const { wrapper } = withStore();
    const { result } = renderHook(() => ({ editor: useEditor(), pedigree: usePedigree() }), {
      wrapper,
    });
    const beforeNodes = result.current.pedigree.layout.nodes.length;
    act(() =>
      result.current.editor.addRelative({
        relativeOf: 'p',
        kind: 'sibling',
        newId: 'newkid',
        sex: Sex.Male,
      }),
    );
    expect(result.current.pedigree.layout.nodes.length).toBeGreaterThan(beforeNodes);
  });
});
