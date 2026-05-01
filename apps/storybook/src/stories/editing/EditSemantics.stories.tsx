import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditingPedigreeView } from '../../components/EditingPedigreeView.js';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta<typeof EditingPedigreeView> = {
  title: 'Editing/Edit semantics',
  component: EditingPedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          'Mark the selected individual as affected (adds a demo Condition) or deceased (slash overlay). Both edits push to history and can be undone.',
      },
    },
  },
};

export default meta;

export const MarkAffectedOrDeceased: StoryObj<typeof EditingPedigreeView> = {
  args: { fixture: threeGen },
};
