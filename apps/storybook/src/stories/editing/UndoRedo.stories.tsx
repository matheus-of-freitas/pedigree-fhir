import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditingPedigreeView } from '../../components/EditingPedigreeView.js';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta<typeof EditingPedigreeView> = {
  title: 'Editing/Undo and redo',
  component: EditingPedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          'Linear history: every edit pushes to past, undo restores, editing after undo discards the redo trail. Capped at 50 entries.',
      },
    },
  },
};

export default meta;

export const HistoryWalkthrough: StoryObj<typeof EditingPedigreeView> = {
  args: { fixture: threeGen },
};
