import fs from 'node:fs/promises';
import path from 'node:path';
import { APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1, APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V6, APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V6, } from '@autobyteus/application-sdk-contracts';
export const createBackendBundleManifest = (input) => ({
    contractVersion: APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1,
    entryModule: 'backend/dist/entry.mjs',
    moduleFormat: 'esm',
    distribution: 'self-contained',
    targetRuntime: {
        engine: 'node',
        semver: input.targetRuntimeSemver,
    },
    sdkCompatibility: {
        backendDefinitionContractVersion: APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V6,
        frontendSdkContractVersion: APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V6,
    },
    supportedExposures: input.supportedExposures,
    ...(input.hasMigrations ? { migrationsDir: 'backend/migrations' } : {}),
    ...(input.hasAssets ? { assetsDir: 'backend/assets' } : {}),
});
export const writeBackendBundleManifest = async (input) => {
    const manifest = createBackendBundleManifest(input);
    await fs.mkdir(input.backendRoot, { recursive: true });
    await fs.writeFile(path.join(input.backendRoot, 'bundle.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return manifest;
};
//# sourceMappingURL=backend-bundle-manifest-writer.js.map