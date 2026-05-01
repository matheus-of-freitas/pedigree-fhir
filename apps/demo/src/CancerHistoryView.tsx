import {
  DEFAULT_ONCOLOGY_PALETTE,
  type Individual,
  Sex,
  VitalStatus,
  computeNodeLabelMaxWidths,
  computeNodeLabelXOffsets,
  computeParentDropStemLabelObstacles,
  computePedigreeLayout,
  getConditionDisplay,
  getConditionOnsetDisplay,
  getIndividualAgeDisplay,
  getOncologyMarkers,
  hasAffectedConditions,
  inferRelationships,
  parsePedigree,
  resolveIndividualDisplayLabel,
  wrapLabelLines,
} from '@pedigree/core';
import { cancerFamilyHistory, cancerProband } from './cancerFixture.js';

const NODE_SIZE = 40;
const AS_OF_DATE = '2024-06-01';

interface LabelLine {
  text: string;
  fill: string;
  fontSize: number;
  lineHeight: number;
  fontWeight?: number;
}

export function CancerHistoryView() {
  const graph = inferRelationships(parsePedigree(cancerProband, cancerFamilyHistory));
  const layout = computePedigreeLayout(graph, {
    generationGap: 220,
    siblingPitch: 120,
  });
  const { minX, minY, width, height } = layout.bounds;
  const labelLinesById = new Map(
    layout.nodes.map((node) => {
      const individual = graph.individuals[node.id];
      return [node.id, individual === undefined ? [] : buildOncologyLabelLines(individual)];
    }),
  );
  const labelObstacles = computeParentDropStemLabelObstacles(
    layout.partnerEdges,
    layout.parentDrops,
  );
  const labelWidths = computeNodeLabelMaxWidths(layout.nodes, { obstacles: labelObstacles });
  const labelOffsets = computeNodeLabelXOffsets(
    layout.nodes.map((node) => ({
      ...node,
      label: summarizeLabelLines(labelLinesById.get(node.id)),
      maxWidth: labelWidths.get(node.id),
    })),
    { fontSize: 11, obstacles: labelObstacles },
  );
  const maxWrappedLineCount = Math.max(
    1,
    ...layout.nodes.map((node) =>
      countRenderedLines(labelLinesById.get(node.id) ?? [], labelWidths.get(node.id)),
    ),
  );
  const extraBottom = 120 + maxWrappedLineCount * 14;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <svg
        viewBox={`${minX - 40} ${minY - 40} ${width + 80} ${height + extraBottom}`}
        style={{ width: '100%', maxWidth: 920, height: 'auto', background: 'white' }}
        role="img"
        aria-label="Family cancer history pedigree"
      >
        <title>Family cancer history pedigree</title>
        {layout.partnerEdges.map((edge) => (
          <path key={edge.coupleId} d={edge.path} fill="none" stroke="#7c2d12" strokeWidth={1.5} />
        ))}
        {layout.parentDrops.map((drop) => (
          <path key={drop.coupleId} d={drop.path} fill="none" stroke="#7c2d12" strokeWidth={1.5} />
        ))}
        {layout.nodes.map((node) => {
          const individual = graph.individuals[node.id];
          if (individual === undefined) return null;

          return (
            <OncologyGlyph
              key={individual.id}
              nodeId={individual.id}
              x={node.x}
              y={node.y}
              sex={individual.semantics.sex}
              vital={individual.semantics.vital}
              affected={hasAffectedConditions(individual.semantics.conditions)}
              proband={individual.id === graph.proband}
              markers={getOncologyMarkers(individual.semantics.conditions).markers}
              labelLines={labelLinesById.get(individual.id) ?? []}
              labelMaxWidth={labelWidths.get(individual.id)}
              labelOffsetX={labelOffsets.get(individual.id) ?? 0}
            />
          );
        })}
      </svg>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 12,
          background: '#fff',
        }}
      >
        <strong style={{ color: '#374151', marginRight: 8 }}>Cancer legend</strong>
        {DEFAULT_ONCOLOGY_PALETTE.map((entry) => (
          <span
            key={entry.key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#374151',
              fontSize: 13,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: entry.color,
                border: '1px solid rgba(17, 24, 39, 0.22)',
              }}
            />
            {entry.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function buildOncologyLabelLines(
  individual: Pick<
    Individual,
    'name' | 'relationshipToProband' | 'birthDate' | 'age' | 'deceasedAge' | 'semantics'
  >,
): LabelLine[] {
  const primaryLabel =
    resolveIndividualDisplayLabel(individual) ??
    resolveIndividualDisplayLabel(individual, { preferRelationshipLabel: true });
  const ageDisplay = getIndividualAgeDisplay(individual, { asOfDate: AS_OF_DATE });
  const { markers, overflowConditions } = getOncologyMarkers(individual.semantics.conditions);

  return [
    ...(primaryLabel === undefined
      ? []
      : [{ text: primaryLabel, fill: '#111827', fontSize: 11, lineHeight: 12, fontWeight: 600 }]),
    ...(ageDisplay === undefined
      ? []
      : [{ text: `Age ${ageDisplay}`, fill: '#374151', fontSize: 10, lineHeight: 11 }]),
    ...markers.map((marker) => ({
      text: formatConditionLine(marker.condition),
      fill: marker.color,
      fontSize: 10,
      lineHeight: 11,
    })),
    ...overflowConditions.map((condition) => ({
      text: formatConditionLine(condition),
      fill: '#374151',
      fontSize: 10,
      lineHeight: 11,
    })),
  ];
}

function summarizeLabelLines(lines: readonly LabelLine[] | undefined): string | undefined {
  if (lines === undefined || lines.length === 0) return undefined;
  return lines.map((line) => line.text).join(' ');
}

function countRenderedLines(lines: readonly LabelLine[], maxWidth: number | undefined): number {
  const width = maxWidth ?? 160;
  return lines.reduce((count, line) => {
    const wrapped = wrapLabelLines(line.text, width, { fontSize: line.fontSize });
    return count + Math.max(1, wrapped.length);
  }, 0);
}

function compactConditionLabel(label: string): string {
  return label.replace(/\s+cancer$/i, '');
}

function formatConditionLine(condition: Parameters<typeof getConditionDisplay>[0]): string {
  const label = compactConditionLabel(getConditionDisplay(condition));
  const onsetAge = getConditionOnsetDisplay(condition);
  return onsetAge === undefined ? label : `${label} ${onsetAge}`;
}

function renderShape(
  sex: Sex,
  half: number,
  props: {
    fill: string;
    stroke?: string;
    strokeWidth?: number | string;
  },
) {
  if (sex === Sex.Male) {
    return (
      <rect
        x={-half}
        y={-half}
        width={NODE_SIZE}
        height={NODE_SIZE}
        fill={props.fill}
        stroke={props.stroke}
        strokeWidth={props.strokeWidth}
      />
    );
  }

  if (sex === Sex.Female) {
    return (
      <circle r={half} fill={props.fill} stroke={props.stroke} strokeWidth={props.strokeWidth} />
    );
  }

  return (
    <polygon
      points={`0,${-half} ${half},0 0,${half} ${-half},0`}
      fill={props.fill}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth}
    />
  );
}

function OncologyGlyph(props: {
  nodeId: string;
  x: number;
  y: number;
  sex: Sex;
  vital: VitalStatus;
  affected: boolean;
  proband: boolean;
  markers: readonly { key: string; color: string }[];
  labelLines: readonly LabelLine[];
  labelMaxWidth: number | undefined;
  labelOffsetX: number;
}) {
  const {
    nodeId,
    x,
    y,
    sex,
    vital,
    affected,
    proband,
    markers,
    labelLines,
    labelMaxWidth,
    labelOffsetX,
  } = props;
  const half = NODE_SIZE / 2;
  const stroke = '#7c2d12';
  const strokeWidth = proband ? 3 : 1.5;
  const clipId = `demo-oncology-clip-${nodeId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const baseFill = markers.length === 0 && affected ? '#fee2e2' : '#ffffff';
  const quadrants = [
    { x: -half, y: -half },
    { x: 0, y: -half },
    { x: -half, y: 0 },
    { x: 0, y: 0 },
  ];

  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <clipPath id={clipId}>{renderShape(sex, half, { fill: 'white' })}</clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x={-half} y={-half} width={NODE_SIZE} height={NODE_SIZE} fill={baseFill} />
        {markers.map((marker, index) => {
          const quadrant = quadrants[index];
          if (quadrant === undefined) return null;
          return (
            <rect
              key={`${nodeId}-${marker.key}`}
              x={quadrant.x}
              y={quadrant.y}
              width={half}
              height={half}
              fill={marker.color}
            />
          );
        })}
        {markers.length > 1 && (
          <>
            <line x1={0} y1={-half} x2={0} y2={half} stroke="rgba(17, 24, 39, 0.25)" />
            <line x1={-half} y1={0} x2={half} y2={0} stroke="rgba(17, 24, 39, 0.25)" />
          </>
        )}
      </g>
      {renderShape(sex, half, { fill: 'transparent', stroke, strokeWidth })}
      {vital === VitalStatus.Deceased && (
        <line
          x1={-half - 4}
          y1={half + 4}
          x2={half + 4}
          y2={-half - 4}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}
      {proband && (
        <polygon
          points={`${-half - 14},${half + 14} ${-half - 4},${half + 4} ${-half - 6},${half + 14}`}
          fill={stroke}
        />
      )}
      <LabelBlock lines={labelLines} maxWidth={labelMaxWidth} x={labelOffsetX} y={half + 18} />
    </g>
  );
}

function LabelBlock(props: {
  lines: readonly LabelLine[];
  maxWidth: number | undefined;
  x: number;
  y: number;
}) {
  const width = props.maxWidth ?? 160;
  const rendered = props.lines.flatMap((line) => {
    const wrapped = wrapLabelLines(line.text, width, { fontSize: line.fontSize });
    return (wrapped.length === 0 ? [''] : wrapped).map((text, index) => ({
      ...line,
      text,
      key: `${line.text}-${index}`,
    }));
  });
  if (rendered.length === 0) return null;

  return (
    <text x={props.x} y={props.y} textAnchor="middle" xmlSpace="preserve">
      {rendered.map((line, index) => (
        <tspan
          key={line.key}
          x={props.x}
          dy={index === 0 ? 0 : line.lineHeight}
          fontSize={line.fontSize}
          fill={line.fill}
          fontWeight={line.fontWeight}
        >
          {index === rendered.length - 1 ? line.text : `${line.text} `}
        </tspan>
      ))}
    </text>
  );
}
