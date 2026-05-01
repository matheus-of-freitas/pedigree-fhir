import { render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PedigreeProvider, usePedigreeStore } from '../src/context.js';
import { tinyStore } from './fixtures/graph.js';

describe('PedigreeProvider / usePedigreeStore', () => {
  it('exposes the store via context', () => {
    const store = tinyStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PedigreeProvider store={store}>{children}</PedigreeProvider>
    );
    const { result } = renderHook(() => usePedigreeStore(), { wrapper });
    expect(result.current).toBe(store);
  });

  it('throws when usePedigreeStore is called outside the provider', () => {
    // Suppress the React error logging for the expected throw.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => usePedigreeStore())).toThrow(
      /must be called inside a <PedigreeProvider>/,
    );
    errorSpy.mockRestore();
  });

  it('renders children', () => {
    const store = tinyStore();
    const { container } = render(
      <PedigreeProvider store={store}>
        <span data-testid="child">hello</span>
      </PedigreeProvider>,
    );
    expect(container.querySelector('[data-testid="child"]')?.textContent).toBe('hello');
  });
});
