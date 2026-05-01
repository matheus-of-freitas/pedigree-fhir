import {
  type LayoutOptions,
  Sex,
  VitalStatus,
  computeNodeLabelMaxWidths,
  computeNodeLabelXOffsets,
  computeParentDropStemLabelObstacles,
  createPedigreeStore,
  inferRelationships,
  parsePedigree,
  resolveIndividualDisplayLabel,
} from '@pedigree/core';
import {
  Edge,
  Node,
  Pedigree,
  PedigreeProvider,
  Sibship,
  useCompact,
  useSelection,
} from '@pedigree/react';
import { type ReactNode, useMemo } from 'react';
import type { Fixture } from '../fixtures/three-gen.js';
import { NodeLabel } from './NodeLabel.js';

const NODE_SIZE = 40;

export interface InteractivePedigreeViewProps {
  fixture: Fixture;
  layoutOptions?: LayoutOptions;
  showCompactToggles?: boolean;
  showRelativeLabels?: boolean;
}

/**
 * Selection-aware, compact-toggle-aware pedigree view used by the
 * `interactivity/` stories. Same headless library; the only difference
 * vs `<PedigreeView>` is wired interactions.
 */
export function InteractivePedigreeView({
  fixture,
  layoutOptions = {},
  showCompactToggles = true,
  showRelativeLabels = false,
}: InteractivePedigreeViewProps) {
  const store = useMemo(() => {
    const graph = inferRelationships(parsePedigree(fixture.patient, fixture.familyHistory));
    return createPedigreeStore({ graph, layoutOptions });
  }, [fixture, layoutOptions]);

  return (
    <PedigreeProvider store={store}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {showCompactToggles && <CompactToolbar />}
        <SelectableSvg showRelativeLabels={showRelativeLabels} />
        <SelectionInspector />
      </div>
    </PedigreeProvider>
  );
}

function CompactToolbar() {
  const { compact, toggle } = useCompact();
  return (
    <div role="toolbar" aria-label="Compact toggles" style={{ display: 'flex', gap: 8 }}>
      <button
        type="button"
        aria-pressed={compact.maternal}
        onClick={() => toggle('maternal')}
        data-testid="toggle-maternal"
        style={toolbarButtonStyle(compact.maternal)}
      >
        {compact.maternal ? 'Show' : 'Hide'} maternal aunts/uncles
      </button>
      <button
        type="button"
        aria-pressed={compact.paternal}
        onClick={() => toggle('paternal')}
        data-testid="toggle-paternal"
        style={toolbarButtonStyle(compact.paternal)}
      >
        {compact.paternal ? 'Show' : 'Hide'} paternal aunts/uncles
      </button>
    </div>
  );
}

function toolbarButtonStyle(pressed: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    fontSize: 13,
    border: '1px solid var(--pedigree-stroke)',
    background: pressed ? 'var(--pedigree-stroke)' : 'transparent',
    color: pressed ? 'var(--pedigree-bg)' : 'var(--pedigree-text)',
    borderRadius: 6,
    cursor: 'pointer',
  };
}

