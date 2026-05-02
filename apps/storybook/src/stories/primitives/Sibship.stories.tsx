import { createPedigreeStore, inferRelationships, parsePedigree } from '@pedigree-fhir/core';
import { Pedigree, PedigreeProvider, Sibship } from '@pedigree-fhir/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo } from 'react';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta = {
  title: 'Primitives/Sibship',
  component: Sibship,
  parameters: {
    docs: {
      description: {
        component:
          'Per-couple parent-drop render-prop (the vertical-then-horizontal connector that ties parents to their children).',
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

export const ParentDrops: StoryObj = {
  render: () => (
    <Frame>
      <Pedigree>
        {({ layout }) => (
          <svg
            viewBox={`${layout.bounds.minX - 30} ${layout.bounds.minY - 30} ${layout.bounds.width + 60} ${layout.bounds.height + 60}`}
            style={{ width: 600 }}
          >
            <title>&lt;Sibship&gt; primitive</title>
            {layout.parentDrops.map((drop) => (
              <Sibship key={drop.coupleId} coupleId={drop.coupleId}>
                {(d) => (
                  <path
                    d={d.path}
                    stroke="var(--pedigree-stroke)"
                    strokeWidth="var(--pedigree-stroke-width)"
                    fill="none"
                  />
                )}
              </Sibship>
            ))}
          </svg>
        )}
      </Pedigree>
    </Frame>
  ),
};
