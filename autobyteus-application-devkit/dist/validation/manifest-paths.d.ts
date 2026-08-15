export type ManifestPathValidation = {
    relativePath: string | null;
    errorMessage: string | null;
};
export declare const normalizePackageManifestPath: (value: unknown, fieldName: string, requiredPrefix: "ui/" | "backend/") => ManifestPathValidation;
export declare const normalizeOptionalPackageManifestPath: (value: unknown, fieldName: string, requiredPrefix: "ui/" | "backend/") => ManifestPathValidation;
//# sourceMappingURL=manifest-paths.d.ts.map