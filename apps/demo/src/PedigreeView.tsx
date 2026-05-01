import { Sex, VitalStatus } from '@pedigree/core';
import { Edge, Node, Pedigree, Sibship } from '@pedigree/react';

export interface PedigreeViewProps {
  /** Visual theme — "minimal" or "themed". The library doesn't ship either; both live here in the demo. */
  variant: 'minimal' | 'themed';
}

const NODE_SIZE = 40;

/** Render one individual using PSC-aligned shapes (square = male, circle = female, diamond = unknown). */
function IndividualGlyph(props: {
  sex: Sex;
  vital: VitalStatus;
  affected: boolean;
  proband: boolean;
  variant: 'minimal' | 'themed';
}) {
  const { sex, vital, affected, proband, variant } = props;
  const fill = variant === 'minimal' ? 'white' : affected ? '#dc2626' : '#fef3c7';
  const stroke = variant === 'minimal' ? 'black' : '#7c2d12';
  const strokeWidth = proband ? 3 : 1.5;
  const half = NODE_SIZE / 2;

  let shape: JSX.Element;
  switch (sex) {
    case Sex.Male:
      shape = (
        <rect
          x={-half}
          y={-half}
          width={NODE_SIZE}
          height={NODE_SIZE}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
      break;
    case Sex.Female:
      shape = <circle r={half} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    default:
      shape = (
        <polygon
          points={`0,${-half} ${half},0 0,${half} ${-half},0`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
  }

  return (
    <g>
      {shape}
      {vital === VitalStatus.Deceased && (
        <line x1={-half} y1={half} x2={half} y2={-half} stroke={stroke} strokeWidth={1.5} />
      )}
      {proband && (
        <polygon
          points={`${-half - 12},${half + 12} ${-half - 4},${half + 4} ${-half - 8},${half + 12}`}
          fill={stroke}
        />
      )}
    </g>
  );
}

export function PedigreeView({ variant }: PedigreeViewProps) {
  return (
    <Pedigree>
      {({ layout, graph }) => {
        const { minX, minY, width, height } = layout.bounds;
        return (
          <svg
            viewBox={`${minX - 30} ${minY - 30} ${width + 60} ${height + 60}`}
            style={{
              width: '100%',
              maxWidth: 720,
              height: 'auto',
              background: variant === 'themed' ? '#fff7ed' : 'white',
            }}
            role="img"
            aria-label={`Three-generation pedigree (${variant} theme)`}
          >
            <title>Three-generation pedigree ({variant} theme)</title>
            {layout.partnerEdges.map((edge) => (
              <Edge key={edge.coupleId} coupleId={edge.coupleId}>
                {(e) => (
                  <path
                    d={e.path}
                    fill="none"
                    stroke={variant === 'themed' ? '#7c2d12' : 'black'}
                    strokeWidth={1.5}
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
                    stroke={variant === 'themed' ? '#7c2d12' : 'black'}
                    strokeWidth={1.5}
                  />
                )}
              </Sibship>
            ))}
            {layout.nodes.map((n) => (
              <Node key={n.id} id={n.id}>
                {({ individual, position }) => {
                  const affected = individual.semantics.conditions.some(
                    (c) => c.status === 'affected',
                  );
                  return (
                    <g transform={`translate(${position.x}, ${position.y})`}>
                      <IndividualGlyph
                        sex={individual.semantics.sex}
                        vital={individual.semantics.vital}
                        affected={affected}
                        proband={individual.id === graph.proband}
                        variant={variant}
                      />
                      {individual.name !== undefined && (
                        <text
                          y={NODE_SIZE / 2 + 14}
                          textAnchor="middle"
                          fontSize={10}
                          fill={variant === 'themed' ? '#7c2d12' : 'black'}
                        >
                          {individual.name}
                        </text>
                      )}
                    </g>
                  );
                }}
              </Node>
            ))}
          </svg>
        );
      }}
    </Pedigree>
  );
}
