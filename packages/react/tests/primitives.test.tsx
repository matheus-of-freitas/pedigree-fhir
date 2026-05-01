import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PedigreeProvider } from '../src/context.js';
import { Edge } from '../src/primitives/Edge.js';
import { Node } from '../src/primitives/Node.js';
import { Pedigree } from '../src/primitives/Pedigree.js';
import { Sibship } from '../src/primitives/Sibship.js';
import { tinyStore } from './fixtures/graph.js';

describe('<Pedigree>', () => {
  it('passes graph + layout to the consumer render fn', () => {
    render(
      <PedigreeProvider store={tinyStore()}>
        <Pedigree>
          {({ layout }) => <div data-testid="count">nodes:{layout.nodes.length}</div>}
        </Pedigree>
      </PedigreeProvider>,
    );
    expect(screen.getByTestId('count').textContent).toBe('nodes:3');
  });
});

describe('<Node>', () => {
  it('renders the consumer render fn for a known id', () => {
    render(
      <PedigreeProvider store={tinyStore()}>
        <Node id="p">
          {({ individual, position }) => (
            <span data-testid="proband">
              {individual.id}@{position.x},{position.y}
            </span>
          )}
        </Node>
      </PedigreeProvider>,
    );
    expect(screen.getByTestId('proband').textContent).toBe('p@0,240');
  });

  it('renders the fallback when the id is unknown', () => {
    render(
      <PedigreeProvider store={tinyStore()}>
        <Node id="ghost" fallback={<span data-testid="missing">missing</span>}>
          {() => <span data-testid="present">present</span>}
        </Node>
      </PedigreeProvider>,
    );
    expect(screen.getByTestId('missing')).toBeDefined();
    expect(screen.queryByTestId('present')).toBeNull();
  });

  it('renders nothing when the id is unknown and no fallback is supplied', () => {
    const { container } = render(
      <PedigreeProvider store={tinyStore()}>
        <Node id="ghost">{() => <span data-testid="present">x</span>}</Node>
      </PedigreeProvider>,
    );
    expect(container.querySelector('[data-testid="present"]')).toBeNull();
  });
});

describe('<Edge>', () => {
  it('renders the consumer render fn with the partner edge', () => {
    const store = tinyStore();
    const coupleId = Object.keys(store.getState().graph.couples)[0] as string;
    render(
      <PedigreeProvider store={store}>
        <Edge coupleId={coupleId}>{(edge) => <span data-testid="edge">{edge.path}</span>}</Edge>
      </PedigreeProvider>,
    );
    expect(screen.getByTestId('edge').textContent).toContain('M ');
  });

  it('renders the fallback when the couple is unknown', () => {
    render(
      <PedigreeProvider store={tinyStore()}>
        <Edge coupleId="couple:none" fallback={<span data-testid="missing-edge" />}>
          {() => <span data-testid="present-edge" />}
        </Edge>
      </PedigreeProvider>,
    );
    expect(screen.getByTestId('missing-edge')).toBeDefined();
  });

  it('renders nothing when the couple is unknown and no fallback supplied', () => {
    const { container } = render(
      <PedigreeProvider store={tinyStore()}>
        <Edge coupleId="couple:none">{() => <span data-testid="ohno" />}</Edge>
      </PedigreeProvider>,
    );
    expect(container.querySelector('[data-testid="ohno"]')).toBeNull();
  });
});

describe('<Sibship>', () => {
  it('renders the consumer render fn with the parent drop', () => {
    const store = tinyStore();
    const coupleId = Object.keys(store.getState().graph.couples)[0] as string;
    render(
      <PedigreeProvider store={store}>
        <Sibship coupleId={coupleId}>
          {(drop) => <span data-testid="drop">{drop.children.join(',')}</span>}
        </Sibship>
      </PedigreeProvider>,
    );
    expect(screen.getByTestId('drop').textContent).toContain('p');
  });

  it('renders the fallback when no drop matches', () => {
    render(
      <PedigreeProvider store={tinyStore()}>
        <Sibship coupleId="couple:none" fallback={<span data-testid="missing-drop" />}>
          {() => <span data-testid="present-drop" />}
        </Sibship>
      </PedigreeProvider>,
    );
    expect(screen.getByTestId('missing-drop')).toBeDefined();
  });

  it('renders nothing when no drop matches and no fallback', () => {
    const { container } = render(
      <PedigreeProvider store={tinyStore()}>
        <Sibship coupleId="couple:none">{() => <span data-testid="ohno-drop" />}</Sibship>
      </PedigreeProvider>,
    );
    expect(container.querySelector('[data-testid="ohno-drop"]')).toBeNull();
  });
});
