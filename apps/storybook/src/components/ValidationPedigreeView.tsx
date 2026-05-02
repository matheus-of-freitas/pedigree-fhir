import {
  type Diagnostic,
  Sex,
  VitalStatus,
  computeNodeLabelMaxWidths,
  computeNodeLabelXOffsets,
  computeParentDropStemLabelObstacles,
  createPedigreeStore,
  inferRelationships,
  parsePedigree,
  resolveIndividualDisplayLabel,
} from '@pedigree-fhir/core';
import {
  Edge,
  Node,
  Pedigree,
  PedigreeProvider,
  Sibship,
  useInputValidation,
  useValidation,
} from '@pedigree-fhir/react';
import { type ReactNode, useMemo } from 'react';
import type { Fixture } from '../fixtures/three-gen.js';
import { NodeLabel } from './NodeLabel.js';

const NODE_SIZE = 40;

export interface ValidationPedigreeViewProps {
  fixture: Fixture;
  showRelativeLabels?: boolean;
}

export function ValidationPedigreeView({
  fixture,
  showRelativeLabels = false,
}: ValidationPedigreeViewProps) {
  const { diagnostics: inputDiagnostics } = useInputValidation(
    fixture.patient,
    fixture.familyHistory,
  );
  const store = useMemo(() => {
    const graph = inferRelationships(parsePedigree(fixture.patient, fixture.familyHistory));
    return createPedigreeStore({ graph, layoutOptions: {} });
  }, [fixture]);

  return (
    <PedigreeProvider store={store}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          gap: 20,
        }}
      >
        <div style={{ flex: '1 1 520px', minWidth: 320 }}>
          <ValidationSvg showRelativeLabels={showRelativeLabels} />
        </div>
        <div style={{ flex: '0 1 360px', minWidth: 280 }}>
          <ValidationPanel inputDiagnostics={inputDiagnostics} />
        </div>
      </div>
    </PedigreeProvider>
  );
}

function ValidationPanel({ inputDiagnostics }: { inputDiagnostics: readonly Diagnostic[] }) {
  const { diagnostics } = useValidation();
  const total = inputDiagnostics.length + diagnostics.length;

  return (
    <section
      aria-label="Validation diagnostics"
      data-testid="validation-panel"
      style={{
        border: '1px solid var(--pedigree-stroke)',
        borderRadius: 6,
        padding: 14,
        color: 'var(--pedigree-text)',
        background: 'var(--pedigree-bg, transparent)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 16, lineHeight: 1.2 }}>Diagnostics</h2>
        <span data-testid="diagnostic-count" style={{ fontSize: 13, opacity: 0.75 }}>
          {total}
        </span>
      </div>
      {total === 0 ? (
        <p data-testid="diagnostic-empty" style={{ margin: 0, fontSize: 14 }}>
          No diagnostics
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          <DiagnosticSection
            title="Source data"
            diagnostics={inputDiagnostics}
            countTestId="input-diagnostic-count"
            listTestId="input-diagnostic-list"
            testIdPrefix="input-diagnostic"
          />
          <DiagnosticSection
            title="Pedigree graph"
            diagnostics={diagnostics}
            countTestId="graph-diagnostic-count"
            listTestId="graph-diagnostic-list"
            testIdPrefix="diagnostic"
          />
        </div>
      )}
    </section>
  );
}

function DiagnosticSection(props: {
  title: string;
  diagnostics: readonly Diagnostic[];
  countTestId: string;
  listTestId: string;
  testIdPrefix: string;
}) {
  const { title, diagnostics, countTestId, listTestId, testIdPrefix } = props;
  return (
    <section aria-label={title}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>{title}</h3>
        <span data-testid={countTestId} style={{ fontSize: 12, opacity: 0.75 }}>
          {diagnostics.length}
        </span>
      </div>
      {diagnostics.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>No diagnostics</p>
      ) : (
        <ol data-testid={listTestId} style={{ margin: 0, paddingLeft: 20 }}>
          {diagnostics.map((diagnostic) => (
            <DiagnosticItem
              key={`${testIdPrefix}:${diagnostic.code}:${diagnostic.individualIds.join(',')}:${diagnostic.resourceRefs?.map((r) => r.path ?? r.reference ?? r.id ?? '').join(',') ?? ''}`}
              diagnostic={diagnostic}
              testId={diagnosticTestId(testIdPrefix, diagnostic.code)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function DiagnosticItem({ diagnostic, testId }: { diagnostic: Diagnostic; testId: string }) {
  return (
    <li
      data-testid={testId}
      style={{
        marginBottom: 10,
        fontSize: 13,
        lineHeight: 1.35,
      }}
    >
      <strong style={{ display: 'block', color: severityColor(diagnostic.severity) }}>
        {diagnostic.severity}
      </strong>
      <span>{diagnostic.message}</span>
      {diagnostic.individualIds.length > 0 && (
        <code style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
          {diagnostic.individualIds.join(', ')}
        </code>
      )}
      {diagnostic.resourceRefs !== undefined && diagnostic.resourceRefs.length > 0 && (
        <code style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
          {diagnostic.resourceRefs
            .map((ref) => ref.path ?? ref.reference ?? ref.id ?? ref.resourceType)
            .join(', ')}
        </code>
      )}
    </li>
  );
}

function diagnosticTestId(prefix: string, code: string): string {
  return `${prefix}-${code
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()}`;
}

function severityColor(severity: Diagnostic['severity']): string {
  if (severity === 'error') return 'var(--pedigree-affected)';
  if (severity === 'warning') return 'var(--pedigree-proband)';
  return 'var(--pedigree-text)';
}

function ValidationSvg({ showRelativeLabels }: { showRelativeLabels: boolean }) {
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
            aria-label="Validated pedigree chart"
            style={{
              width: '100%',
              maxWidth: 720,
              height: 'auto',
              background: 'var(--pedigree-bg, transparent)',
            }}
          >
            <title>Validated pedigree chart</title>
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
  const { x, y, sex, vital, affected, proband, label, labelMaxWidth, labelOffsetX } = props;
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
    <g transform={`translate(${x} ${y})`}>
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
