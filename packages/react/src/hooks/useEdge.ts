import type { CoupleId, PartnerEdge } from '@pedigree-fhir/core';
import { usePedigree } from './usePedigree.js';

/** Look up the partner-edge layout entry for a couple. Returns `null` if absent. */
export function useEdge(coupleId: CoupleId): PartnerEdge | null {
  const { layout } = usePedigree();
  return layout.partnerEdges.find((e) => e.coupleId === coupleId) ?? null;
}
