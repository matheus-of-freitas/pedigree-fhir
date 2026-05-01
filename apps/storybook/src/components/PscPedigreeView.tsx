import {
  Adopted,
  type PedigreeGraph,
  Sex,
  VitalStatus,
  computeNodeLabelMaxWidths,
  computeNodeLabelXOffsets,
  computeParentDropStemLabelObstacles,
  createPedigreeStore,
  resolveIndividualDisplayLabel,
} from '@pedigree/core';
import { Edge, Node, Pedigree, PedigreeProvider, Sibship } from '@pedigree/react';
import { type ReactNode, useMemo } from 'react';
import { NodeLabel } from './NodeLabel.js';

const NODE_SIZE = 40;

export interface PscPedigreeViewProps {
  graph: PedigreeGraph;
  showRelativeLabels?: boolean;
}

export function PscPedigreeView({ graph, showRelativeLabels = false }: PscPedigreeViewProps) {
  const store = useMemo(() => createPedigreeStore({ graph, layoutOptions: {} }), [graph]);

  return (
    <PedigreeProvider store={store}>
      <Pedigree>
        {({ graph: currentGraph, layout }) => {
          const { minX, minY, width, height } = layout.bounds;
          const labels = new Map(
            layout.nodes.map((node) => {
              const individual = currentGraph.individuals[node.id];
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
              viewBox={`${minX - 36} ${minY - 36} ${width + 72} ${height + 86}`}
              role="img"
              aria-label="PSC layout polish pedigree chart"
              style={{
                width: '100%',
                maxWidth: 840,
                height: 'auto',
                background: 'var(--pedigree-bg, transparent)',
              }}
            >
              <title>PSC layout polish pedigree chart</title>
              {layout.partnerEdges.map((edge) => (
                <Edge key={edge.coupleId} coupleId={edge.coupleId}>
                  {(e) => (
                    <path
                      d={e.path}
                      fill="none"
                      stroke="var(--pedigree-stroke)"
                      strokeWidth="var(--pedigree-stroke-width)"
                      data-testid={`edge-${e.coupleId}`}
                      data-consanguineous={e.consanguineous ? 'true' : 'false'}
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
                      data-testid={`drop-${d.coupleId}`}
                      data-twin-junctions={d.twinJunctions.length}
                    />
                  )}
                </Sibship>
              ))}
              {layout.nodes.map((n) => (
                <Node key={n.id} id={n.id}>
                  {({ individual, position }) => (
                    <PscGlyph
                      id={individual.id}
                      x={position.x}
                      y={position.y}
                      sex={individual.semantics.sex}
                      vital={individual.semantics.vital}
                      adopted={individual.semantics.adopted}
                      affected={individual.semantics.conditions.some(
                        (c) => c.status === 'affected',
                      )}
                      proband={individual.id === currentGraph.proband}
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
    </PedigreeProvider>
  );
}

function PscGlyph(props: {
  id: string;
  x: number;
  y: number;
  sex: Sex;
  vital: VitalStatus;
  adopted: Adopted;
  affected: boolean;
  proband: boolean;
  label: string | undefined;
  labelMaxWidth: number | undefined;
  labelOffsetX: number;
}): ReactNode {
  const { id, x, y, sex, vital, adopted, affected, proband, label, labelMaxWidth, labelOffsetX } =
    props;
  const half = NODE_SIZE / 2;
  const fill = affected ? 'var(--pedigree-affected)' : 'var(--pedigree-fill)';
  const stroke = proband ? 'var(--pedigree-proband)' : 'var(--pedigree-stroke)';
  const sw = proband ? 'var(--pedigree-proband-stroke-width)' : 'var(--pedigree-stroke-width)';

  return (
    <g
      transform={`translate(${x} ${y})`}
      data-testid={`node-${id}`}
      data-vital={vital}
      data-adopted={adopted}
    >
      {shapeFor({ sex, vital, fill, stroke, strokeWidth: sw })}
      {drawVitalOverlay({ vital, stroke, strokeWidth: sw, half })}
      {drawAdoptionBrackets({ adopted, stroke, half })}
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

function shapeFor(args: {
  sex: Sex;
  vital: VitalStatus;
  fill: string;
  stroke: string;
  strokeWidth: string;
}): ReactNode {
  const half = NODE_SIZE / 2;
  if (args.vital === VitalStatus.Miscarriage || args.vital === VitalStatus.TerminatedPregnancy) {
    return (
      <polygon
        points={`0,${-half} ${half},${half} ${-half},${half}`}
        fill={args.fill}
        stroke={args.stroke}
        strokeWidth={args.strokeWidth}
      />
    );
  }
  if (args.vital === VitalStatus.Stillbirth) {
    return (
      <polygon
        points={`0,${-half} ${half},0 0,${half} ${-half},0`}
        fill={args.fill}
        stroke={args.stroke}
        strokeWidth={args.strokeWidth}
      />
    );
  }
  if (args.sex === Sex.Male) {
    return (
      <rect
        x={-half}
        y={-half}
        width={NODE_SIZE}
        height={NODE_SIZE}
        fill={args.fill}
        stroke={args.stroke}
        strokeWidth={args.strokeWidth}
      />
    );
  }
  if (args.sex === Sex.Female) {
    return <circle r={half} fill={args.fill} stroke={args.stroke} strokeWidth={args.strokeWidth} />;
  }
  return (
    <polygon
      points={`0,${-half} ${half},0 0,${half} ${-half},0`}
      fill={args.fill}
      stroke={args.stroke}
      strokeWidth={args.strokeWidth}
    />
  );
}

function drawVitalOverlay(args: {
  vital: VitalStatus;
  stroke: string;
  strokeWidth: string;
  half: number;
}): ReactNode {
  if (args.vital === VitalStatus.Living) return null;
  const slash = (
    <line
      x1={-args.half - 4}
      y1={args.half + 4}
      x2={args.half + 4}
      y2={-args.half - 4}
      stroke={args.stroke}
      strokeWidth={args.strokeWidth}
    />
  );
  if (args.vital !== VitalStatus.TerminatedPregnancy) return slash;
  return (
    <>
      {slash}
      <line
        x1={-args.half * 0.5}
        y1={args.half * 0.2}
        x2={args.half * 0.5}
        y2={args.half * 0.2}
        stroke={args.stroke}
        strokeWidth={args.strokeWidth}
      />
    </>
  );
}

function drawAdoptionBrackets(args: {
  adopted: Adopted;
  stroke: string;
  half: number;
}): ReactNode {
  if (args.adopted === Adopted.None) return null;
  const offset = args.half + 7;
  const top = -args.half - 4;
  const bottom = args.half + 4;
  const dash = args.adopted === Adopted.AdoptedOut ? '3 3' : undefined;
  return (
    <>
      <path
        d={`M ${-offset + 6} ${top} H ${-offset} V ${bottom} H ${-offset + 6}`}
        fill="none"
        stroke={args.stroke}
        strokeWidth={1.5}
        strokeDasharray={dash}
      />
      <path
        d={`M ${offset - 6} ${top} H ${offset} V ${bottom} H ${offset - 6}`}
        fill="none"
        stroke={args.stroke}
        strokeWidth={1.5}
        strokeDasharray={dash}
      />
    </>
  );
}
