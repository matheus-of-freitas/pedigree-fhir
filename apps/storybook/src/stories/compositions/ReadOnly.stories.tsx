import type { Meta, StoryObj } from '@storybook/react-vite';
import { PedigreeView } from '../../components/PedigreeView.js';
import { threeGen } from '../../fixtures/three-gen.js';

const meta: Meta<typeof PedigreeView> = {
  title: 'Compositions/Read-only',
  component: PedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          'The full 3-generation pedigree rendered against the standard fixture. This is the visual baseline most regression snapshots compare against.',
      },
    },
  },
};

export default meta;

export const FullThreeGeneration: StoryObj<typeof PedigreeView> = {
  args: { fixture: threeGen },
};
