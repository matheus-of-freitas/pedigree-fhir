import type { LayoutOptions } from '../layout/types.js';
import type { IndividualId, PedigreeGraph } from '../model/types.js';
import { type CoupleEditAction, applyCoupleEdit } from './couple-edits.js';
import { type IndividualEditAction, applyIndividualEdit } from './edits.js';
import { type GraphEditAction, applyGraphEdit } from './graph-edits.js';
import {
  type History,
  emptyHistory,
  recordEdit,
  redo as redoHistory,
  undo as undoHistory,
} from './history.js';

export interface PedigreeState {
  graph: PedigreeGraph;
  layoutOptions: LayoutOptions;
  /** The currently-selected individual, or `undefined` for no selection. */
  selectedId: IndividualId | undefined;
  /** Linear edit history. Non-edit actions (load, layout, selection) bypass it. */
  history: History<PedigreeGraph>;
}

/**
 * Action surface. M2 added selection; M3 adds editing + undo/redo.
 * Compact-mode toggling rides on top of `setLayoutOptions` since it's a
 * purely visual switch.
 */
export type PedigreeAction =
  | { type: 'load'; graph: PedigreeGraph }
  | { type: 'setLayoutOptions'; options: LayoutOptions }
  | { type: 'selectIndividual'; id: IndividualId }
  | { type: 'clearSelection' }
  | { type: 'undo' }
  | { type: 'redo' }
  | IndividualEditAction
  | GraphEditAction
  | CoupleEditAction;

const INDIVIDUAL_EDIT_TYPES = new Set<IndividualEditAction['type']>([
  'setSex',
  'setVital',
  'upsertCondition',
  'removeCondition',
  'setCarrier',
  'setAdopted',
  'setProband',
]);

const GRAPH_EDIT_TYPES = new Set<GraphEditAction['type']>(['addRelative', 'removeIndividual']);

const COUPLE_EDIT_TYPES = new Set<CoupleEditAction['type']>(['setConsanguineous', 'setTwin']);

function isIndividualEdit(action: PedigreeAction): action is IndividualEditAction {
  return INDIVIDUAL_EDIT_TYPES.has(action.type as IndividualEditAction['type']);
}

function isGraphEdit(action: PedigreeAction): action is GraphEditAction {
  return GRAPH_EDIT_TYPES.has(action.type as GraphEditAction['type']);
}

function isCoupleEdit(action: PedigreeAction): action is CoupleEditAction {
  return COUPLE_EDIT_TYPES.has(action.type as CoupleEditAction['type']);
}

type AnyEditAction = IndividualEditAction | GraphEditAction | CoupleEditAction;

function applyEdit(graph: PedigreeGraph, action: AnyEditAction): PedigreeGraph {
  if (isIndividualEdit(action)) return applyIndividualEdit(graph, action);
  if (isGraphEdit(action)) return applyGraphEdit(graph, action);
  return applyCoupleEdit(graph, action);
}

function isEdit(action: PedigreeAction): action is AnyEditAction {
  return isIndividualEdit(action) || isGraphEdit(action) || isCoupleEdit(action);
}

export type StateListener = (state: PedigreeState) => void;
export type Unsubscribe = () => void;

export interface PedigreeStore {
  getState(): PedigreeState;
  dispatch(action: PedigreeAction): void;
  subscribe(listener: StateListener): Unsubscribe;
}

export interface PedigreeStoreInit {
  graph: PedigreeGraph;
  layoutOptions: LayoutOptions;
  selectedId?: IndividualId;
}

export function reducer(state: PedigreeState, action: PedigreeAction): PedigreeState {
  if (isEdit(action)) {
    const nextGraph = applyEdit(state.graph, action);
    if (nextGraph === state.graph) return state; // no-op edit; history untouched
    return {
      ...state,
      graph: nextGraph,
      history: recordEdit(state.history, state.graph),
    };
  }
  switch (action.type) {
    case 'load':
      // Loading a new graph clears edit history — a fresh edit timeline.
      return { ...state, graph: action.graph, history: emptyHistory<PedigreeGraph>() };
    case 'setLayoutOptions':
      return { ...state, layoutOptions: { ...state.layoutOptions, ...action.options } };
    case 'selectIndividual':
      return { ...state, selectedId: action.id };
    case 'clearSelection':
      return { ...state, selectedId: undefined };
    case 'undo': {
      const outcome = undoHistory(state.history, state.graph);
      if (outcome === undefined) return state;
      return { ...state, graph: outcome.restored, history: outcome.history };
    }
    case 'redo': {
      const outcome = redoHistory(state.history, state.graph);
      if (outcome === undefined) return state;
      return { ...state, graph: outcome.restored, history: outcome.history };
    }
  }
}

/**
 * Create a framework-agnostic store. The React adapter wraps this with
 * `useSyncExternalStore`; non-React consumers can drive it directly via
 * `getState`/`dispatch`/`subscribe`.
 */
export function createPedigreeStore(initial: PedigreeStoreInit): PedigreeStore {
  let state: PedigreeState = {
    graph: initial.graph,
    layoutOptions: initial.layoutOptions,
    selectedId: initial.selectedId,
    history: emptyHistory<PedigreeGraph>(),
  };
  const listeners = new Set<StateListener>();

  return {
    getState() {
      return state;
    },
    dispatch(action) {
      state = reducer(state, action);
      for (const listener of listeners) listener(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
