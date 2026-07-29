import fs from 'node:fs/promises';
import path from 'node:path';
import {
  APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION,
  APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION,
  APPLICATION_FRONTEND_SDK_CONTRACT_VERSION,
  type ApplicationBackendBundleManifest,
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
): ApplicationBackendBundleManifest => ({
  contractVersion: APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION,
  entryModule: 'backend/dist/entry.mjs',
  moduleFormat: 'esm',
  distribution: 'self-contained',
  targetRuntime: {
    engine: 'node',
    semver: input.targetRuntimeSemver,
  },
  sdkCompatibility: {
    backendDefinitionContractVersion: APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION,
    frontendSdkContractVersion: APPLICATION_FRONTEND_SDK_CONTRACT_VERSION,
  },
  supportedExposures: input.supportedExposures,
  ...(input.hasMigrations ? { migrationsDir: 'backend/migrations' } : {}),
  ...(input.hasAssets ? { assetsDir: 'backend/assets' } : {}),
});

export const writeBackendBundleManifest = async (
  input: BackendBundleManifestInput,
): Promise<ApplicationBackendBundleManifest> => {
  const manifest = createBackendBundleManifest(input);
  await fs.mkdir(input.backendRoot, { recursive: true });
  await fs.writeFile(
    path.join(input.backendRoot, 'bundle.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  return manifest;
};
