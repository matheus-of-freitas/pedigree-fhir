import { Card, Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import type { ReactNode } from 'react';
import { type PedigreeTokens, tokensToCssVars } from './tokens.js';

const tokens: PedigreeTokens = {
  bg: 'var(--sage-1, #fbfdfc)',
  stroke: 'var(--sage-12, #1a211e)',
  fill: 'var(--color-panel-solid, #ffffff)',
  affected: 'var(--tomato-9, #e54d2e)',
  proband: 'var(--jade-9, #29a383)',
  text: 'var(--sage-12, #1a211e)',
  strokeWidth: '1.5',
  probandStrokeWidth: '2.75',
  fontFamily: '"Optima", "Avenir Next", sans-serif',
};

export function RadixProvider({ children }: { children: ReactNode }) {
  return (
    <Theme accentColor="jade" grayColor="sage" radius="large" appearance="light">
      <div
        style={{
          ...tokensToCssVars(tokens),
          background:
            'conic-gradient(from 210deg at 18% 12%, rgba(41, 163, 131, 0.18), transparent 32%, rgba(229, 77, 46, 0.14), transparent 70%), var(--pedigree-bg)',
          borderRadius: 22,
          padding: 28,
        }}
      >
        <Card size="3">{children}</Card>
      </div>
    </Theme>
  );
}
