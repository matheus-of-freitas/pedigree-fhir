import type { Meta, StoryObj } from '@storybook/react-vite';
import { PedigreeView } from '../../components/PedigreeView.js';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta<typeof PedigreeView> = {
  title: 'Themes/Minimal CSS',
  component: PedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          'Plain CSS / vanilla baseline. No UI kit, no Tailwind — just CSS variables and high-contrast monochrome.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj<typeof PedigreeView> = {
  globals: { theme: 'minimal' },
  args: { fixture: threeGen },
};
