import { describe, expect, it } from 'vitest';
import {
  computeNodeLabelMaxWidths,
  computeNodeLabelXOffsets,
  computeParentDropStemLabelObstacles,
  wrapLabelLines,
} from '../../src/layout/labels.js';

describe('computeNodeLabelMaxWidths', () => {
  it('uses the max width for isolated nodes', () => {
    const widths = computeNodeLabelMaxWidths([{ id: 'solo', x: 0, y: 120 }]);
    expect(widths.get('solo')).toBe(180);
  });

  it('derives widths from nearest neighbors on the same row', () => {
    const widths = computeNodeLabelMaxWidths([
      { id: 'left', x: -120, y: 120 },
      { id: 'middle', x: 0, y: 120 },
      { id: 'right', x: 120, y: 120 },
    ]);

    expect(widths.get('left')).toBe(108);
    expect(widths.get('middle')).toBe(108);
    expect(widths.get('right')).toBe(108);
  });

  it('treats different rows independently and clamps tight rows', () => {
    const widths = computeNodeLabelMaxWidths([
      { id: 'top-a', x: -40, y: 0 },
      { id: 'top-b', x: 40, y: 0 },
      { id: 'bottom', x: 0, y: 120 },
    ]);

    expect(widths.get('top-a')).toBe(72);
    expect(widths.get('top-b')).toBe(72);
    expect(widths.get('bottom')).toBe(180);
  });

  it('narrows labels trapped between a neighbor and a connector stem', () => {
    const widths = computeNodeLabelMaxWidths(
      [
        { id: 'left', x: -100, y: 0 },
        { id: 'middle-left', x: -40, y: 0 },
        { id: 'middle-right', x: 40, y: 0 },
        { id: 'right', x: 100, y: 0 },
      ],
      {
        obstacles: [
          { x: -70, y: 0 },
          { x: 70, y: 0 },
        ],
      },
    );

    expect(widths.get('left')).toBe(72);
    expect(widths.get('middle-left')).toBe(48);
    expect(widths.get('middle-right')).toBe(48);
    expect(widths.get('right')).toBe(72);
  });
});

describe('wrapLabelLines', () => {
  it('wraps multi-word labels to fit the available width', () => {
    expect(wrapLabelLines('maternal grandmother', 80)).toEqual(['maternal', 'grandmother']);
  });

  it('keeps short labels on one line', () => {
    expect(wrapLabelLines('mother', 120)).toEqual(['mother']);
  });

  it('returns no lines for blank labels', () => {
    expect(wrapLabelLines('   ', 120)).toEqual([]);
  });

  it('splits long single words when needed', () => {
    expect(
      wrapLabelLines('supercalifragilistic', 50, { fontSize: 10, minCharsPerLine: 5 }),
    ).toEqual(['supercal', 'ifragili', 'stic']);
  });
});

describe('computeNodeLabelXOffsets', () => {
  it('keeps isolated nodes centered', () => {
    const offsets = computeNodeLabelXOffsets([{ id: 'solo', x: 0, y: 120, label: 'mother' }]);
    expect(offsets.get('solo')).toBe(0);
  });

  it('nudges crowded neighboring labels away from each other', () => {
    const offsets = computeNodeLabelXOffsets([
      { id: 'left', x: 0, y: 0, label: 'maternal grandmother' },
      { id: 'right', x: 80, y: 0, label: 'maternal grandfather' },
    ]);

    expect(offsets.get('left')).toBeLessThan(0);
    expect(offsets.get('right')).toBeGreaterThan(0);
  });

  it('keeps wide enough gaps unshifted', () => {
    const offsets = computeNodeLabelXOffsets([
      { id: 'left', x: 0, y: 0, label: 'maternal grandmother' },
      { id: 'right', x: 220, y: 0, label: 'paternal grandmother' },
    ]);

    expect(offsets.get('left')).toBe(0);
    expect(offsets.get('right')).toBe(0);
  });

  it('separates crowded middle labels too', () => {
    const offsets = computeNodeLabelXOffsets([
      { id: 'left', x: 0, y: 0, label: 'maternal grandmother' },
      { id: 'middle-left', x: 120, y: 0, label: 'maternal grandfather' },
      { id: 'middle-right', x: 240, y: 0, label: 'paternal grandmother' },
      { id: 'right', x: 360, y: 0, label: 'paternal grandfather' },
    ]);

    expect(offsets.get('middle-left')).toBeLessThan(0);
    expect(offsets.get('middle-right')).toBeGreaterThan(0);
  });

  it('treats missing labels as zero-width', () => {
    const offsets = computeNodeLabelXOffsets([
      { id: 'left', x: 0, y: 0 },
      { id: 'right', x: 120, y: 0, label: 'maternal grandfather' },
    ]);

    expect(offsets.get('left')).toBe(0);
    expect(offsets.get('right')).toBe(0);
  });

  it('pushes labels away from connector stems on the same row', () => {
    const offsets = computeNodeLabelXOffsets(
      [{ id: 'right', x: 120, y: 0, label: 'paternal grandmother' }],
      { obstacles: [{ x: 170, y: 0 }] },
    );

    expect(offsets.get('right')).toBeLessThan(0);
  });

  it('pushes labels right when the connector stem is on the left', () => {
    const offsets = computeNodeLabelXOffsets(
      [{ id: 'left', x: 120, y: 0, label: 'maternal grandmother' }],
      { obstacles: [{ x: 70, y: 0 }] },
    );

    expect(offsets.get('left')).toBeGreaterThan(0);
  });

  it('ignores connector stems from other rows', () => {
    const offsets = computeNodeLabelXOffsets(
      [{ id: 'right', x: 120, y: 0, label: 'paternal grandmother' }],
      { obstacles: [{ x: 170, y: 120 }] },
    );

    expect(offsets.get('right')).toBe(0);
  });

  it('handles multiple connector stems on the same row', () => {
    const offsets = computeNodeLabelXOffsets(
      [{ id: 'middle', x: 120, y: 0, label: 'paternal grandmother' }],
      {
        obstacles: [
          { x: 70, y: 0 },
          { x: 170, y: 0 },
        ],
      },
    );

    expect(Math.abs(offsets.get('middle') ?? 0)).toBeLessThan(0.001);
  });
});

describe('computeParentDropStemLabelObstacles', () => {
  it('maps parent drops to their partner-edge midpoints', () => {
    expect(
      computeParentDropStemLabelObstacles(
        [
          { coupleId: 'c1', midpoint: { x: 90, y: 0 } },
          { coupleId: 'c2', midpoint: { x: 210, y: 120 } },
        ],
        [{ coupleId: 'c2' }, { coupleId: 'missing' }],
      ),
    ).toEqual([{ x: 210, y: 120 }]);
  });
});
