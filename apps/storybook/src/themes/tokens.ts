/**
 * Token contract every theme provider sets on its wrapper element. The shared
 * `<PedigreeView>` reads these via `var(--pedigree-…)` so the SVG is theme-
 * agnostic — swapping themes only swaps the values here.
 */
export interface PedigreeTokens {
  bg: string;
  stroke: string;
  fill: string;
  affected: string;
  proband: string;
  text: string;
  strokeWidth: string;
  probandStrokeWidth: string;
  fontFamily: string;
}

export function tokensToCssVars(t: PedigreeTokens): React.CSSProperties {
  return {
    '--pedigree-bg': t.bg,
    '--pedigree-stroke': t.stroke,
    '--pedigree-fill': t.fill,
    '--pedigree-affected': t.affected,
    '--pedigree-proband': t.proband,
    '--pedigree-text': t.text,
    '--pedigree-stroke-width': t.strokeWidth,
    '--pedigree-proband-stroke-width': t.probandStrokeWidth,
    '--pedigree-font-family': t.fontFamily,
    fontFamily: t.fontFamily,
  } as React.CSSProperties;
}
