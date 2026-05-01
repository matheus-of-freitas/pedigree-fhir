import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { PedigreeProvider } from '../src/context.js';
import { useCompact } from '../src/hooks/useCompact.js';
import { useSelection } from '../src/hooks/useSelection.js';
import { tinyStore } from './fixtures/graph.js';

function withProvider(store = tinyStore()) {
  return ({ children }: { children: ReactNode }) => (
    <PedigreeProvider store={store}>{children}</PedigreeProvider>
  );
}

describe('useSelection', () => {
  it('starts with no selection', () => {
    const { result } = renderHook(() => useSelection(), { wrapper: withProvider() });
    expect(result.current.selectedId).toBeUndefined();
  });

  it('selectIndividual updates the selectedId', () => {
    const { result } = renderHook(() => useSelection(), { wrapper: withProvider() });
    act(() => result.current.selectIndividual('p'));
    expect(result.current.selectedId).toBe('p');
  });

  it('clearSelection resets', () => {
    const { result } = renderHook(() => useSelection(), { wrapper: withProvider() });
    act(() => result.current.selectIndividual('m'));
    act(() => result.current.clearSelection());
    expect(result.current.selectedId).toBeUndefined();
  });

  it('toggleSelection selects when nothing is selected', () => {
    const { result } = renderHook(() => useSelection(), { wrapper: withProvider() });
    act(() => result.current.toggleSelection('m'));
    expect(result.current.selectedId).toBe('m');
  });

  it('toggleSelection clears when the same id is already selected', () => {
    const { result } = renderHook(() => useSelection(), { wrapper: withProvider() });
    act(() => result.current.selectIndividual('m'));
    act(() => result.current.toggleSelection('m'));
    expect(result.current.selectedId).toBeUndefined();
  });

  it('toggleSelection switches to the new id when a different one is selected', () => {
    const { result } = renderHook(() => useSelection(), { wrapper: withProvider() });
    act(() => result.current.selectIndividual('m'));
    act(() => result.current.toggleSelection('f'));
    expect(result.current.selectedId).toBe('f');
  });
});

describe('useCompact', () => {
  it('starts with both sides expanded by default', () => {
    const { result } = renderHook(() => useCompact(), { wrapper: withProvider() });
    expect(result.current.compact).toEqual({ maternal: false, paternal: false });
  });

  it('setCompact replaces the state', () => {
    const { result } = renderHook(() => useCompact(), { wrapper: withProvider() });
    act(() => result.current.setCompact({ maternal: true, paternal: false }));
    expect(result.current.compact).toEqual({ maternal: true, paternal: false });
  });

  it('toggle flips one side without touching the other', () => {
    const { result } = renderHook(() => useCompact(), { wrapper: withProvider() });
    act(() => result.current.toggle('maternal'));
    expect(result.current.compact).toEqual({ maternal: true, paternal: false });
    act(() => result.current.toggle('paternal'));
    expect(result.current.compact).toEqual({ maternal: true, paternal: true });
    act(() => result.current.toggle('maternal'));
    expect(result.current.compact).toEqual({ maternal: false, paternal: true });
  });
});
