import { type ResolvedApplicationDevkitConfig } from './application-devkit-config.js';
export type LoadedApplicationDevkitConfig = {
    configPath: string | null;
    config: ResolvedApplicationDevkitConfig;
};
export declare const loadApplicationDevkitConfig: (projectRoot: string) => Promise<LoadedApplicationDevkitConfig>;
//# sourceMappingURL=load-application-devkit-config.d.ts.map