function SelectionInspector() {
  const { selectedId, clearSelection } = useSelection();
  if (selectedId === undefined) {
    return (
      <p style={{ fontSize: 12, color: 'var(--pedigree-text)', opacity: 0.7, margin: 0 }}>
        Click a node to select it.
      </p>
    );
  }
  return (
    <p
      style={{ fontSize: 13, color: 'var(--pedigree-text)', margin: 0 }}
      data-testid="selection-readout"
    >
      Selected: <strong>{selectedId}</strong>{' '}
      <button
        type="button"
        onClick={clearSelection}
        style={{
          marginLeft: 8,
          fontSize: 12,
          background: 'transparent',
          border: 'none',
          color: 'var(--pedigree-text)',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        clear
      </button>
    </p>
  );
}

function SelectableSvg({ showRelativeLabels }: { showRelativeLabels: boolean }) {
  const { selectedId, toggleSelection } = useSelection();
  return (
    <Pedigree>
      {({ graph, layout }) => {
        const { minX, minY, width, height } = layout.bounds;
        const labels = new Map(
          layout.nodes.map((node) => {
            const individual = graph.individuals[node.id];
            return [
              node.id,
              individual === undefined
                ? undefined
                : resolveIndividualDisplayLabel(individual, {
                    preferRelationshipLabel: showRelativeLabels,
                  }),
            ];
          }),
        );
        const labelObstacles = computeParentDropStemLabelObstacles(
          layout.partnerEdges,
          layout.parentDrops,
        );
        const labelWidths = computeNodeLabelMaxWidths(layout.nodes, {
          obstacles: labelObstacles,
        });
        const labelOffsets = computeNodeLabelXOffsets(
          layout.nodes.map((node) => ({
            ...node,
            label: labels.get(node.id),
            maxWidth: labelWidths.get(node.id),
          })),
          { fontSize: 11, obstacles: labelObstacles },
        );
        return (
          <svg
            viewBox={`${minX - 30} ${minY - 30} ${width + 60} ${height + 60}`}
            role="img"
            aria-label="Pedigree chart"
            style={{
              width: '100%',
              maxWidth: 720,
              height: 'auto',
              background: 'var(--pedigree-bg, transparent)',
            }}
          >
            <title>Pedigree chart (interactive)</title>
            {layout.partnerEdges.map((edge) => (
              <Edge key={edge.coupleId} coupleId={edge.coupleId}>
                {(e) => (
                  <path
                    d={e.path}
                    fill="none"
                    stroke="var(--pedigree-stroke)"
                    strokeWidth="var(--pedigree-stroke-width)"
                  />
                )}
              </Edge>
            ))}
            {layout.parentDrops.map((drop) => (
              <Sibship key={drop.coupleId} coupleId={drop.coupleId}>
                {(d) => (
                  <path
                    d={d.path}
                    fill="none"
                    stroke="var(--pedigree-stroke)"
                    strokeWidth="var(--pedigree-stroke-width)"
                  />
                )}
              </Sibship>
            ))}
            {layout.nodes.map((n) => (
              <Node key={n.id} id={n.id}>
                {({ individual, position }) => (
                  <SelectableGlyph
                    id={individual.id}
                    x={position.x}
                    y={position.y}
                    sex={individual.semantics.sex}
                    vital={individual.semantics.vital}
                    affected={individual.semantics.conditions.some((c) => c.status === 'affected')}
                    proband={individual.id === graph.proband}
                    selected={individual.id === selectedId}
                    label={labels.get(individual.id)}
                    labelMaxWidth={labelWidths.get(individual.id)}
                    labelOffsetX={labelOffsets.get(individual.id) ?? 0}
                    onSelect={() => toggleSelection(individual.id)}
                  />
                )}
              </Node>
            ))}
          </svg>
        );
      }}
    </Pedigree>
  );
}

function SelectableGlyph(props: {
  id: string;
  x: number;
  y: number;
  sex: Sex;
  vital: VitalStatus;
  affected: boolean;
  proband: boolean;
  selected: boolean;
  label: string | undefined;
  labelMaxWidth: number | undefined;
  labelOffsetX: number;
  onSelect: () => void;
}): ReactNode {
  const {
    id,
    x,
    y,
    sex,
    vital,
    affected,
    proband,
    selected,
    label,
    labelMaxWidth,
    labelOffsetX,
    onSelect,
  } = props;
  const half = NODE_SIZE / 2;
  const fill = affected ? 'var(--pedigree-affected)' : 'var(--pedigree-fill)';
  const stroke = proband ? 'var(--pedigree-proband)' : 'var(--pedigree-stroke)';
  const sw = proband ? 'var(--pedigree-proband-stroke-width)' : 'var(--pedigree-stroke-width)';

  let shape: ReactNode;
  if (sex === Sex.Male) {
    shape = (
      <rect
        x={-half}
        y={-half}
        width={NODE_SIZE}
        height={NODE_SIZE}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
    );
  } else if (sex === Sex.Female) {
    shape = <circle r={half} fill={fill} stroke={stroke} strokeWidth={sw} />;
  } else {
    shape = (
      <polygon
        points={`0,${-half} ${half},0 0,${half} ${-half},0`}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
    );
  }

  return (
    <g
      transform={`translate(${x} ${y})`}
      // biome-ignore lint/a11y/useSemanticElements: SVG <g> can't be replaced with a real <button> while preserving the transform; role+tabIndex+keyDown is the documented WAI-ARIA pattern for clickable SVG nodes.
      role="button"
      tabIndex={0}
      aria-label={`Individual ${id}`}
      aria-pressed={selected}
      data-testid={`node-${id}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      {selected && (
        <circle
          r={half + 8}
          fill="none"
          stroke="var(--pedigree-proband)"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      )}
      {shape}
      {vital === VitalStatus.Deceased && (
        <line
          x1={-half - 4}
          y1={half + 4}
          x2={half + 4}
          y2={-half - 4}
          stroke={stroke}
          strokeWidth={sw}
        />
      )}
      {proband && (
        <polygon
          points={`${-half - 14},${half + 14} ${-half - 4},${half + 4} ${-half - 6},${half + 14}`}
          fill={stroke}
        />
      )}
      <NodeLabel
        label={label}
        maxWidth={labelMaxWidth}
        x={labelOffsetX}
        y={half + 18}
        fontSize={11}
        fill="var(--pedigree-text)"
      />
    </g>
  );
}
