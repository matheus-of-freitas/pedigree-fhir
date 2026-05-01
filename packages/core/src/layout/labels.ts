import type { CoupleId, IndividualId } from '../model/types.js';
import type { NodeLayout } from './types.js';

const DEFAULT_MIN_LABEL_WIDTH = 72;
const DEFAULT_CONSTRAINED_MIN_LABEL_WIDTH = 48;
const DEFAULT_MAX_LABEL_WIDTH = 180;
const DEFAULT_LABEL_GAP_PADDING = 12;
const DEFAULT_FONT_SIZE = 10;
const DEFAULT_MIN_CHARS_PER_LINE = 12;
const AVERAGE_CHAR_WIDTH_FACTOR = 0.56;
const LABEL_WIDTH_ESTIMATE_FACTOR = 0.62;

export interface NodeLabelWidthOptions {
  minWidth?: number;
  maxWidth?: number;
  gapPadding?: number;
  obstacles?: readonly NodeLabelObstacle[];
}

export interface WrapLabelOptions {
  fontSize?: number;
  minCharsPerLine?: number;
}

export interface NodeLabelOffsetOptions {
  fontSize?: number;
  gapPadding?: number;
  obstacles?: readonly NodeLabelObstacle[];
}

type NodeLabelOffsetNode = Pick<NodeLayout, 'id' | 'x' | 'y'> & {
  label?: string | undefined;
  maxWidth?: number | undefined;
};

export interface NodeLabelObstacle {
  x: number;
  y: number;
  width?: number | undefined;
}

interface ParentDropStemSource {
  coupleId: CoupleId;
}

interface PartnerEdgeMidpointSource {
  coupleId: CoupleId;
  midpoint: { x: number; y: number };
}

export function computeNodeLabelMaxWidths(
  nodes: readonly Pick<NodeLayout, 'id' | 'x' | 'y'>[],
  options: NodeLabelWidthOptions = {},
): ReadonlyMap<IndividualId, number> {
  const minWidth = options.minWidth ?? DEFAULT_MIN_LABEL_WIDTH;
  const constrainedMinWidth = Math.min(minWidth, DEFAULT_CONSTRAINED_MIN_LABEL_WIDTH);
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_LABEL_WIDTH;
  const gapPadding = options.gapPadding ?? DEFAULT_LABEL_GAP_PADDING;
  const obstaclesByRow = new Map<number, NodeLabelObstacle[]>();
  for (const obstacle of options.obstacles ?? []) {
    const existing = obstaclesByRow.get(obstacle.y);
    if (existing === undefined) obstaclesByRow.set(obstacle.y, [obstacle]);
    else existing.push(obstacle);
  }

  const rows = new Map<number, Pick<NodeLayout, 'id' | 'x' | 'y'>[]>();
  for (const node of nodes) {
    const existing = rows.get(node.y);
    if (existing === undefined) rows.set(node.y, [node]);
    else existing.push(node);
  }

  const widths = new Map<IndividualId, number>();
  for (const [y, row] of rows.entries()) {
    const sorted = [...row].sort((a, b) => a.x - b.x);
    const rowObstacles = [...(obstaclesByRow.get(y) ?? [])].sort((a, b) => a.x - b.x);
    if (sorted.length === 1) {
      widths.set(sorted[0]?.id as IndividualId, maxWidth);
      continue;
    }

    sorted.forEach((node, index) => {
      const previous = sorted[index - 1];
      const next = sorted[index + 1];
      const leftGap =
        index === 0 || previous === undefined ? Number.POSITIVE_INFINITY : node.x - previous.x;
      const rightGap =
        index === sorted.length - 1 || next === undefined
          ? Number.POSITIVE_INFINITY
          : next.x - node.x;
      const available = Math.min(leftGap, rightGap);
      let constrainedWidth = Math.max(minWidth, Math.min(maxWidth, available - gapPadding));

      const nearestLeftObstacle = [...rowObstacles]
        .reverse()
        .find((obstacle) => obstacle.x < node.x);
      const nearestRightObstacle = rowObstacles.find((obstacle) => obstacle.x > node.x);

      const obstacleLimitedWidths: number[] = [];
      if (nearestLeftObstacle !== undefined && next !== undefined) {
        obstacleLimitedWidths.push((node.x - nearestLeftObstacle.x) * 2 - gapPadding);
      }
      if (nearestRightObstacle !== undefined && previous !== undefined) {
        obstacleLimitedWidths.push((nearestRightObstacle.x - node.x) * 2 - gapPadding);
      }

      if (obstacleLimitedWidths.length > 0) {
        constrainedWidth = Math.max(
          constrainedMinWidth,
          Math.min(constrainedWidth, ...obstacleLimitedWidths),
        );
      }

      widths.set(node.id, constrainedWidth);
    });
  }

  return widths;
}

