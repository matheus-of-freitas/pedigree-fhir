import type { Meta, StoryObj } from '@storybook/react-vite';
import { PedigreeView } from '../../components/PedigreeView.js';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta<typeof PedigreeView> = {
  title: 'Themes/Mantine',
  component: PedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          'Mantine 7 theming. SVG fills read from `--mantine-color-*` tokens; the chrome (Card) is a real Mantine component.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj<typeof PedigreeView> = {
  globals: { theme: 'mantine' },
  args: { fixture: threeGen },
};
