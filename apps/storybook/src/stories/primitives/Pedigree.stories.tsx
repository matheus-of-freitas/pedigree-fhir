import { createPedigreeStore, inferRelationships, parsePedigree } from '@pedigree/core';
import { Pedigree, PedigreeProvider } from '@pedigree/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo } from 'react';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta = {
  title: 'Primitives/Pedigree',
  component: Pedigree,
  parameters: {
    docs: {
      description: {
        component:
          'Headless root primitive. Calls its child render fn with `{ graph, layout, layoutOptions }`. Renders nothing on its own.',
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

export const Default: StoryObj = {
  render: () => (
    <Frame>
      <Pedigree>
        {({ graph, layout }) => (
          <pre style={{ fontSize: 12, color: 'var(--pedigree-text)' }}>
            {`proband: ${graph.proband}
individuals: ${Object.keys(graph.individuals).length}
couples: ${Object.keys(graph.couples).length}
nodes: ${layout.nodes.length}
partner edges: ${layout.partnerEdges.length}
parent drops: ${layout.parentDrops.length}`}
          </pre>
        )}
      </Pedigree>
    </Frame>
  ),
};
