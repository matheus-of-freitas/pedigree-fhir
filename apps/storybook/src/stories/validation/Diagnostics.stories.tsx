import type { Meta, StoryObj } from '@storybook/react-vite';
import { ValidationPedigreeView } from '../../components/ValidationPedigreeView.js';
import { incomplete, malformedInput, threeGen } from '../../fixtures/three-gen.js';

const meta: Meta<typeof ValidationPedigreeView> = {
  title: 'Validation/Diagnostics',
  component: ValidationPedigreeView,
};

export default meta;

export const IncompleteFamilyHistory: StoryObj<typeof ValidationPedigreeView> = {
  args: { fixture: incomplete },
};

export const CompleteFamilyHistory: StoryObj<typeof ValidationPedigreeView> = {
  args: { fixture: threeGen },
};

export const MalformedSourceData: StoryObj<typeof ValidationPedigreeView> = {
  args: { fixture: malformedInput },
};
