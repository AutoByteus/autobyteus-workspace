export type ValidationSeverity = 'error' | 'warning';

export type ValidationDiagnostic = {
  severity: ValidationSeverity;
  code: string;
  message: string;
  path?: string | null;
};

export type ValidationResult = {
  diagnostics: ValidationDiagnostic[];
  valid: boolean;
};

export const createValidationResult = (
  diagnostics: ValidationDiagnostic[],
): ValidationResult => ({
  diagnostics,
  valid: diagnostics.every((diagnostic) => diagnostic.severity !== 'error'),
});

export const errorDiagnostic = (
  code: string,
  message: string,
  diagnosticPath?: string | null,
): ValidationDiagnostic => ({
  severity: 'error',
  code,
  message,
  path: diagnosticPath ?? null,
});

export const formatValidationDiagnostics = (result: ValidationResult): string => {
  if (result.diagnostics.length === 0) {
    return 'No validation diagnostics.';
  }
  return result.diagnostics
    .map((diagnostic) => {
      const location = diagnostic.path ? ` ${diagnostic.path}` : '';
      return `[${diagnostic.severity.toUpperCase()}] ${diagnostic.code}${location}: ${diagnostic.message}`;
    })
    .join('\n');
};
