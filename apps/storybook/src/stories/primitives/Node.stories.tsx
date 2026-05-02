import { createPedigreeStore, inferRelationships, parsePedigree } from '@pedigree-fhir/core';
import { Node, Pedigree, PedigreeProvider } from '@pedigree-fhir/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo } from 'react';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta = {
  title: 'Primitives/Node',
  component: Node,
  parameters: {
    docs: {
      description: {
        component:
          'Per-individual render-prop. Looks up position + semantics for `id`; falls back to `fallback` when the id has no layout entry.',
      },
    },
  },
};

export default meta;

function Frame({ children }: { children: React.ReactNode }) {
  const store = useMemo(() => {
    const graph = inferRelationships(parsePedigree(threeGen.patient, threeGen.familyHistory));
    return createPedigreeStore({ graph, layoutOptions: {} });
  }, []);
  return <PedigreeProvider store={store}>{children}</PedigreeProvider>;
}

export const RenderProp: StoryObj = {
  render: () => (
    <Frame>
      <Pedigree>
        {({ layout }) => (
          <svg
            viewBox={`${layout.bounds.minX - 30} ${layout.bounds.minY - 30} ${layout.bounds.width + 60} ${layout.bounds.height + 60}`}
            style={{ width: 600 }}
          >
            <title>Just &lt;Node&gt; usage</title>
            {layout.nodes.map((n) => (
              <Node key={n.id} id={n.id}>
                {({ individual, position }) => (
                  <g transform={`translate(${position.x} ${position.y})`}>
                    <circle r={12} fill="var(--pedigree-fill)" stroke="var(--pedigree-stroke)" />
                    <text y={26} textAnchor="middle" fontSize={9} fill="var(--pedigree-text)">
                      {individual.id}
                    </text>
                  </g>
                )}
              </Node>
            ))}
          </svg>
        )}
      </Pedigree>
    </Frame>
  ),
};

export const FallbackForUnknownId: StoryObj = {
  render: () => (
    <Frame>
      <div style={{ color: 'var(--pedigree-text)', fontSize: 14 }}>
        <Node id="does-not-exist" fallback={<span>Fallback content (id was not found)</span>}>
          {() => <span>This branch never renders.</span>}
        </Node>
      </div>
    </Frame>
  ),
};
