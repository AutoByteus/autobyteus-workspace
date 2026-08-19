import type { ResolvedApplicationProjectPaths } from '../paths/application-project-paths.js';
export declare const copyApplicationResources: (input: {
    paths: ResolvedApplicationProjectPaths;
}) => Promise<{
    hasMigrations: boolean;
    hasAssets: boolean;
}>;
//# sourceMappingURL=resource-copier.d.ts.map