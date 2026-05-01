import type { Preview } from '@storybook/react-vite';
import type { ComponentType, ReactNode } from 'react';
import { MantineProvider } from '../src/themes/mantine.js';
import { MinimalProvider } from '../src/themes/minimal.js';
import { RadixProvider } from '../src/themes/radix.js';
import { TailwindProvider } from '../src/themes/tailwind.js';

type ProviderComponent = ComponentType<{ children: ReactNode }>;

const PROVIDERS: Record<string, ProviderComponent> = {
  minimal: MinimalProvider,
  tailwind: TailwindProvider,
  mantine: MantineProvider,
  radix: RadixProvider,
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'UI kit driving the surrounding chrome and SVG token values',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'minimal', title: 'Minimal CSS' },
          { value: 'tailwind', title: 'Tailwind / shadcn' },
          { value: 'mantine', title: 'Mantine' },
          { value: 'radix', title: 'Radix Themes' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'minimal' },
  decorators: [
    (Story, context) => {
      const themeName = (context.globals.theme as string) ?? 'minimal';
      const Provider = PROVIDERS[themeName] ?? PROVIDERS.minimal;
      if (Provider === undefined) return <Story />;
      return (
        <Provider>
          <Story />
        </Provider>
      );
    },
  ],
  parameters: {
    controls: {
      expanded: true,
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    layout: 'padded',
  },
};

export default preview;
