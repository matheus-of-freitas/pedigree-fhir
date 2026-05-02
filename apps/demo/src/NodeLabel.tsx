import { wrapLabelLines } from '@pedigree-fhir/core';

export interface NodeLabelProps {
  label: string | undefined;
  maxWidth: number | undefined;
  x?: number;
  y: number;
  fontSize?: number;
  lineHeight?: number;
  fill: string;
}

export function NodeLabel({
  label,
  maxWidth,
  x = 0,
  y,
  fontSize = 10,
  lineHeight = 11,
  fill,
}: NodeLabelProps) {
  if (label === undefined) return null;
  const lines = wrapLabelLines(label, maxWidth ?? 160, { fontSize });
  if (lines.length === 0) return null;

  const seen = new Map<string, number>();

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={fontSize}
      fill={fill}
      aria-label={label}
      xmlSpace="preserve"
    >
      {lines.map((line, index) => {
        const count = (seen.get(line) ?? 0) + 1;
        seen.set(line, count);
        return (
          <tspan key={`${line}-${count}`} x={x} dy={index === 0 ? 0 : lineHeight}>
            {index === lines.length - 1 ? line : `${line} `}
          </tspan>
        );
      })}
    </text>
  );
}
