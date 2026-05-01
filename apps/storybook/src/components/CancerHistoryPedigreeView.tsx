import {
  DEFAULT_ONCOLOGY_PALETTE,
  type Individual,
  type LayoutOptions,
  type OncologyPaletteEntry,
  Sex,
  VitalStatus,
  computeNodeLabelMaxWidths,
  computeNodeLabelXOffsets,
  computeParentDropStemLabelObstacles,
  createPedigreeStore,
  getConditionDisplay,
  getConditionDisplayList,
  getConditionOnsetDisplay,
  getIndividualAgeDisplay,
  getOncologyMarkers,
  hasAffectedConditions,
  inferRelationships,
  parsePedigree,
  resolveIndividualDisplayLabel,
  wrapLabelLines,
} from '@pedigree/core';
import { Edge, Node, Pedigree, PedigreeProvider, Sibship } from '@pedigree/react';
import { type ReactNode, useMemo } from 'react';
import type { Fixture } from '../fixtures/three-gen.js';

const NODE_SIZE = 40;
const DETAIL_LAYOUT: LayoutOptions = {
  generationGap: 180,
  siblingPitch: 110,
};
const OVERLAY_LAYOUT: LayoutOptions = {
  generationGap: 220,
  siblingPitch: 120,
};

export type CancerHistoryProfile = 'condition-detail' | 'oncology-overlay';

export interface OncologyProfileOptions {
  palette: readonly OncologyPaletteEntry[];
  showLegend: boolean;
  showAgeLabels: boolean;
  showDiagnosisAge: boolean;
  asOfDate?: Date | string;
  maxMarkers: number;
}

export interface CancerHistoryPedigreeViewProps {
  fixture: Fixture;
  layoutOptions?: LayoutOptions;
  profile?: CancerHistoryProfile;
  oncologyOptions?: Partial<OncologyProfileOptions>;
}

interface LabelLine {
  text: string;
  fill: string;
  fontSize: number;
  lineHeight: number;
  fontWeight?: number;
}

const DEFAULT_ONCOLOGY_OPTIONS: OncologyProfileOptions = {
  palette: DEFAULT_ONCOLOGY_PALETTE,
  showLegend: true,
  showAgeLabels: true,
  showDiagnosisAge: true,
  asOfDate: '2024-06-01',
  maxMarkers: 4,
};

