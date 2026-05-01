import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditingPedigreeView } from '../../components/EditingPedigreeView.js';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta<typeof EditingPedigreeView> = {
  title: 'Editing/Add relative',
  component: EditingPedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          'Select a node, then add a sibling or child via the toolbar. The graph mutates in place; the layout reflows automatically.',
      },
    },
  },
};

export default meta;

export const AddSiblingOrChild: StoryObj<typeof EditingPedigreeView> = {
  args: { fixture: threeGen },
};
