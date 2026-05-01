import type { ReactNode } from 'react';
import { type PedigreeTokens, tokensToCssVars } from './tokens.js';

const tokens: PedigreeTokens = {
  bg: '#fbf7ed',
  stroke: '#1f2933',
  fill: '#fffdf7',
  affected: '#8f1d14',
  proband: '#1f2933',
  text: '#1f2933',
  strokeWidth: '1.5',
  probandStrokeWidth: '3',
  fontFamily: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
};

/** Plain CSS / vanilla baseline with warm print-style chart chrome. */
export function MinimalProvider({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ...tokensToCssVars(tokens),
        background:
          'radial-gradient(circle at 18px 18px, rgba(31, 41, 51, 0.08) 1px, transparent 1.5px), var(--pedigree-bg)',
        backgroundSize: '24px 24px',
        color: 'var(--pedigree-text)',
        padding: 28,
        borderRadius: 6,
        border: '1px solid #d8cdb8',
        boxShadow: '0 14px 32px rgba(31, 41, 51, 0.08)',
      }}
    >
      {children}
    </div>
  );
}
