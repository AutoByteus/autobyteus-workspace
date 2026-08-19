import { type ValidationDiagnostic } from './validation-result.js';
export declare const validateBackendManifest: (input: {
    diagnostics: ValidationDiagnostic[];
    applicationRoot: string;
    manifestRelativePath: string;
}) => Promise<void>;
export declare const validateBackendManifestIfPresent: (input: {
    diagnostics: ValidationDiagnostic[];
    applicationRoot: string;
    manifestRelativePath: string;
}) => Promise<void>;
//# sourceMappingURL=backend-manifest-validator.d.ts.map