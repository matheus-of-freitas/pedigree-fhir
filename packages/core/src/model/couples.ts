import type { Couple, CoupleId, IndividualId } from './types.js';

export function findCoupleOf(
  couples: Record<CoupleId, Couple>,
  id: IndividualId,
): { coupleId: CoupleId; partnerId: IndividualId } | undefined {
  for (const [coupleId, couple] of Object.entries(couples)) {
    const [a, b] = couple.partners;
    if (a === id) return { coupleId: coupleId as CoupleId, partnerId: b };
    if (b === id) return { coupleId: coupleId as CoupleId, partnerId: a };
  }
  return undefined;
}
