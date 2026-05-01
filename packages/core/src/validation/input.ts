/// <reference types="fhir" />
import { GENETICS_PARENT_EXTENSION, GENETICS_SIBLING_EXTENSION } from '../fhir/extensions.js';
import { type Diagnostic, type DiagnosticResourceRef, Severity } from './types.js';

function resourceRef(
  resourceType: 'Patient' | 'FamilyMemberHistory',
  args: {
    path: string;
    id?: string;
    reference?: string;
  },
): DiagnosticResourceRef {
  return {
    resourceType,
    path: args.path,
    ...(args.id === undefined ? {} : { id: args.id }),
    ...(args.reference === undefined ? {} : { reference: args.reference }),
  };
}

function fmhPath(index: number): string {
  return `familyHistory[${index}]`;
}

function fmhLabel(fmh: fhir4.FamilyMemberHistory, index: number): string {
  return fmh.id ?? fmhPath(index);
}

function refToResourceId(reference: string): string {
  const idx = reference.lastIndexOf('/');
  return idx === -1 ? reference : reference.slice(idx + 1);
}

function findExtensions(
  host: { extension?: fhir4.Extension[] | undefined },
  url: string,
): fhir4.Extension[] {
  return (host.extension ?? []).filter((e) => e.url === url);
}

function findSubExtension(parent: fhir4.Extension, url: string): fhir4.Extension | undefined {
  return (parent.extension ?? []).find((e) => e.url === url);
}

function extractReference(ext: fhir4.Extension): string | undefined {
  return findSubExtension(ext, 'reference')?.valueReference?.reference;
}

/**
 * Validate the raw FHIR input before parsing/inference normalises or skips
 * malformed data. This is intentionally additive to graph validation rather
 * than a replacement for it.
 */
