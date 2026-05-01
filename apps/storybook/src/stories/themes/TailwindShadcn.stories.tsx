import type { Meta, StoryObj } from '@storybook/react-vite';
import { PedigreeView } from '../../components/PedigreeView.js';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta<typeof PedigreeView> = {
  title: 'Themes/Tailwind shadcn',
  component: PedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          'Tailwind / shadcn-style palette. Slate stroke, white fills, red-600 affected. The palette stays in CSS vars so consumers can wire any utility class scheme.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj<typeof PedigreeView> = {
  globals: { theme: 'tailwind' },
  args: { fixture: threeGen },
};
