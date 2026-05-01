import type {
  Adopted,
  CarrierStatus,
  ConditionRecord,
  CoupleId,
  IndividualId,
  RelativeKind,
  Sex,
  TwinType,
  VitalStatus,
} from '@pedigree/core';
import { canRedo, canUndo } from '@pedigree/core';
import { useSyncExternalStore } from 'react';
import { usePedigreeStore } from '../context.js';

export interface UseEditorResult {
  // Per-individual semantics.
  setSex: (id: IndividualId, sex: Sex) => void;
  setVital: (id: IndividualId, vital: VitalStatus) => void;
  upsertCondition: (id: IndividualId, condition: ConditionRecord) => void;
  removeCondition: (id: IndividualId, code: string) => void;
  setCarrier: (id: IndividualId, carrier: CarrierStatus) => void;
  setAdopted: (id: IndividualId, adopted: Adopted) => void;
  setProband: (id: IndividualId) => void;
  // Graph mutations.
  addRelative: (args: {
    relativeOf: IndividualId;
    kind: RelativeKind;
    newId: IndividualId;
    sex: Sex;
    name?: string;
  }) => void;
  removeIndividual: (id: IndividualId) => void;
  // Couple-level.
  setConsanguineous: (coupleId: CoupleId, consanguineous: boolean) => void;
  setTwin: (ids: readonly IndividualId[], type: TwinType, groupId: string) => void;
  // History.
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Editor surface aggregating M3 actions plus undo/redo. Pure dispatch — no
 * derived state beyond canUndo/canRedo. Convenient single-import for stories
 * and consumers.
 */
export function useEditor(): UseEditorResult {
  const store = usePedigreeStore();
  const history = useSyncExternalStore(store.subscribe, () => store.getState().history);
  return {
    setSex: (id, sex) => store.dispatch({ type: 'setSex', id, sex }),
    setVital: (id, vital) => store.dispatch({ type: 'setVital', id, vital }),
    upsertCondition: (id, condition) => store.dispatch({ type: 'upsertCondition', id, condition }),
    removeCondition: (id, code) => store.dispatch({ type: 'removeCondition', id, code }),
    setCarrier: (id, carrier) => store.dispatch({ type: 'setCarrier', id, carrier }),
    setAdopted: (id, adopted) => store.dispatch({ type: 'setAdopted', id, adopted }),
    setProband: (id) => store.dispatch({ type: 'setProband', id }),
    addRelative: (args) =>
      store.dispatch({
        type: 'addRelative',
        relativeOf: args.relativeOf,
        kind: args.kind,
        newId: args.newId,
        sex: args.sex,
        ...(args.name === undefined ? {} : { name: args.name }),
      }),
    removeIndividual: (id) => store.dispatch({ type: 'removeIndividual', id }),
    setConsanguineous: (coupleId, consanguineous) =>
      store.dispatch({ type: 'setConsanguineous', coupleId, consanguineous }),
    setTwin: (ids, type, groupId) => store.dispatch({ type: 'setTwin', ids, type_: type, groupId }),
    undo: () => store.dispatch({ type: 'undo' }),
    redo: () => store.dispatch({ type: 'redo' }),
    canUndo: canUndo(history),
    canRedo: canRedo(history),
  };
}
