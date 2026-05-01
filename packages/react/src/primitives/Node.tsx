import type { IndividualId } from '@pedigree/core';
import type { ReactNode } from 'react';
import { type UseNodeResult, useNode } from '../hooks/useNode.js';

export interface NodeProps {
  id: IndividualId;
  children: (data: UseNodeResult) => ReactNode;
  /** Optional fallback when the id has no layout entry. Defaults to nothing. */
  fallback?: ReactNode;
}

export function Node({ id, children, fallback = null }: NodeProps) {
  const data = useNode(id);
  if (data === null) return <>{fallback}</>;
  return <>{children(data)}</>;
}
