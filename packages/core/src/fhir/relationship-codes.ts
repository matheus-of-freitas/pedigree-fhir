import { Sex } from '../psc/semantics.js';

/**
 * Subset of the HL7 v3 FamilyMember code system relevant to a 3-generation
 * pedigree. Each code carries the metadata needed to place an individual on
 * the graph when the explicit genetics-parent/sibling extensions are absent
 * — generation offset relative to the proband, family side, and the sex
 * implied by the code itself (when it implies one).
 *
 * Code system: http://terminology.hl7.org/CodeSystem/v3-RoleCode
 */

export const FamilySide = {
  Maternal: 'maternal',
  Paternal: 'paternal',
  Self: 'self',
  /** Used for codes that don't disambiguate side (e.g. plain `COUSN`). */
  Unknown: 'unknown',
} as const;
export type FamilySide = (typeof FamilySide)[keyof typeof FamilySide];

/**
 * Generation offset relative to the proband.
 *  -2 = grandparent generation
 *  -1 = parent generation (incl. aunts/uncles)
 *   0 = proband generation (incl. siblings, cousins)
 *  +1 = child generation (incl. nephews/nieces)
 */
export type GenerationOffset = -2 | -1 | 0 | 1;

export interface RelationshipMetadata {
  code: string;
  display: string;
  generation: GenerationOffset;
  side: FamilySide;
  /** The sex the code itself implies, when any. */
  sexHint: Sex | undefined;
}

const META = (
  code: string,
  display: string,
  generation: GenerationOffset,
  side: FamilySide,
  sexHint: Sex | undefined,
): RelationshipMetadata => ({ code, display, generation, side, sexHint });

const ENTRIES: RelationshipMetadata[] = [
  // Generation -1: direct parents
  META('NMTH', 'natural mother', -1, FamilySide.Maternal, Sex.Female),
  META('MTH', 'mother', -1, FamilySide.Maternal, Sex.Female),
  META('NFTH', 'natural father', -1, FamilySide.Paternal, Sex.Male),
  META('FTH', 'father', -1, FamilySide.Paternal, Sex.Male),

  // Generation -1: aunts/uncles
  META('MAUNT', 'maternal aunt', -1, FamilySide.Maternal, Sex.Female),
  META('PAUNT', 'paternal aunt', -1, FamilySide.Paternal, Sex.Female),
  META('MUNCLE', 'maternal uncle', -1, FamilySide.Maternal, Sex.Male),
  META('PUNCLE', 'paternal uncle', -1, FamilySide.Paternal, Sex.Male),

  // Generation -2: grandparents
  META('MGRMTH', 'maternal grandmother', -2, FamilySide.Maternal, Sex.Female),
  META('MGRFTH', 'maternal grandfather', -2, FamilySide.Maternal, Sex.Male),
  META('PGRMTH', 'paternal grandmother', -2, FamilySide.Paternal, Sex.Female),
  META('PGRFTH', 'paternal grandfather', -2, FamilySide.Paternal, Sex.Male),

  // Generation 0: siblings, twin sibs, cousins
  META('NSIS', 'natural sister', 0, FamilySide.Self, Sex.Female),
  META('NBRO', 'natural brother', 0, FamilySide.Self, Sex.Male),
  META('SIS', 'sister', 0, FamilySide.Self, Sex.Female),
  META('BRO', 'brother', 0, FamilySide.Self, Sex.Male),
  META('TWINSIS', 'twin sister', 0, FamilySide.Self, Sex.Female),
  META('TWINBRO', 'twin brother', 0, FamilySide.Self, Sex.Male),
  META('TWIN', 'twin', 0, FamilySide.Self, undefined),
  META('MCOUSN', 'maternal cousin', 0, FamilySide.Maternal, undefined),
  META('PCOUSN', 'paternal cousin', 0, FamilySide.Paternal, undefined),
  META('COUSN', 'cousin', 0, FamilySide.Unknown, undefined),

  // Generation +1: children, nephews/nieces
  META('SON', 'son', 1, FamilySide.Self, Sex.Male),
  META('DAU', 'daughter', 1, FamilySide.Self, Sex.Female),
  META('NCHILD', 'natural child', 1, FamilySide.Self, undefined),
  META('CHILD', 'child', 1, FamilySide.Self, undefined),
  META('NEPHEW', 'nephew', 1, FamilySide.Unknown, Sex.Male),
  META('NIECE', 'niece', 1, FamilySide.Unknown, Sex.Female),
];

const TABLE = new Map<string, RelationshipMetadata>(ENTRIES.map((m) => [m.code, m]));

/**
 * Look up metadata for an HL7 v3 FamilyMember code. Returns `undefined` when
 * the code is unknown to this library — callers (parse.ts, validation/) are
 * expected to surface that as a "unknown relationship code" warning rather
 * than crash.
 */
export function getRelationshipMetadata(code: string): RelationshipMetadata | undefined {
  return TABLE.get(code);
}

/** All known codes, in declaration order. Useful for iteration in tests. */
export function listRelationshipCodes(): readonly RelationshipMetadata[] {
  return ENTRIES;
}
