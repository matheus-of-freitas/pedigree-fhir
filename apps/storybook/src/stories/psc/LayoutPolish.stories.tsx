import type { Meta, StoryObj } from '@storybook/react-vite';
import { PscPedigreeView } from '../../components/PscPedigreeView.js';
import { pscPolishGraph } from '../../fixtures/psc-polish.js';

const graph = pscPolishGraph();

const meta: Meta<typeof PscPedigreeView> = {
  title: 'PSC/Layout polish',
  component: PscPedigreeView,
};

export default meta;

export const FullPscPolish: StoryObj<typeof PscPedigreeView> = {
  args: { graph },
};
