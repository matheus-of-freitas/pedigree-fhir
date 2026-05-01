import { Card, MantineProvider as MantineCoreProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import type { ReactNode } from 'react';
import { type PedigreeTokens, tokensToCssVars } from './tokens.js';

const mantineTheme = createTheme({
  primaryColor: 'teal',
  fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
  defaultRadius: 'lg',
});

const tokens: PedigreeTokens = {
  bg: 'var(--mantine-color-teal-0, #e6fcf5)',
  stroke: 'var(--mantine-color-dark-8, #141517)',
  fill: 'var(--mantine-color-white, #ffffff)',
  affected: 'var(--mantine-color-orange-7, #f76707)',
  proband: 'var(--mantine-color-teal-8, #087f5b)',
  text: 'var(--mantine-color-dark-7, #1a1b1e)',
  strokeWidth: '1.75',
  probandStrokeWidth: '3',
  fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
};

export function MantineProvider({ children }: { children: ReactNode }) {
  return (
    <MantineCoreProvider theme={mantineTheme}>
      <div
        style={{
          ...tokensToCssVars(tokens),
          background:
            'linear-gradient(160deg, var(--mantine-color-teal-0, #e6fcf5), var(--mantine-color-orange-0, #fff4e6))',
          borderRadius: 22,
          padding: 28,
        }}
      >
        <Card shadow="lg" padding="xl" radius="lg" withBorder>
          {children}
        </Card>
      </div>
    </MantineCoreProvider>
  );
}
