import type { ResolvedApplicationDevkitConfig } from '../config/application-devkit-config.js';
export type ResolvedApplicationProjectPaths = {
    projectRoot: string;
    applicationManifestPath: string;
    sourceFrontendRoot: string;
    sourceFrontendEntryPoint: string;
    sourceFrontendEntryHtml: string;
    sourceBackendRoot: string;
    sourceBackendEntryPoint: string;
    sourceMigrationsRoot: string | null;
    sourceBackendAssetsRoot: string | null;
    sourceAgentsRoot: string;
    sourceAgentTeamsRoot: string;
    outputPackageRoot: string;
    generatedApplicationsRoot: string;
    generatedApplicationRoot: string;
    generatedUiRoot: string;
    generatedBackendRoot: string;
    devOutputRoot: string;
    devUiRoot: string;
};
export declare const resolveApplicationProjectPaths: (input: {
    projectRoot: string;
    config: ResolvedApplicationDevkitConfig;
    localApplicationId: string;
    outputPackageRootOverride?: string | null;
}) => ResolvedApplicationProjectPaths;
//# sourceMappingURL=application-project-paths.d.ts.map