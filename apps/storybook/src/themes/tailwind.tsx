import type { ReactNode } from 'react';
import { type PedigreeTokens, tokensToCssVars } from './tokens.js';

/**
 * Tailwind / shadcn-style palette mapped onto our CSS-var contract. We don't
 * actually load Tailwind here (avoids a global reset that would fight the
 * Mantine / Radix CSS in sibling themes); instead we use the palette values
 * directly. Real consumers would write `fill="var(--pedigree-fill)"` in JSX
 * and ship Tailwind utility classes for the surrounding chrome.
 */
const tokens: PedigreeTokens = {
  bg: '#ecfeff', // cyan-50
  stroke: '#164e63', // cyan-900
  fill: '#ffffff',
  affected: '#ea580c', // orange-600
  proband: '#0f766e', // teal-700
  text: '#134e4a', // teal-900
  strokeWidth: '1.5',
  probandStrokeWidth: '2.5',
  fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
};

export function TailwindProvider({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ...tokensToCssVars(tokens),
        background:
          'linear-gradient(135deg, rgba(20, 184, 166, 0.18), rgba(255, 255, 255, 0.92) 42%, rgba(251, 146, 60, 0.18)), var(--pedigree-bg)',
        color: 'var(--pedigree-text)',
        padding: 28,
        borderRadius: 18,
        border: '1px solid rgba(20, 184, 166, 0.28)',
        boxShadow: '0 20px 48px rgba(15, 118, 110, 0.16)',
      }}
    >
      {children}
    </div>
  );
}
