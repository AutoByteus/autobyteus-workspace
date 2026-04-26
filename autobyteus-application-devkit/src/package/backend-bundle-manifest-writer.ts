import fs from 'node:fs/promises';
import path from 'node:path';
import {
  APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1,
  APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V2,
  APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V3,
  type ApplicationBackendBundleManifestV1,
  type ApplicationBackendSupportedExposures,
} from '@autobyteus/application-sdk-contracts';

export type BackendBundleManifestInput = {
  backendRoot: string;
  targetRuntimeSemver: string;
  supportedExposures: ApplicationBackendSupportedExposures;
  hasMigrations: boolean;
  hasAssets: boolean;
};

export const createBackendBundleManifest = (
  input: Omit<BackendBundleManifestInput, 'backendRoot'>,
): ApplicationBackendBundleManifestV1 => ({
  contractVersion: APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1,
  entryModule: 'backend/dist/entry.mjs',
  moduleFormat: 'esm',
  distribution: 'self-contained',
  targetRuntime: {
    engine: 'node',
    semver: input.targetRuntimeSemver,
  },
  sdkCompatibility: {
    backendDefinitionContractVersion: APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V2,
    frontendSdkContractVersion: APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V3,
  },
  supportedExposures: input.supportedExposures,
  ...(input.hasMigrations ? { migrationsDir: 'backend/migrations' } : {}),
  ...(input.hasAssets ? { assetsDir: 'backend/assets' } : {}),
});

export const writeBackendBundleManifest = async (
  input: BackendBundleManifestInput,
): Promise<ApplicationBackendBundleManifestV1> => {
  const manifest = createBackendBundleManifest(input);
  await fs.mkdir(input.backendRoot, { recursive: true });
  await fs.writeFile(
    path.join(input.backendRoot, 'bundle.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  return manifest;
};
