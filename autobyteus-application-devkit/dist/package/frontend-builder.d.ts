import type { ResolvedApplicationProjectPaths } from '../paths/application-project-paths.js';
export declare const buildFrontendAssets: (input: {
    paths: ResolvedApplicationProjectPaths;
    uiRoot?: string;
}) => Promise<{
    uiRoot: string;
    entryScript: string;
}>;
//# sourceMappingURL=frontend-builder.d.ts.map