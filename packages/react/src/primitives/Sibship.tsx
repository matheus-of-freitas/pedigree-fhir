import type { CoupleId, ParentDrop } from '@pedigree/core';
import type { ReactNode } from 'react';
import { useDrop } from '../hooks/useDrop.js';

export interface SibshipProps {
  coupleId: CoupleId;
  children: (drop: ParentDrop) => ReactNode;
  fallback?: ReactNode;
}

export function Sibship({ coupleId, children, fallback = null }: SibshipProps) {
  const drop = useDrop(coupleId);
  if (drop === null) return <>{fallback}</>;
  return <>{children(drop)}</>;
}
