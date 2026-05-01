import type { Meta, StoryObj } from '@storybook/react-vite';
import { InteractivePedigreeView } from '../../components/InteractivePedigreeView.js';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta<typeof InteractivePedigreeView> = {
  title: 'Interactivity/Selection',
  component: InteractivePedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          'Click any node (or focus + Enter) to select it. The selected node renders a dashed ring, and the inspector below shows the selected id with a clear button.',
      },
    },
  },
};

export default meta;

export const ClickToSelect: StoryObj<typeof InteractivePedigreeView> = {
  args: { fixture: threeGen, showCompactToggles: false },
};
