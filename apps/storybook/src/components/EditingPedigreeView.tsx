import {
  AffectedStatus,
  Sex,
  VitalStatus,
  createPedigreeStore,
  inferRelationships,
  parsePedigree,
} from '@pedigree/core';
import {
  Edge,
  Node,
  Pedigree,
  PedigreeProvider,
  Sibship,
  useEditor,
  useSelection,
} from '@pedigree/react';
import { type ReactNode, useMemo } from 'react';
import type { Fixture } from '../fixtures/three-gen.js';

const NODE_SIZE = 40;

export interface EditingPedigreeViewProps {
  fixture: Fixture;
}

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function EditingPedigreeView({ fixture }: EditingPedigreeViewProps) {
  const store = useMemo(() => {
    const graph = inferRelationships(parsePedigree(fixture.patient, fixture.familyHistory));
    return createPedigreeStore({ graph, layoutOptions: {} });
  }, [fixture]);

  return (
    <PedigreeProvider store={store}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Toolbar />
        <SelectableSvg />
      </div>
    </PedigreeProvider>
  );
}

function Toolbar() {
  const { selectedId } = useSelection();
  const editor = useEditor();
  const noSelection = selectedId === undefined;
  return (
    <div role="toolbar" aria-label="Editor" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <button
        type="button"
        disabled={noSelection}
        data-testid="action-add-sibling"
        onClick={() =>
          selectedId !== undefined &&
          editor.addRelative({
            relativeOf: selectedId,
            kind: 'sibling',
            newId: nextId('sib'),
            sex: Sex.Female,
            name: 'New sibling',
          })
        }
        style={btn(noSelection)}
      >
        Add sibling
      </button>
      <button
        type="button"
        disabled={noSelection}
        data-testid="action-add-child"
        onClick={() =>
          selectedId !== undefined &&
          editor.addRelative({
            relativeOf: selectedId,
            kind: 'child',
            newId: nextId('kid'),
            sex: Sex.Male,
            name: 'New child',
          })
        }
        style={btn(noSelection)}
      >
        Add child
      </button>
      <button
        type="button"
        disabled={noSelection}
        data-testid="action-mark-affected"
        onClick={() =>
          selectedId !== undefined &&
          editor.upsertCondition(selectedId, {
            code: 'demo:affected',
            display: 'Demo condition',
            status: AffectedStatus.Affected,
          })
        }
        style={btn(noSelection)}
      >
        Mark affected
      </button>
      <button
        type="button"
        disabled={noSelection}
        data-testid="action-mark-deceased"
        onClick={() =>
          selectedId !== undefined && editor.setVital(selectedId, VitalStatus.Deceased)
        }
        style={btn(noSelection)}
      >
        Mark deceased
      </button>
      <button
        type="button"
        disabled={noSelection}
        data-testid="action-remove"
        onClick={() => selectedId !== undefined && editor.removeIndividual(selectedId)}
        style={btn(noSelection)}
      >
        Remove
      </button>
      <span style={{ flex: 1 }} />
      <button
        type="button"
        disabled={!editor.canUndo}
        data-testid="action-undo"
        onClick={() => editor.undo()}
        style={btn(!editor.canUndo)}
      >
        Undo
      </button>
      <button
        type="button"
        disabled={!editor.canRedo}
        data-testid="action-redo"
        onClick={() => editor.redo()}
        style={btn(!editor.canRedo)}
      >
        Redo
      </button>
    </div>
  );
}

function btn(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    fontSize: 13,
    border: '1px solid var(--pedigree-stroke)',
    background: 'transparent',
    color: 'var(--pedigree-text)',
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}

function SelectableSvg() {
  const { selectedId, toggleSelection } = useSelection();
  return (
    <Pedigree>
      {({ graph, layout }) => {
        const { minX, minY, width, height } = layout.bounds;
        return (
          <svg
            viewBox={`${minX - 30} ${minY - 30} ${width + 60} ${height + 60}`}
            role="img"
            aria-label="Editable pedigree chart"
            style={{
              width: '100%',
              maxWidth: 720,
              height: 'auto',
              background: 'var(--pedigree-bg, transparent)',
            }}
          >
            <title>Editable pedigree chart</title>
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
                  <Glyph
                    id={individual.id}
                    x={position.x}
                    y={position.y}
                    sex={individual.semantics.sex}
                    vital={individual.semantics.vital}
                    affected={individual.semantics.conditions.some((c) => c.status === 'affected')}
                    proband={individual.id === graph.proband}
                    selected={individual.id === selectedId}
                    label={individual.name}
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

function Glyph(props: {
  id: string;
  x: number;
  y: number;
  sex: Sex;
  vital: VitalStatus;
  affected: boolean;
  proband: boolean;
  selected: boolean;
  label: string | undefined;
  onSelect: () => void;
}): ReactNode {
  const { id, x, y, sex, vital, affected, proband, selected, label, onSelect } = props;
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
      // biome-ignore lint/a11y/useSemanticElements: SVG <g> can't be replaced with a real <button> while preserving the transform.
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
      {label !== undefined && (
        <text y={half + 18} textAnchor="middle" fontSize={11} fill="var(--pedigree-text)">
          {label}
        </text>
      )}
    </g>
  );
}
