import type { Meta, StoryObj } from '@storybook/react-vite';
import { InteractivePedigreeView } from '../../components/InteractivePedigreeView.js';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta<typeof InteractivePedigreeView> = {
  title: 'Interactivity/Combined',
  component: InteractivePedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          "Selection + compact toggles in the same view. Selecting a hidden relative is impossible (they're absent from the layout), but selections persist when toggling compact since selection lives on the graph, not the layout.",
      },
    },
  },
};

export default meta;

export const SelectionPlusCompact: StoryObj<typeof InteractivePedigreeView> = {
  args: { fixture: threeGen, showCompactToggles: true },
};
