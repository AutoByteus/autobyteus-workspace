import type { ApplicationBackendSupportedExposures } from '@autobyteus/application-sdk-contracts';
export type ApplicationDevkitSourceConfig = {
    frontendDir?: string | null;
    backendDir?: string | null;
    agentsDir?: string | null;
    agentTeamsDir?: string | null;
};
export type ApplicationDevkitOutputConfig = {
    packageRoot?: string | null;
};
export type ApplicationDevkitFrontendConfig = {
    entryPoint?: string | null;
    entryHtml?: string | null;
};
export type ApplicationDevkitBackendConfig = {
    entryPoint?: string | null;
    targetRuntimeSemver?: string | null;
    supportedExposures?: Partial<ApplicationBackendSupportedExposures> | null;
    migrationsDir?: string | null;
    assetsDir?: string | null;
};
export type ApplicationDevkitDevConfig = {
    port?: number | null;
};
export type ApplicationDevkitConfig = {
    source?: ApplicationDevkitSourceConfig | null;
    output?: ApplicationDevkitOutputConfig | null;
    frontend?: ApplicationDevkitFrontendConfig | null;
    backend?: ApplicationDevkitBackendConfig | null;
    dev?: ApplicationDevkitDevConfig | null;
};
export type ResolvedApplicationDevkitConfig = {
    source: {
        frontendDir: string;
        backendDir: string;
        agentsDir: string;
        agentTeamsDir: string;
    };
    output: {
        packageRoot: string;
    };
    frontend: {
        entryPoint: string;
        entryHtml: string;
    };
    backend: {
        entryPoint: string;
        targetRuntimeSemver: string;
        supportedExposures: ApplicationBackendSupportedExposures;
        migrationsDir: string | null;
        assetsDir: string | null;
    };
    dev: {
        port: number;
    };
};
export declare const DEFAULT_APPLICATION_DEVKIT_CONFIG: ResolvedApplicationDevkitConfig;
export declare const resolveApplicationDevkitConfig: (config: ApplicationDevkitConfig | null | undefined) => ResolvedApplicationDevkitConfig;
export declare const defineApplicationDevkitConfig: <TConfig extends ApplicationDevkitConfig>(config: TConfig) => TConfig;
//# sourceMappingURL=application-devkit-config.d.ts.map