import { type Diagnostic, validateFhirInput } from '@pedigree/core';
import { useMemo } from 'react';

export interface UseInputValidationResult {
  diagnostics: readonly Diagnostic[];
}

/**
 * Runs raw-FHIR validation against Patient + FamilyMemberHistory input before
 * parsing/inference normalise or skip malformed source data.
 */
export function useInputValidation(
  patient: Parameters<typeof validateFhirInput>[0],
  familyHistory: Parameters<typeof validateFhirInput>[1],
): UseInputValidationResult {
  const diagnostics = useMemo(
    () => validateFhirInput(patient, familyHistory),
    [patient, familyHistory],
  );
  return { diagnostics };
}
