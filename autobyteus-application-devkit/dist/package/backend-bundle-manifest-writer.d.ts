import { type ApplicationBackendBundleManifestV1, type ApplicationBackendSupportedExposures } from '@autobyteus/application-sdk-contracts';
export type BackendBundleManifestInput = {
    backendRoot: string;
    targetRuntimeSemver: string;
    supportedExposures: ApplicationBackendSupportedExposures;
    hasMigrations: boolean;
    hasAssets: boolean;
};
export declare const createBackendBundleManifest: (input: Omit<BackendBundleManifestInput, "backendRoot">) => ApplicationBackendBundleManifestV1;
export declare const writeBackendBundleManifest: (input: BackendBundleManifestInput) => Promise<ApplicationBackendBundleManifestV1>;
//# sourceMappingURL=backend-bundle-manifest-writer.d.ts.map