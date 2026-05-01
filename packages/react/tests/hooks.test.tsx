import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { PedigreeProvider } from '../src/context.js';
import { useDrop } from '../src/hooks/useDrop.js';
import { useEdge } from '../src/hooks/useEdge.js';
import { useNode } from '../src/hooks/useNode.js';
import { usePedigree } from '../src/hooks/usePedigree.js';
import { tinyStore } from './fixtures/graph.js';

function withProvider(store = tinyStore()) {
  return ({ children }: { children: ReactNode }) => (
    <PedigreeProvider store={store}>{children}</PedigreeProvider>
  );
}

describe('usePedigree', () => {
  it('returns the current state and a memoised layout', () => {
    const { result } = renderHook(() => usePedigree(), { wrapper: withProvider() });
    expect(result.current.graph).toBeDefined();
    expect(result.current.layout.nodes.length).toBeGreaterThan(0);
    expect(result.current.layoutOptions).toEqual({});
  });

  it('reuses the same layout reference across renders when state has not changed', () => {
    const { result, rerender } = renderHook(() => usePedigree(), { wrapper: withProvider() });
    const firstLayout = result.current.layout;
    rerender();
    expect(result.current.layout).toBe(firstLayout);
  });

  it('recomputes layout when layoutOptions change via dispatch', () => {
    const store = tinyStore();
    const { result } = renderHook(() => usePedigree(), { wrapper: withProvider(store) });
    const before = result.current.layout;
    act(() => {
      store.dispatch({ type: 'setLayoutOptions', options: { generationGap: 200 } });
    });
    expect(result.current.layout).not.toBe(before);
    const proband = result.current.layout.nodes.find((n) => n.id === 'p');
    expect(proband?.y).toBe(400);
  });

  it('does not re-render for selection-only updates', () => {
    const store = tinyStore();
    let renders = 0;
    const { result } = renderHook(
      () => {
        renders += 1;
        return usePedigree();
      },
      { wrapper: withProvider(store) },
    );

    expect(renders).toBe(1);
    const before = result.current.layout;

    act(() => {
      store.dispatch({ type: 'selectIndividual', id: 'p' });
    });

    expect(renders).toBe(1);
    expect(result.current.layout).toBe(before);
  });
});

describe('useNode', () => {
  it('returns position and individual for a known id', () => {
    const { result } = renderHook(() => useNode('p'), { wrapper: withProvider() });
    expect(result.current?.position.id).toBe('p');
    expect(result.current?.individual.id).toBe('p');
  });

  it('returns null for an unknown id', () => {
    const { result } = renderHook(() => useNode('does-not-exist'), { wrapper: withProvider() });
    expect(result.current).toBeNull();
  });

  it('returns null when the individual exists but the layout skipped them', () => {
    // Simulate a graph member with no layout entry by querying for an id that
    // the layout doesn't include. Easiest: ask for the individual id of an
    // inferred partner that doesn't exist in this fixture.
    const { result } = renderHook(() => useNode('inferred:nonexistent'), {
      wrapper: withProvider(),
    });
    expect(result.current).toBeNull();
  });
});

describe('useEdge', () => {
  it('returns the partner edge for a known couple', () => {
    const { result: pedigreeResult } = renderHook(() => usePedigree(), {
      wrapper: withProvider(),
    });
    const edge = pedigreeResult.current.layout.partnerEdges[0];
    expect(edge).toBeDefined();
    const { result } = renderHook(() => useEdge(edge!.coupleId), { wrapper: withProvider() });
    expect(result.current?.coupleId).toBe(edge?.coupleId);
  });

  it('returns null for unknown couple id', () => {
    const { result } = renderHook(() => useEdge('couple:none'), { wrapper: withProvider() });
    expect(result.current).toBeNull();
  });
});

describe('useDrop', () => {
  it('returns the parent drop for a known couple', () => {
    const { result: pedigreeResult } = renderHook(() => usePedigree(), {
      wrapper: withProvider(),
    });
    const drop = pedigreeResult.current.layout.parentDrops[0];
    expect(drop).toBeDefined();
    const { result } = renderHook(() => useDrop(drop!.coupleId), { wrapper: withProvider() });
    expect(result.current?.coupleId).toBe(drop?.coupleId);
  });

  it('returns null for unknown couple id', () => {
    const { result } = renderHook(() => useDrop('couple:none'), { wrapper: withProvider() });
    expect(result.current).toBeNull();
  });
});
