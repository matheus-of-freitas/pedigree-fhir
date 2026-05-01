import type { CoupleId, PartnerEdge } from '@pedigree/core';
import type { ReactNode } from 'react';
import { useEdge } from '../hooks/useEdge.js';

export interface EdgeProps {
  coupleId: CoupleId;
  children: (edge: PartnerEdge) => ReactNode;
  fallback?: ReactNode;
}

export function Edge({ coupleId, children, fallback = null }: EdgeProps) {
  const edge = useEdge(coupleId);
  if (edge === null) return <>{fallback}</>;
  return <>{children(edge)}</>;
}
