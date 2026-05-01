import type { Meta, StoryObj } from '@storybook/react-vite';
import { InteractivePedigreeView } from '../../components/InteractivePedigreeView.js';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta<typeof InteractivePedigreeView> = {
  title: 'Interactivity/Compact mode',
  component: InteractivePedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          'Toggle aunts/uncles per side. Hidden relatives stay in the underlying graph (so editing actions still see them) but disappear from the layout.',
      },
    },
  },
};

export default meta;

export const ToggleAuntsUncles: StoryObj<typeof InteractivePedigreeView> = {
  args: { fixture: threeGen, showCompactToggles: true },
};