export function CancerHistoryPedigreeView({
  fixture,
  layoutOptions = {},
  profile = 'condition-detail',
  oncologyOptions,
}: CancerHistoryPedigreeViewProps) {
  const oncology = {
    ...DEFAULT_ONCOLOGY_OPTIONS,
    ...oncologyOptions,
    palette: oncologyOptions?.palette ?? DEFAULT_ONCOLOGY_OPTIONS.palette,
  };
  const store = useMemo(() => {
    const graph = inferRelationships(parsePedigree(fixture.patient, fixture.familyHistory));
    return createPedigreeStore({
      graph,
      layoutOptions: {
        ...(profile === 'oncology-overlay' ? OVERLAY_LAYOUT : DETAIL_LAYOUT),
        ...layoutOptions,
      },
    });
  }, [fixture, layoutOptions, profile]);

  return (
    <PedigreeProvider store={store}>
      <Pedigree>
        {({ graph, layout }) => {
          const { minX, minY, width, height } = layout.bounds;
          const labelLinesById = new Map(
            layout.nodes.map((node) => {
              const individual = graph.individuals[node.id];
              return [
                node.id,
                individual === undefined
                  ? []
                  : profile === 'oncology-overlay'
                    ? buildOncologyLabelLines(individual, oncology)
                    : buildDetailLabelLines(individual),
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
          const legendEntries = oncology.showLegend ? oncology.palette : [];
          const extraBottom =
            76 +
            maxWrappedLineCount * 14 +
            (profile === 'oncology-overlay' && legendEntries.length > 0 ? 44 : 0);

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <svg
                viewBox={`${minX - 40} ${minY - 40} ${width + 80} ${height + extraBottom}`}
                role="img"
                aria-label="Family cancer history pedigree"
                style={{
                  width: '100%',
                  maxWidth: 920,
                  height: 'auto',
                  background: 'var(--pedigree-bg, transparent)',
                }}
              >
                <title>Family cancer history pedigree</title>
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
                    {({ individual, position }) =>
                      profile === 'oncology-overlay' ? (
                        <OncologyGlyph
                          nodeId={individual.id}
                          x={position.x}
                          y={position.y}
                          sex={individual.semantics.sex}
                          vital={individual.semantics.vital}
                          affected={hasAffectedConditions(individual.semantics.conditions)}
                          proband={individual.id === graph.proband}
                          markers={
                            getOncologyMarkers(individual.semantics.conditions, oncology.palette, {
                              maxMarkers: oncology.maxMarkers,
                            }).markers
                          }
                          labelLines={labelLinesById.get(individual.id) ?? []}
                          labelMaxWidth={labelWidths.get(individual.id)}
                          labelOffsetX={labelOffsets.get(individual.id) ?? 0}
                        />
                      ) : (
                        <DetailGlyph
                          x={position.x}
                          y={position.y}
                          sex={individual.semantics.sex}
                          vital={individual.semantics.vital}
                          affected={hasAffectedConditions(individual.semantics.conditions)}
                          proband={individual.id === graph.proband}
                          labelLines={labelLinesById.get(individual.id) ?? []}
                          labelMaxWidth={labelWidths.get(individual.id)}
                          labelOffsetX={labelOffsets.get(individual.id) ?? 0}
                        />
                      )
                    }
                  </Node>
                ))}
              </svg>
              {profile === 'oncology-overlay' && oncology.showLegend && legendEntries.length > 0 ? (
                <OncologyLegend entries={legendEntries} />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    border: '1px solid rgba(31, 41, 51, 0.12)',
                    borderRadius: 8,
                    padding: 12,
                    background: 'rgba(255, 255, 255, 0.72)',
                  }}
                >
                  <strong style={{ color: 'var(--pedigree-text)' }}>Tracked cancer history</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      ...new Set(
                        Object.values(graph.individuals)
                          .flatMap((individual) =>
                            getConditionDisplayList(individual.semantics.conditions),
                          )
                          .filter((label) => !label.startsWith('+')),
                      ),
                    ].map((condition) => (
                      <span
                        key={condition}
                        style={{
                          borderRadius: 999,
                          padding: '4px 10px',
                          border: '1px solid rgba(31, 41, 51, 0.12)',
                          color: 'var(--pedigree-text)',
                          fontSize: 13,
                        }}
                      >
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }}
      </Pedigree>
    </PedigreeProvider>
  );
}

function buildDetailLabelLines(
  individual: Pick<Individual, 'name' | 'relationshipToProband' | 'semantics'>,
): LabelLine[] {
  const relationLabel = resolveIndividualDisplayLabel(individual, {
    preferRelationshipLabel: true,
  });
  const conditionLabel = getConditionDisplayList(individual.semantics.conditions, {
    maxItems: 2,
  }).join(' • ');
  return [
    ...(relationLabel === undefined
      ? []
      : [{ text: relationLabel, fill: 'var(--pedigree-text)', fontSize: 11, lineHeight: 12 }]),
    ...(conditionLabel === ''
      ? []
      : [
          {
            text: conditionLabel,
            fill: 'var(--pedigree-affected)',
            fontSize: 10,
            lineHeight: 11,
          },
        ]),
  ];
}

function buildOncologyLabelLines(
  individual: Pick<
    Individual,
    'name' | 'relationshipToProband' | 'birthDate' | 'age' | 'deceasedAge' | 'semantics'
  >,
  oncology: OncologyProfileOptions,
): LabelLine[] {
  const primaryLabel =
    resolveIndividualDisplayLabel(individual) ??
    resolveIndividualDisplayLabel(individual, { preferRelationshipLabel: true });
  const ageDisplay = oncology.showAgeLabels
    ? getIndividualAgeDisplay(
        individual,
        oncology.asOfDate === undefined ? {} : { asOfDate: oncology.asOfDate },
      )
    : undefined;
  const { markers, overflowConditions } = getOncologyMarkers(
    individual.semantics.conditions,
    oncology.palette,
    { maxMarkers: oncology.maxMarkers },
  );

  return [
    ...(primaryLabel === undefined
      ? []
      : [
          {
            text: primaryLabel,
            fill: 'var(--pedigree-text)',
            fontSize: 11,
            lineHeight: 12,
            fontWeight: 600,
          },
        ]),
    ...(ageDisplay === undefined
      ? []
      : [
          { text: `Age ${ageDisplay}`, fill: 'var(--pedigree-text)', fontSize: 10, lineHeight: 11 },
        ]),
    ...markers.map((marker) => ({
      text: formatConditionLine(marker.condition, oncology.showDiagnosisAge),
      fill: marker.color,
      fontSize: 10,
      lineHeight: 11,
    })),
    ...overflowConditions.map((condition) => ({
      text: formatConditionLine(condition, oncology.showDiagnosisAge),
      fill: 'var(--pedigree-text)',
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

function formatConditionLine(
  condition: Parameters<typeof getConditionDisplay>[0],
  showDiagnosisAge: boolean,
): string {
  const label = compactConditionLabel(getConditionDisplay(condition));
  const onsetAge = showDiagnosisAge ? getConditionOnsetDisplay(condition) : undefined;
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
): ReactNode {
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

function DetailGlyph(props: {
  x: number;
  y: number;
  sex: Sex;
  vital: VitalStatus;
  affected: boolean;
  proband: boolean;
  labelLines: readonly LabelLine[];
  labelMaxWidth: number | undefined;
  labelOffsetX: number;
}): ReactNode {
  const { x, y, sex, vital, affected, proband, labelLines, labelMaxWidth, labelOffsetX } = props;
  const half = NODE_SIZE / 2;
  const fill = affected ? 'var(--pedigree-affected)' : 'var(--pedigree-fill)';
  const stroke = proband ? 'var(--pedigree-proband)' : 'var(--pedigree-stroke)';
  const sw = proband ? 'var(--pedigree-proband-stroke-width)' : 'var(--pedigree-stroke-width)';

  return (
    <g transform={`translate(${x} ${y})`}>
      {renderShape(sex, half, { fill, stroke, strokeWidth: sw })}
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
      <LabelBlock lines={labelLines} maxWidth={labelMaxWidth} x={labelOffsetX} y={half + 18} />
    </g>
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
}): ReactNode {
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
  const stroke = proband ? 'var(--pedigree-proband)' : 'var(--pedigree-stroke)';
  const sw = proband ? 'var(--pedigree-proband-stroke-width)' : 'var(--pedigree-stroke-width)';
  const clipId = `oncology-clip-${nodeId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const baseFill =
    markers.length === 0 && affected ? 'var(--pedigree-affected)' : 'var(--pedigree-fill)';
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
      {renderShape(sex, half, { fill: 'transparent', stroke, strokeWidth: sw })}
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
      <LabelBlock lines={labelLines} maxWidth={labelMaxWidth} x={labelOffsetX} y={half + 18} />
    </g>
  );
}

function LabelBlock(props: {
  lines: readonly LabelLine[];
  maxWidth: number | undefined;
  x: number;
  y: number;
}): ReactNode {
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

function OncologyLegend(props: { entries: readonly OncologyPaletteEntry[] }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        border: '1px solid rgba(31, 41, 51, 0.12)',
        borderRadius: 8,
        padding: 12,
        background: 'rgba(255, 255, 255, 0.72)',
      }}
    >
      <strong style={{ color: 'var(--pedigree-text)', marginRight: 8 }}>Cancer legend</strong>
      {props.entries.map((entry) => (
        <span
          key={entry.key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--pedigree-text)',
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
  );
}
