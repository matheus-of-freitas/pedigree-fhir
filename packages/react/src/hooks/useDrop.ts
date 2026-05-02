import type { CoupleId, ParentDrop } from '@pedigree-fhir/core';
import { usePedigree } from './usePedigree.js';

/** Look up the parent-drop layout entry for a couple. Returns `null` if absent. */
export function useDrop(coupleId: CoupleId): ParentDrop | null {
  const { layout } = usePedigree();
  return layout.parentDrops.find((d) => d.coupleId === coupleId) ?? null;
}
