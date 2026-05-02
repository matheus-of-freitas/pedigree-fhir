import {
  Sex,
  VitalStatus,
  computeNodeLabelMaxWidths,
  computeNodeLabelXOffsets,
  createPedigreeStore,
  inferRelationships,
  parsePedigree,
  serializePedigree,
} from '@pedigree-fhir/core';
import {
  Edge,
  Node,
  Pedigree,
  PedigreeProvider,
  Sibship,
  usePedigree,
  usePedigreeStore,
} from '@pedigree-fhir/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode, useMemo, useState } from 'react';
import { NodeLabel } from '../../components/NodeLabel.js';
import { threeGen } from '../../fixtures/three-gen.js';

const NODE_SIZE = 40;

const meta: Meta = {
  title: 'Editing/FHIR round-trip',
  parameters: {
    docs: {
      description: {
        component:
          'Demonstrates `serializePedigree → parsePedigree → inferRelationships` producing an equivalent graph. Click "Export and re-import" to overwrite the live graph with its serialized-then-parsed self.',
      },
    },
  },
};

export default meta;

function RoundTripDemo() {
  const store = useMemo(() => {
    const graph = inferRelationships(parsePedigree(threeGen.patient, threeGen.familyHistory));
    return createPedigreeStore({ graph, layoutOptions: {} });
  }, []);

  return (
    <PedigreeProvider store={store}>
      <RoundTripBody />
    </PedigreeProvider>
  );
}

function RoundTripBody() {
  const store = usePedigreeStore();
  const { graph } = usePedigree();
  const [snapshot, setSnapshot] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div role="toolbar" aria-label="Round trip" style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          data-testid="export-import"
          onClick={() => {
            const ser = serializePedigree(graph);
            const reparsed = inferRelationships(parsePedigree(ser.patient, ser.familyHistory));
            setSnapshot(JSON.stringify(ser, null, 2));
            store.dispatch({ type: 'load', graph: reparsed });
          }}
          style={{
            padding: '6px 12px',
            border: '1px solid var(--pedigree-stroke)',
            background: 'transparent',
            color: 'var(--pedigree-text)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Export and re-import
        </button>
        <span style={{ fontSize: 12, color: 'var(--pedigree-text)', alignSelf: 'center' }}>
          {snapshot === null
            ? 'Click to export FHIR JSON and replay it through parse + infer.'
            : `Round-tripped ${graph.individuals[graph.proband]?.id ?? '?'} successfully.`}
        </span>
      </div>
      <RoundTripSvg />
      {snapshot !== null && (
        <details>
          <summary style={{ fontSize: 12, color: 'var(--pedigree-text)' }}>
            FHIR snapshot (truncated to 1500 chars)
          </summary>
          <pre style={{ fontSize: 10, maxHeight: 240, overflow: 'auto' }}>
            {snapshot.slice(0, 1500)}
            {snapshot.length > 1500 ? '\n…' : ''}
          </pre>
        </details>
      )}
    </div>
  );
}

function RoundTripSvg() {
  return (
    <Pedigree>
      {({ graph, layout }) => {
        const { minX, minY, width, height } = layout.bounds;
        const labels = new Map(
          layout.nodes.map((node) => [node.id, graph.individuals[node.id]?.name]),
        );
        const labelWidths = computeNodeLabelMaxWidths(layout.nodes);
        const labelOffsets = computeNodeLabelXOffsets(
          layout.nodes.map((node) => ({
            ...node,
            label: labels.get(node.id),
            maxWidth: labelWidths.get(node.id),
          })),
          { fontSize: 11 },
        );
        return (
          <svg
            viewBox={`${minX - 30} ${minY - 30} ${width + 60} ${height + 60}`}
            role="img"
            aria-label="Round-tripped pedigree chart"
            style={{
              width: '100%',
              maxWidth: 720,
              height: 'auto',
              background: 'var(--pedigree-bg, transparent)',
            }}
          >
            <title>Round-tripped pedigree chart</title>
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
                    label={labels.get(individual.id)}
                    labelMaxWidth={labelWidths.get(individual.id)}
                    labelOffsetX={labelOffsets.get(individual.id) ?? 0}
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
  label: string | undefined;
  labelMaxWidth: number | undefined;
  labelOffsetX: number;
}): ReactNode {
  const { id, x, y, sex, vital, affected, proband, label, labelMaxWidth, labelOffsetX } = props;
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
    <g transform={`translate(${x} ${y})`} data-testid={`node-${id}`}>
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

export const FhirRoundTrip: StoryObj = {
  render: () => <RoundTripDemo />,
};
