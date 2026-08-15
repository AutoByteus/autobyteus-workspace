export const createValidationResult = (diagnostics) => ({
    diagnostics,
    valid: diagnostics.every((diagnostic) => diagnostic.severity !== 'error'),
});
export const errorDiagnostic = (code, message, diagnosticPath) => ({
    severity: 'error',
    code,
    message,
    path: diagnosticPath ?? null,
});
export const formatValidationDiagnostics = (result) => {
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
//# sourceMappingURL=validation-result.js.map