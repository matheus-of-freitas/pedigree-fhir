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
          'Select a node, then add a sibling or child via the toolbar. Child edits fabricate a partner when needed, and the layout reflows to show the new descendant row automatically.',
      },
    },
  },
};

export default meta;

export const AddSiblingOrChild: StoryObj<typeof EditingPedigreeView> = {
  args: {
    fixture: threeGen,
    showRelativeLabels: true,
  },
};

export const AddSiblingOrChildWithRelativeLabels: StoryObj<typeof EditingPedigreeView> = {
  args: { fixture: threeGen, showRelativeLabels: true },
};
