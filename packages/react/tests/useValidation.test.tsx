import { Severity, Sex, createRegistry } from '@pedigree/core';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { PedigreeProvider } from '../src/context.js';
import { useEditor } from '../src/hooks/useEditor.js';
import { useValidation } from '../src/hooks/useValidation.js';
import { tinyStore } from './fixtures/graph.js';

function withStore(store = tinyStore()) {
  return {
    store,
    wrapper: ({ children }: { children: ReactNode }) => (
      <PedigreeProvider store={store}>{children}</PedigreeProvider>
    ),
  };
}

describe('useValidation', () => {
  it('runs the default registry against the current graph', () => {
    const { wrapper } = withStore();
    const { result } = renderHook(() => useValidation(), { wrapper });
    expect(result.current.registry.list().map((rule) => rule.id)).toContain('completeness');
    expect(result.current.diagnostics.map((d) => d.code)).toContain(
      'completeness/grandparents-missing',
    );
  });

  it('recomputes diagnostics after graph edits', () => {
    const { wrapper } = withStore();
    const { result } = renderHook(() => ({ editor: useEditor(), validation: useValidation() }), {
      wrapper,
    });
    expect(result.current.validation.diagnostics.map((d) => d.code)).not.toContain(
      'consistency/sex-mismatch',
    );

    act(() => result.current.editor.setSex('m', Sex.Male));

    expect(result.current.validation.diagnostics.map((d) => d.code)).toContain(
      'consistency/sex-mismatch',
    );
  });

  it('uses a custom registry when supplied', () => {
    const registry = createRegistry([
      {
        id: 'custom',
        run: () => [
          {
            code: 'custom/diagnostic',
            severity: Severity.Info,
            message: 'custom',
            individualIds: [],
          },
        ],
      },
    ]);
    const { wrapper } = withStore();
    const { result } = renderHook(() => useValidation(registry), { wrapper });

    expect(result.current.registry).toBe(registry);
    expect(result.current.diagnostics).toEqual([
      {
        code: 'custom/diagnostic',
        severity: Severity.Info,
        message: 'custom',
        individualIds: [],
      },
    ]);
  });
});
