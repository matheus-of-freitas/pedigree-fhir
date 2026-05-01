import type { PedigreeStore } from '@pedigree/core';
import { type ReactNode, createContext, useContext } from 'react';

const PedigreeStoreContext = createContext<PedigreeStore | null>(null);

export interface PedigreeProviderProps {
  store: PedigreeStore;
  children: ReactNode;
}

/**
 * Wrap your tree in a `PedigreeProvider` to expose the store via hooks. Only
 * `store` is required — consumers create the store with
 * `createPedigreeStore` from `@pedigree/core` and choose how to memoise it.
 */
export function PedigreeProvider({ store, children }: PedigreeProviderProps) {
  return <PedigreeStoreContext.Provider value={store}>{children}</PedigreeStoreContext.Provider>;
}

/**
 * Returns the underlying store. Throws if called outside a `PedigreeProvider`.
 * Most consumers should reach for the higher-level `usePedigree` instead.
 */
export function usePedigreeStore(): PedigreeStore {
  const store = useContext(PedigreeStoreContext);
  if (store === null) {
    throw new Error(
      '@pedigree/react: usePedigreeStore() must be called inside a <PedigreeProvider>.',
    );
  }
  return store;
}
