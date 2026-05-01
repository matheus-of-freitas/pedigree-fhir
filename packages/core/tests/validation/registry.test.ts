import { describe, expect, it } from 'vitest';
import { defaultRegistry } from '../../src/validation/index.js';
import { createRegistry } from '../../src/validation/registry.js';
import { type Diagnostic, type Rule, Severity } from '../../src/validation/types.js';
import { graph, individual } from './test-helpers.js';

function diagnostic(code: string): Diagnostic {
  return { code, severity: Severity.Info, message: code, individualIds: [] };
}

function rule(id: string, code = id): Rule {
  return { id, run: () => [diagnostic(code)] };
}

describe('createRegistry', () => {
  it('lists and runs rules in declaration order', () => {
    const registry = createRegistry([rule('a'), rule('b')]);
    expect(registry.list().map((r) => r.id)).toEqual(['a', 'b']);
    expect(registry.validate(graph({ proband: individual('p') })).map((d) => d.code)).toEqual([
      'a',
      'b',
    ]);
  });

  it('dedupes by id, keeping the replacement rule', () => {
    const registry = createRegistry([rule('a', 'first'), rule('a', 'second')]);
    expect(registry.list()).toHaveLength(1);
    expect(registry.validate(graph({ proband: individual('p') }))).toEqual([diagnostic('second')]);
  });

  it('with replaces an existing rule and appends it to the end', () => {
    const registry = createRegistry([rule('a'), rule('b')]).with(rule('a', 'replacement'));
    expect(registry.list().map((r) => r.id)).toEqual(['b', 'a']);
    expect(registry.validate(graph({ proband: individual('p') })).map((d) => d.code)).toEqual([
      'b',
      'replacement',
    ]);
  });

  it('without removes a rule without mutating the original registry', () => {
    const registry = createRegistry([rule('a'), rule('b')]);
    const next = registry.without('a');
    expect(next.list().map((r) => r.id)).toEqual(['b']);
    expect(registry.list().map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('defaultRegistry', () => {
  it('includes all built-in rules in stable order', () => {
    expect(
      defaultRegistry()
        .list()
        .map((r) => r.id),
    ).toEqual(['completeness', 'consistency/sex-relationship', 'cycles', 'unknown-codes']);
  });
});