export function computeNodeLabelXOffsets(
  nodes: readonly NodeLabelOffsetNode[],
  options: NodeLabelOffsetOptions = {},
): ReadonlyMap<IndividualId, number> {
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  const gapPadding = options.gapPadding ?? DEFAULT_LABEL_GAP_PADDING;
  const obstaclesByRow = new Map<number, NodeLabelObstacle[]>();
  for (const obstacle of options.obstacles ?? []) {
    const existing = obstaclesByRow.get(obstacle.y);
    if (existing === undefined) obstaclesByRow.set(obstacle.y, [obstacle]);
    else existing.push(obstacle);
  }

  const rows = new Map<number, NodeLabelOffsetNode[]>();
  for (const node of nodes) {
    const existing = rows.get(node.y);
    if (existing === undefined) rows.set(node.y, [node]);
    else existing.push(node);
  }

  const offsets = new Map<IndividualId, number>();
  for (const [y, row] of rows.entries()) {
    const sorted = [...row].sort((a, b) => a.x - b.x);
    const rowObstacles = obstaclesByRow.get(y) ?? [];
    if (sorted.length === 1 && rowObstacles.length === 0) {
      offsets.set(sorted[0]?.id as IndividualId, 0);
      continue;
    }

    const states = sorted.map((node) => ({
      node,
      offset: 0,
      halfWidth: estimateLabelWidth(node.label, node.maxWidth, fontSize) / 2,
    }));

    for (let pass = 0; pass < states.length + rowObstacles.length; pass += 1) {
      let changed = false;

      const elements = [
        ...states.map((state) => ({
          type: 'label' as const,
          center: state.node.x + state.offset,
          halfWidth: state.halfWidth,
          state,
        })),
        ...rowObstacles.map((obstacle) => ({
          type: 'obstacle' as const,
          center: obstacle.x,
          halfWidth: (obstacle.width ?? 0) / 2,
        })),
      ].sort((a, b) => a.center - b.center);

      for (let index = 0; index < elements.length - 1; index += 1) {
        const left = elements[index];
        const right = elements[index + 1];
        /* v8 ignore next */
        if (left === undefined || right === undefined) continue;
        const currentGap = right.center - right.halfWidth - (left.center + left.halfWidth);
        const deficit = gapPadding - currentGap;

        if (deficit <= 0) continue;

        if (left.type === 'label' && right.type === 'label') {
          left.state.offset -= deficit / 2;
          right.state.offset += deficit / 2;
        } else if (left.type === 'label') {
          left.state.offset -= deficit;
        } else if (right.type === 'label') {
          right.state.offset += deficit;
        }
        changed = true;
      }

      if (!changed) break;
    }

    for (const state of states) offsets.set(state.node.id, state.offset);
  }

  return offsets;
}

export function computeParentDropStemLabelObstacles(
  partnerEdges: readonly PartnerEdgeMidpointSource[],
  parentDrops: readonly ParentDropStemSource[],
): readonly NodeLabelObstacle[] {
  const midpoints = new Map(
    partnerEdges.map((edge) => [edge.coupleId, { x: edge.midpoint.x, y: edge.midpoint.y }]),
  );

  return parentDrops.flatMap((drop) => {
    const midpoint = midpoints.get(drop.coupleId);
    return midpoint === undefined ? [] : [{ x: midpoint.x, y: midpoint.y }];
  });
}

export function wrapLabelLines(
  label: string,
  maxWidth: number,
  options: WrapLabelOptions = {},
): readonly string[] {
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  const minCharsPerLine = options.minCharsPerLine ?? DEFAULT_MIN_CHARS_PER_LINE;
  const maxChars = Math.max(
    minCharsPerLine,
    Math.floor(maxWidth / (fontSize * AVERAGE_CHAR_WIDTH_FACTOR)),
  );
  const words = label
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';

  function pushLongWord(word: string): void {
    let index = 0;
    while (index < word.length) {
      const chunk = word.slice(index, index + maxChars);
      if (index + maxChars < word.length) lines.push(chunk);
      else current = chunk;
      index += maxChars;
    }
  }

  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current !== '') lines.push(current);
    current = '';

    if (word.length <= maxChars) {
      current = word;
      continue;
    }

    pushLongWord(word);
  }

  if (current !== '') lines.push(current);
  return lines;
}

function estimateLabelWidth(
  label: string | undefined,
  maxWidth: number | undefined,
  fontSize: number,
): number {
  if (label === undefined) return 0;

  const lines = wrapLabelLines(label, maxWidth ?? DEFAULT_MAX_LABEL_WIDTH, { fontSize });
  const longestLineLength = lines.reduce(
    (longest, line) => Math.max(longest, line.trimEnd().length),
    0,
  );

  return Math.min(
    maxWidth ?? DEFAULT_MAX_LABEL_WIDTH,
    longestLineLength * fontSize * LABEL_WIDTH_ESTIMATE_FACTOR,
  );
}
