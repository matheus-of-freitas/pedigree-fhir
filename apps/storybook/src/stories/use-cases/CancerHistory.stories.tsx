import type { Meta, StoryObj } from '@storybook/react-vite';
import { CancerHistoryPedigreeView } from '../../components/CancerHistoryPedigreeView.js';
import { familyCancerHistory } from '../../fixtures/cancer-history.js';

const meta: Meta<typeof CancerHistoryPedigreeView> = {
  title: 'Use cases/Family cancer history',
  component: CancerHistoryPedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          'A cancer-history-specific renderer profile built on the same headless pedigree model. The generic layout engine stays unchanged; consumers can opt into either a condition-detail profile or an oncology overlay profile with quartered cancer markers, legend, and age labels.',
      },
    },
  },
};

export default meta;

export const ConditionDetailProfile: StoryObj<typeof CancerHistoryPedigreeView> = {
  args: { fixture: familyCancerHistory },
};

export const OncologyOverlayProfile: StoryObj<typeof CancerHistoryPedigreeView> = {
  args: {
    fixture: familyCancerHistory,
    profile: 'oncology-overlay',
  },
};
