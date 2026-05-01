import type { Meta, StoryObj } from '@storybook/react-vite';
import { PedigreeView } from '../../components/PedigreeView.js';
import { probandOnly } from '../../fixtures/three-gen.js';

const meta: Meta<typeof PedigreeView> = {
  title: 'Compositions/Proband only',
  component: PedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          'A graph with just the proband — the simplest possible state. No parent couple is fabricated, no edges are emitted.',
      },
    },
  },
};

export default meta;

export const JustTheProband: StoryObj<typeof PedigreeView> = {
  args: { fixture: probandOnly },
};
