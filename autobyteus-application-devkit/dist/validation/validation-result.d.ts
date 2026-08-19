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
export declare const createValidationResult: (diagnostics: ValidationDiagnostic[]) => ValidationResult;
export declare const errorDiagnostic: (code: string, message: string, diagnosticPath?: string | null) => ValidationDiagnostic;
export declare const formatValidationDiagnostics: (result: ValidationResult) => string;
//# sourceMappingURL=validation-result.d.ts.map