import type { ReactNode } from 'react';
import { type UsePedigreeResult, usePedigree } from '../hooks/usePedigree.js';

export interface PedigreeProps {
  children: (state: UsePedigreeResult) => ReactNode;
}

/**
 * Headless root primitive. Renders nothing on its own — passes the current
 * `{ graph, layout, layoutOptions }` to the consumer's render function.
 */
export function Pedigree({ children }: PedigreeProps) {
  const state = usePedigree();
  return <>{children(state)}</>;
}
