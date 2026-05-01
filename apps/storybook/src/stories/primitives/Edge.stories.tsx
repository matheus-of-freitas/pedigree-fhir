import { createPedigreeStore, inferRelationships, parsePedigree } from '@pedigree/core';
import { Edge, Pedigree, PedigreeProvider } from '@pedigree/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo } from 'react';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta = {
  title: 'Primitives/Edge',
  component: Edge,
  parameters: {
    docs: {
      description: {
        component:
          'Per-couple partner-edge render-prop. Receives the full `PartnerEdge` record (path, midpoint, partner ids).',
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

export const StyledPartnerLine: StoryObj = {
  render: () => (
    <Frame>
      <Pedigree>
        {({ layout }) => (
          <svg
            viewBox={`${layout.bounds.minX - 30} ${layout.bounds.minY - 30} ${layout.bounds.width + 60} ${layout.bounds.height + 60}`}
            style={{ width: 600 }}
          >
            <title>&lt;Edge&gt; primitive</title>
            {layout.partnerEdges.map((edge) => (
              <Edge key={edge.coupleId} coupleId={edge.coupleId}>
                {(e) => (
                  <g>
                    <path
                      d={e.path}
                      stroke="var(--pedigree-stroke)"
                      strokeWidth="var(--pedigree-stroke-width)"
                      fill="none"
                    />
                    <circle
                      cx={e.midpoint.x}
                      cy={e.midpoint.y}
                      r={3}
                      fill="var(--pedigree-affected)"
                    />
                  </g>
                )}
              </Edge>
            ))}
          </svg>
        )}
      </Pedigree>
    </Frame>
  ),
};
