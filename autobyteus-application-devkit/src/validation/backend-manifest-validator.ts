import path from 'node:path';
import {
  APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1,
  APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V2,
  APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V3,
} from '@autobyteus/application-sdk-contracts';
import { errorDiagnostic, type ValidationDiagnostic } from './validation-result.js';
import {
  isObjectRecord,
  pathExists,
  pushExistingPathDiagnostic,
  pushVersionDiagnostic,
  readJsonFile,
  validateManifestPath,
  validateSupportedExposures,
} from './validation-helpers.js';

const validateBackendRuntimeFields = (
  diagnostics: ValidationDiagnostic[],
  rawManifest: Record<string, unknown>,
): void => {
  if (rawManifest.moduleFormat !== 'esm') {
    diagnostics.push(errorDiagnostic('INVALID_BACKEND_MANIFEST', 'backend.moduleFormat must be "esm".', 'backend.moduleFormat'));
  }
  if (rawManifest.distribution !== 'self-contained') {
    diagnostics.push(errorDiagnostic('INVALID_BACKEND_MANIFEST', 'backend.distribution must be "self-contained".', 'backend.distribution'));
  }
  const targetRuntime = isObjectRecord(rawManifest.targetRuntime) ? rawManifest.targetRuntime : null;
  if (!targetRuntime || targetRuntime.engine !== 'node' || typeof targetRuntime.semver !== 'string') {
    diagnostics.push(errorDiagnostic('INVALID_BACKEND_MANIFEST', 'targetRuntime must declare node and semver.', 'targetRuntime'));
  }
};

const validateBackendSdkCompatibility = (
  diagnostics: ValidationDiagnostic[],
  rawManifest: Record<string, unknown>,
): void => {
  const sdkCompatibility = isObjectRecord(rawManifest.sdkCompatibility) ? rawManifest.sdkCompatibility : null;
  if (!sdkCompatibility) {
    diagnostics.push(errorDiagnostic('INVALID_BACKEND_MANIFEST', 'sdkCompatibility must be an object.', 'sdkCompatibility'));
    return;
  }
  pushVersionDiagnostic(
    diagnostics,
    sdkCompatibility.backendDefinitionContractVersion,
    APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V2,
    'sdkCompatibility.backendDefinitionContractVersion',
  );
  pushVersionDiagnostic(
    diagnostics,
    sdkCompatibility.frontendSdkContractVersion,
    APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V3,
    'sdkCompatibility.frontendSdkContractVersion',
  );
};

const validateOptionalBackendDirectory = async (input: {
  diagnostics: ValidationDiagnostic[];
  applicationRoot: string;
  rawManifest: Record<string, unknown>;
  fieldName: 'backend.migrationsDir' | 'backend.assetsDir';
  manifestKey: 'migrationsDir' | 'assetsDir';
}): Promise<void> => {
  const relativePath = validateManifestPath({
    diagnostics: input.diagnostics,
    value: input.rawManifest[input.manifestKey],
    fieldName: input.fieldName,
    requiredPrefix: 'backend/',
    optional: true,
  });
  if (relativePath) {
    await pushExistingPathDiagnostic({
      diagnostics: input.diagnostics,
      applicationRoot: input.applicationRoot,
      relativePath,
      fieldName: input.fieldName,
      kind: 'directory',
    });
  }
};

export const validateBackendManifest = async (input: {
  diagnostics: ValidationDiagnostic[];
  applicationRoot: string;
  manifestRelativePath: string;
}): Promise<void> => {
  const manifestPath = path.join(input.applicationRoot, input.manifestRelativePath);
  let rawManifest: unknown;
  try {
    rawManifest = await readJsonFile(manifestPath);
  } catch (error) {
    input.diagnostics.push(
      errorDiagnostic('INVALID_JSON', `backend.bundleManifest could not be read as JSON: ${String(error)}`, input.manifestRelativePath),
    );
    return;
  }
  if (!isObjectRecord(rawManifest)) {
    input.diagnostics.push(errorDiagnostic('INVALID_BACKEND_MANIFEST', 'backend bundle manifest must be an object.', input.manifestRelativePath));
    return;
  }

  pushVersionDiagnostic(input.diagnostics, rawManifest.contractVersion, APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1, 'backend.contractVersion');
  const entryModule = validateManifestPath({
    diagnostics: input.diagnostics,
    value: rawManifest.entryModule,
    fieldName: 'backend.entryModule',
    requiredPrefix: 'backend/',
  });
  if (entryModule) {
    await pushExistingPathDiagnostic({
      diagnostics: input.diagnostics,
      applicationRoot: input.applicationRoot,
      relativePath: entryModule,
      fieldName: 'backend.entryModule',
      kind: 'file',
    });
  }
  validateBackendRuntimeFields(input.diagnostics, rawManifest);
  validateBackendSdkCompatibility(input.diagnostics, rawManifest);
  validateSupportedExposures(input.diagnostics, rawManifest.supportedExposures);
  await validateOptionalBackendDirectory({ diagnostics: input.diagnostics, applicationRoot: input.applicationRoot, rawManifest, fieldName: 'backend.migrationsDir', manifestKey: 'migrationsDir' });
  await validateOptionalBackendDirectory({ diagnostics: input.diagnostics, applicationRoot: input.applicationRoot, rawManifest, fieldName: 'backend.assetsDir', manifestKey: 'assetsDir' });
};

export const validateBackendManifestIfPresent = async (input: {
  diagnostics: ValidationDiagnostic[];
  applicationRoot: string;
  manifestRelativePath: string;
}): Promise<void> => {
  const manifestPath = path.join(input.applicationRoot, input.manifestRelativePath);
  if (await pathExists(manifestPath)) {
    await validateBackendManifest(input);
  }
};
