import type { Meta, StoryObj } from '@storybook/react-vite';
import { PedigreeView } from '../../components/PedigreeView.js';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta<typeof PedigreeView> = {
  title: 'Themes/Radix Themes',
  component: PedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          'Radix Themes 3.x. SVG fills read from Radix accent / gray scales; the chrome (Card) is a real Radix Themes component.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj<typeof PedigreeView> = {
  globals: { theme: 'radix' },
  args: { fixture: threeGen },
};
