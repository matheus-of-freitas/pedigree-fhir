import type { R4Extension, R4FamilyMemberHistory, R4Reference } from './types.js';

/**
 * HL7 FHIR genetics-related extensions on FamilyMemberHistory.
 *
 * `FamilyMemberHistory.relationship` only encodes the link to the proband, so
 * a flat list of FMH resources cannot express the graph between relatives
 * (e.g. a maternal grandfather is the *father of the mother*, not a relation
 * to the proband). These extensions are the HL7-blessed way to assert those
 * inter-relative links so a 3-generation pedigree can round-trip losslessly.
 */
export const GENETICS_PARENT_EXTENSION =
  'http://hl7.org/fhir/StructureDefinition/family-member-history-genetics-parent';
export const GENETICS_SIBLING_EXTENSION =
  'http://hl7.org/fhir/StructureDefinition/family-member-history-genetics-sibling';
export const GENETICS_OBSERVATION_EXTENSION =
  'http://hl7.org/fhir/StructureDefinition/family-member-history-genetics-observation';

/**
 * v3 RoleCode values used inside the genetics-parent / genetics-sibling
 * extensions to disambiguate which side of a couple a person falls on. We
 * keep this narrow set as a string literal union so consumers get autocomplete
 * and we get exhaustive switch checks.
 */
export const ParentRole = {
  Mother: 'NMTH',
  Father: 'NFTH',
} as const;
export type ParentRole = (typeof ParentRole)[keyof typeof ParentRole];

export const SiblingRole = {
  /** Same-birth sibling (twin, triplet, …). */
  SameBirth: 'TWIN',
  /** Different birth: a regular sibling. */
  DifferentBirth: 'NSIB',
} as const;
export type SiblingRole = (typeof SiblingRole)[keyof typeof SiblingRole];

export interface GeneticsParent {
  /** Reference string, typically `FamilyMemberHistory/<id>`. */
  reference: string;
  /** Parent role (mother/father) when known. */
  role?: ParentRole;
}

export interface GeneticsSibling {
  reference: string;
  role?: SiblingRole;
}

/**
 * Pull all extensions matching a given URL off any FHIR element. Returns an
 * empty array when the host has no extension array at all — callers shouldn't
 * have to null-check.
 */
function findExtensions(
  host: { extension?: R4Extension[] | undefined },
  url: string,
): R4Extension[] {
  return (host.extension ?? []).filter((e) => e.url === url);
}

/**
 * Read a complex extension's nested sub-extensions by URL. The genetics-parent
 * and genetics-sibling extensions are *complex* extensions whose payload lives
 * in `Extension.extension[]`, not in a `valueX`.
 */
function findSubExtension(parent: R4Extension, url: string): R4Extension | undefined {
  return (parent.extension ?? []).find((e) => e.url === url);
}

function readReferenceFromComplexExtension(ext: R4Extension): GeneticsParent | undefined {
  const refExt = findSubExtension(ext, 'reference');
  const reference = refExt?.valueReference?.reference;
  if (reference === undefined) return undefined;
  const typeExt = findSubExtension(ext, 'type');
  const code = typeExt?.valueCodeableConcept?.coding?.[0]?.code;
  const role = code === ParentRole.Mother || code === ParentRole.Father ? code : undefined;
  return role === undefined ? { reference } : { reference, role };
}

function readSiblingFromComplexExtension(ext: R4Extension): GeneticsSibling | undefined {
  const refExt = findSubExtension(ext, 'reference');
  const reference = refExt?.valueReference?.reference;
  if (reference === undefined) return undefined;
  const typeExt = findSubExtension(ext, 'type');
  const code = typeExt?.valueCodeableConcept?.coding?.[0]?.code;
  const role =
    code === SiblingRole.SameBirth || code === SiblingRole.DifferentBirth ? code : undefined;
  return role === undefined ? { reference } : { reference, role };
}

export function getGeneticsParents(fmh: R4FamilyMemberHistory): GeneticsParent[] {
  const parents: GeneticsParent[] = [];
  for (const ext of findExtensions(fmh, GENETICS_PARENT_EXTENSION)) {
    const parent = readReferenceFromComplexExtension(ext);
    if (parent !== undefined) parents.push(parent);
  }
  return parents;
}

export function getGeneticsSiblings(fmh: R4FamilyMemberHistory): GeneticsSibling[] {
  const siblings: GeneticsSibling[] = [];
  for (const ext of findExtensions(fmh, GENETICS_SIBLING_EXTENSION)) {
    const sibling = readSiblingFromComplexExtension(ext);
    if (sibling !== undefined) siblings.push(sibling);
  }
  return siblings;
}

export function getGeneticsObservationRefs(fmh: R4FamilyMemberHistory): R4Reference[] {
  const refs: R4Reference[] = [];
  for (const ext of findExtensions(fmh, GENETICS_OBSERVATION_EXTENSION)) {
    if (ext.valueReference !== undefined) refs.push(ext.valueReference);
  }
  return refs;
}

const V3_ROLE_CODE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';

function buildParentExtension(parent: GeneticsParent): R4Extension {
  const subs: R4Extension[] = [
    { url: 'reference', valueReference: { reference: parent.reference } },
  ];
  if (parent.role !== undefined) {
    subs.push({
      url: 'type',
      valueCodeableConcept: {
        coding: [{ system: V3_ROLE_CODE_SYSTEM, code: parent.role }],
      },
    });
  }
  return { url: GENETICS_PARENT_EXTENSION, extension: subs };
}

function buildSiblingExtension(sibling: GeneticsSibling): R4Extension {
  const subs: R4Extension[] = [
    { url: 'reference', valueReference: { reference: sibling.reference } },
  ];
  if (sibling.role !== undefined) {
    subs.push({
      url: 'type',
      valueCodeableConcept: {
        coding: [{ system: V3_ROLE_CODE_SYSTEM, code: sibling.role }],
      },
    });
  }
  return { url: GENETICS_SIBLING_EXTENSION, extension: subs };
}

/**
 * Replace all extensions of the three known genetics URLs with the new lists,
 * preserving any other extensions untouched. Returns a shallow clone — the
 * input is never mutated, in keeping with the rest of the library's
 * immutable-data contract.
 */
export function setGeneticsExtensions(
  fmh: R4FamilyMemberHistory,
  next: {
    parents?: GeneticsParent[];
    siblings?: GeneticsSibling[];
    observations?: R4Reference[];
  },
): R4FamilyMemberHistory {
  const knownUrls = new Set<string>([
    GENETICS_PARENT_EXTENSION,
    GENETICS_SIBLING_EXTENSION,
    GENETICS_OBSERVATION_EXTENSION,
  ]);
  const preserved = (fmh.extension ?? []).filter((e) => !knownUrls.has(e.url));
  const rebuilt: R4Extension[] = [...preserved];
  for (const parent of next.parents ?? []) rebuilt.push(buildParentExtension(parent));
  for (const sibling of next.siblings ?? []) rebuilt.push(buildSiblingExtension(sibling));
  for (const ref of next.observations ?? []) {
    rebuilt.push({ url: GENETICS_OBSERVATION_EXTENSION, valueReference: ref });
  }
  return { ...fmh, extension: rebuilt };
}
