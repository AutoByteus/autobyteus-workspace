import type { ValidationResult } from '../validation/validation-result.js';
type ApplicationSourceManifest = {
    id: string;
    name: string;
};
export type PackApplicationProjectResult = {
    packageRoot: string;
    applicationRoot: string;
    validation: ValidationResult;
};
export declare const readApplicationSourceManifest: (projectRoot: string) => Promise<ApplicationSourceManifest>;
export declare const packApplicationProject: (input: {
    projectRoot: string;
    outputPackageRootOverride?: string | null;
}) => Promise<PackApplicationProjectResult>;
export {};
//# sourceMappingURL=package-assembler.d.ts.map