export function validateFhirInput(
  patient: fhir4.Patient,
  familyHistory: readonly fhir4.FamilyMemberHistory[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (patient.id === undefined) {
    diagnostics.push({
      code: 'input/patient-missing-id',
      severity: Severity.Error,
      message: 'Patient is missing required `id`; parsePedigree() will throw.',
      individualIds: [],
      resourceRefs: [resourceRef('Patient', { path: 'patient' })],
    });
  }

  const byId = new Map<string, number[]>();
  for (const [index, fmh] of familyHistory.entries()) {
    if (fmh.id === undefined) {
      diagnostics.push({
        code: 'input/fmh-missing-id',
        severity: Severity.Warning,
        message: `FamilyMemberHistory at ${fmhPath(index)} is missing \`id\` and will be skipped by parsing.`,
        individualIds: [],
        resourceRefs: [resourceRef('FamilyMemberHistory', { path: fmhPath(index) })],
      });
      continue;
    }
    const seen = byId.get(fmh.id);
    if (seen === undefined) byId.set(fmh.id, [index]);
    else seen.push(index);
  }

  for (const [id, indexes] of byId) {
    if (indexes.length < 2) continue;
    diagnostics.push({
      code: 'input/fmh-duplicate-id',
      severity: Severity.Error,
      message: `FamilyMemberHistory id "${id}" is duplicated; later entries overwrite earlier ones during parsing.`,
      individualIds: [],
      resourceRefs: indexes.map((index) =>
        resourceRef('FamilyMemberHistory', { id, path: fmhPath(index) }),
      ),
    });
  }

  const knownIds = new Set(byId.keys());
  const expectedPatientReference = patient.id === undefined ? undefined : `Patient/${patient.id}`;

  for (const [index, fmh] of familyHistory.entries()) {
    const baseRef = resourceRef('FamilyMemberHistory', {
      path: fmhPath(index),
      ...(fmh.id === undefined ? {} : { id: fmh.id }),
    });
    const label = fmhLabel(fmh, index);

    const patientReference = fmh.patient?.reference;
    if (patientReference === undefined) {
      diagnostics.push({
        code: 'input/fmh-patient-reference-missing',
        severity: Severity.Warning,
        message: `FamilyMemberHistory ${label} is missing patient.reference.`,
        individualIds: [],
        resourceRefs: [baseRef],
      });
    } else if (
      expectedPatientReference !== undefined &&
      patientReference !== expectedPatientReference
    ) {
      diagnostics.push({
        code: 'input/fmh-patient-reference-mismatch',
        severity: Severity.Warning,
        message: `FamilyMemberHistory ${label} points to "${patientReference}" instead of "${expectedPatientReference}".`,
        individualIds: [],
        resourceRefs: [
          resourceRef('FamilyMemberHistory', {
            path: fmhPath(index),
            reference: patientReference,
            ...(fmh.id === undefined ? {} : { id: fmh.id }),
          }),
        ],
      });
    }

    const relationshipCode = fmh.relationship?.coding?.[0]?.code;
    if (relationshipCode === undefined) {
      diagnostics.push({
        code: 'input/relationship-missing',
        severity: Severity.Warning,
        message: `FamilyMemberHistory ${label} has no relationship code; parsing will omit relationshipToProband metadata.`,
        individualIds: [],
        resourceRefs: [baseRef],
      });
    }

    const parentExtensions = findExtensions(fmh, GENETICS_PARENT_EXTENSION);
    const validParentIds: string[] = [];
    const seenParentIds = new Set<string>();
    for (const [extIndex, ext] of parentExtensions.entries()) {
      const reference = extractReference(ext);
      const refResource = resourceRef('FamilyMemberHistory', {
        path: `${fmhPath(index)}.parentExtension[${extIndex}]`,
        ...(fmh.id === undefined ? {} : { id: fmh.id }),
        ...(reference === undefined ? {} : { reference }),
      });
      if (reference === undefined) {
        diagnostics.push({
          code: 'input/parent-reference-missing',
          severity: Severity.Warning,
          message: `FamilyMemberHistory ${label} has a genetics-parent extension without a reference.`,
          individualIds: [],
          resourceRefs: [refResource],
        });
        continue;
      }
      const targetId = refToResourceId(reference);
      validParentIds.push(targetId);
      if (targetId === fmh.id) {
        diagnostics.push({
          code: 'input/parent-reference-self',
          severity: Severity.Error,
          message: `FamilyMemberHistory ${label} references itself as a genetics parent.`,
          individualIds: [],
          resourceRefs: [refResource],
        });
      }
      if (!knownIds.has(targetId)) {
        diagnostics.push({
          code: 'input/parent-reference-unknown',
          severity: Severity.Warning,
          message: `FamilyMemberHistory ${label} references unknown parent "${reference}".`,
          individualIds: [],
          resourceRefs: [refResource],
        });
      }
      if (seenParentIds.has(targetId)) {
        diagnostics.push({
          code: 'input/parent-reference-duplicate',
          severity: Severity.Warning,
          message: `FamilyMemberHistory ${label} repeats genetics parent "${reference}".`,
          individualIds: [],
          resourceRefs: [refResource],
        });
      } else {
        seenParentIds.add(targetId);
      }
    }
    if (validParentIds.length > 2) {
      diagnostics.push({
        code: 'input/parent-reference-overflow',
        severity: Severity.Warning,
        message: `FamilyMemberHistory ${label} declares ${validParentIds.length} genetics parents; parsing will only use the first two.`,
        individualIds: [],
        resourceRefs: [baseRef],
      });
    }

    const siblingExtensions = findExtensions(fmh, GENETICS_SIBLING_EXTENSION);
    for (const [extIndex, ext] of siblingExtensions.entries()) {
      const reference = extractReference(ext);
      const refResource = resourceRef('FamilyMemberHistory', {
        path: `${fmhPath(index)}.siblingExtension[${extIndex}]`,
        ...(fmh.id === undefined ? {} : { id: fmh.id }),
        ...(reference === undefined ? {} : { reference }),
      });
      if (reference === undefined) {
        diagnostics.push({
          code: 'input/sibling-reference-missing',
          severity: Severity.Warning,
          message: `FamilyMemberHistory ${label} has a genetics-sibling extension without a reference.`,
          individualIds: [],
          resourceRefs: [refResource],
        });
        continue;
      }
      const targetId = refToResourceId(reference);
      if (targetId === fmh.id) {
        diagnostics.push({
          code: 'input/sibling-reference-self',
          severity: Severity.Error,
          message: `FamilyMemberHistory ${label} references itself as a genetics sibling.`,
          individualIds: [],
          resourceRefs: [refResource],
        });
      }
      if (!knownIds.has(targetId)) {
        diagnostics.push({
          code: 'input/sibling-reference-unknown',
          severity: Severity.Warning,
          message: `FamilyMemberHistory ${label} references unknown sibling "${reference}".`,
          individualIds: [],
          resourceRefs: [refResource],
        });
      }
    }
  }

  return diagnostics;
}
