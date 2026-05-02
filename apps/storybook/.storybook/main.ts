import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';

const here = fileURLToPath(new URL('..', import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  async viteFinal(config) {
    config.base = process.env.STORYBOOK_BASE_URL ?? '/';
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@pedigree/core': `${here}../../packages/core/src/index.ts`,
      '@pedigree/react': `${here}../../packages/react/src/index.ts`,
    };
    return config;
  },
};

export default config;
