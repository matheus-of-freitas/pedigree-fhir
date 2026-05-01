/* v8 ignore file */
/// <reference types="fhir" />

/**
 * Canonical FHIR type aliases for this library's current wire contract.
 *
 * The runtime parse/serialize surface currently targets FHIR **R4** `Patient`
 * and `FamilyMemberHistory` resources. Keeping the version in the exported type
 * names makes that contract explicit and avoids leaking ambient `fhir4.*`
 * globals throughout the rest of the repo.
 */
export type R4Patient = fhir4.Patient;
export type R4FamilyMemberHistory = fhir4.FamilyMemberHistory;
export type R4Extension = fhir4.Extension;
export type R4Reference = fhir4.Reference;
export type R4CodeableConcept = fhir4.CodeableConcept;
