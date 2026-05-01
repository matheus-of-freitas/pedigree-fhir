import {
  type LayoutOptions,
  Sex,
  VitalStatus,
  createPedigreeStore,
  inferRelationships,
  parsePedigree,
} from '@pedigree/core';
import { Edge, Node, Pedigree, PedigreeProvider, Sibship } from '@pedigree/react';
import { type ReactNode, useMemo } from 'react';
import type { Fixture } from '../fixtures/three-gen.js';

const NODE_SIZE = 40;

export interface PedigreeViewProps {
  fixture: Fixture;
  layoutOptions?: LayoutOptions;
}

/**
 * Token-driven pedigree renderer used across every story. All visual choices
 * read from CSS variables set by the theme provider — there are no theme
 * branches in here. Swap themes, swap colors.
 */
export function PedigreeView({ fixture, layoutOptions = {} }: PedigreeViewProps) {
  const store = useMemo(() => {
    const graph = inferRelationships(parsePedigree(fixture.patient, fixture.familyHistory));
    return createPedigreeStore({ graph, layoutOptions });
  }, [fixture, layoutOptions]);

  return (
    <PedigreeProvider store={store}>
      <Pedigree>
        {({ graph, layout }) => {
          const { minX, minY, width, height } = layout.bounds;
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
              <title>Pedigree chart</title>
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
                    <IndividualGlyph
                      x={position.x}
                      y={position.y}
                      sex={individual.semantics.sex}
                      vital={individual.semantics.vital}
                      affected={individual.semantics.conditions.some(
                        (c) => c.status === 'affected',
                      )}
                      proband={individual.id === graph.proband}
                      label={individual.name}
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

function IndividualGlyph(props: {
  x: number;
  y: number;
  sex: Sex;
  vital: VitalStatus;
  affected: boolean;
  proband: boolean;
  label: string | undefined;
}): ReactNode {
  const { x, y, sex, vital, affected, proband, label } = props;
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
      {label !== undefined && (
        <text y={half + 18} textAnchor="middle" fontSize={11} fill="var(--pedigree-text)">
          {label}
        </text>
      )}
    </g>
  );
}
