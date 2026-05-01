import type { AgeObservation, IndividualSemantics } from '../psc/semantics.js';

/**
 * Provenance tracks how an entity entered the graph: directly from a FHIR
 * resource, or synthesized by inference because the topology required it
 * (e.g. an unknown grandfather node created so a known grandmother has a
 * partner). Validation surfaces inferred entities so consumers can prompt
 * users to confirm or fill them in.
 */
export const Provenance = {
  Explicit: 'explicit',
  Inferred: 'inferred',
} as const;
export type Provenance = (typeof Provenance)[keyof typeof Provenance];

export type IndividualId = string;
export type CoupleId = string;
export type TwinGroupId = string;

/**
 * Reference back to the FHIR resource that originated this entity, when there
 * is one. Inferred individuals have `sourceRef: undefined`.
 */
export interface SourceRef {
  resourceType: 'Patient' | 'FamilyMemberHistory';
  id: string;
}

export interface Individual {
  id: IndividualId;
  /** The couple whose offspring this individual is, if known. */
  childOf?: CoupleId;
  /**
   * Co-twin grouping. All individuals sharing a `twinGroupId` are siblings
   * born of the same pregnancy. Zygosity lives in `semantics.twin`.
   */
  twinGroupId?: TwinGroupId;
  semantics: IndividualSemantics;
  provenance: Provenance;
  sourceRef?: SourceRef;
  /**
   * The HL7 v3 FamilyMember code as recorded on the originating
   * FamilyMemberHistory.relationship, when applicable. Kept as metadata —
   * the graph topology (childOf, couples) is the authoritative truth.
   */
  relationshipToProband?: string;
  /** Optional consumer-facing display name. The library never renders it. */
  name?: string;
  /** Optional birth date for age derivation by consumers. */
  birthDate?: string;
  /** Optional current/reported age when supplied directly by source data. */
  age?: AgeObservation;
  /** Optional explicit age-at-death metadata. */
  deceasedAge?: AgeObservation;
}

export interface Couple {
  id: CoupleId;
  /** Order is not significant; partners are unordered. */
  partners: [IndividualId, IndividualId];
  consanguineous: boolean;
  provenance: Provenance;
}

/**
 * Top-level graph. Individuals and couples are stored as records keyed by ID
 * for O(1) lookup; iteration order is insertion order (preserved by the
 * builder). The proband ID identifies the focus individual — exactly one.
 */
export interface PedigreeGraph {
  proband: IndividualId;
  individuals: Record<IndividualId, Individual>;
  couples: Record<CoupleId, Couple>;
}
