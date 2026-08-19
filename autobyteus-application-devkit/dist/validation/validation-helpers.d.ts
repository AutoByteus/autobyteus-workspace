import type { ApplicationBackendSupportedExposures } from '@autobyteus/application-sdk-contracts';
import { type ValidationDiagnostic } from './validation-result.js';
export type UnknownRecord = Record<string, unknown>;
export declare const isObjectRecord: (value: unknown) => value is UnknownRecord;
export declare const pushUnknownKeyDiagnostics: (diagnostics: ValidationDiagnostic[], record: UnknownRecord, allowedKeys: readonly string[], diagnosticPath: string, code: "INVALID_MANIFEST" | "INVALID_BACKEND_MANIFEST") => void;
export declare const pathExists: (targetPath: string) => Promise<boolean>;
export declare const statIfExists: (targetPath: string) => Promise<import("node:fs").Stats | null>;
export declare const readJsonFile: (filePath: string) => Promise<unknown>;
export declare const pushRequiredStringDiagnostic: (diagnostics: ValidationDiagnostic[], record: UnknownRecord, key: string, diagnosticPath: string) => string | null;
export declare const pushVersionDiagnostic: (diagnostics: ValidationDiagnostic[], actual: unknown, expected: string, diagnosticPath: string) => void;
export declare const pushExistingPathDiagnostic: (input: {
    diagnostics: ValidationDiagnostic[];
    applicationRoot: string;
    relativePath: string;
    fieldName: string;
    kind: "file" | "directory";
}) => Promise<void>;
export declare const validateManifestPath: (input: {
    diagnostics: ValidationDiagnostic[];
    value: unknown;
    fieldName: string;
    requiredPrefix: "ui/" | "backend/";
    optional?: boolean;
}) => string | null;
export declare const validateSupportedExposures: (diagnostics: ValidationDiagnostic[], value: unknown) => ApplicationBackendSupportedExposures | null;
//# sourceMappingURL=validation-helpers.d.ts.map