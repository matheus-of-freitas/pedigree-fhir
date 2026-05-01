import type { Meta, StoryObj } from '@storybook/react-vite';
import { PedigreeView } from '../../components/PedigreeView.js';
import { maternalOnly } from '../../fixtures/three-gen.js';

const meta: Meta<typeof PedigreeView> = {
  title: 'Compositions/Partial graph',
  component: PedigreeView,
  parameters: {
    docs: {
      description: {
        component:
          "Maternal-side relatives only — the paternal grandparent couple is absent and the layout shouldn't fabricate it. Mother stays anchored on the right of her sibship; father is just an inferred placeholder with no parents.",
      },
    },
  },
};

export default meta;

export const MaternalSideOnly: StoryObj<typeof PedigreeView> = {
  args: { fixture: maternalOnly },
};
