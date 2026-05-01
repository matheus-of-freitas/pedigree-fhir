import type { CoupleId, IndividualId, TwinGroupId } from '../model/types.js';
import type { TwinType } from '../psc/semantics.js';

/** Position of one individual node, in layout-space coordinates. */
export interface NodeLayout {
  id: IndividualId;
  /** Center x of the individual. */
  x: number;
  /** Center y of the individual. */
  y: number;
}

/** Horizontal partner edge between the two members of a couple. */
export interface PartnerEdge {
  coupleId: CoupleId;
  partners: readonly [IndividualId, IndividualId];
  /** True when PSC consanguinity should be represented as a double partner line. */
  consanguineous: boolean;
  /** SVG path string consumers can pass straight to a `<path d=...>`. */
  path: string;
  /** Midpoint of the edge — useful when drawing the sibship drop above it. */
  midpoint: { x: number; y: number };
}

export interface TwinJunction {
  twinGroupId: TwinGroupId;
  type: TwinType;
  children: readonly IndividualId[];
  /** Point on the sibship line where twin diagonals branch. */
  junction: { x: number; y: number };
  /** SVG path for all diagonal twin branches. */
  path: string;
  /** Extra connector used for monozygotic twins; omitted otherwise. */
  monozygoticPath?: string;
}

/**
 * The "drop" from a couple to its children: vertical from the partner-edge
 * midpoint down to a horizontal sibship line, then short verticals to each
 * child. Encoded as a single multi-segment SVG path (multiple `M` ops).
 */
export interface ParentDrop {
  coupleId: CoupleId;
  children: readonly IndividualId[];
  twinJunctions: readonly TwinJunction[];
  path: string;
}

export interface LayoutBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface LaidOutPedigree {
  nodes: readonly NodeLayout[];
  partnerEdges: readonly PartnerEdge[];
  parentDrops: readonly ParentDrop[];
  bounds: LayoutBounds;
}

export interface LayoutOptions {
  /** Visual size of each individual (used for edge geometry). Default: 40. */
  nodeSize?: number;
  /** Center-to-center horizontal distance between adjacent siblings. Default: 80. */
  siblingPitch?: number;
  /** Center-to-center horizontal distance between two partners in a couple. Default: 60. */
  couplePitch?: number;
  /** Vertical distance between generations. Default: 120. */
  generationGap?: number;
  /**
   * Hide aunts/uncles on either side of the family for a more compact view.
   * Drives the M2 "compact" toggle. Filtering happens before layout, so the
   * grandparent couple's sibship at gen -1 contracts naturally.
   */
  hideAuntsUncles?: { maternal: boolean; paternal: boolean };
}

export const LAYOUT_DEFAULTS = {
  nodeSize: 40,
  siblingPitch: 80,
  couplePitch: 60,
  generationGap: 120,
} as const satisfies Required<Omit<LayoutOptions, 'hideAuntsUncles'>>;
