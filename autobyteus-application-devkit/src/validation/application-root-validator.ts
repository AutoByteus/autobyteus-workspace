import path from 'node:path';
import {
  APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V3,
  APPLICATION_MANIFEST_VERSION_V3,
} from '@autobyteus/application-sdk-contracts';
import { validateBackendManifestIfPresent } from './backend-manifest-validator.js';
import { getLocalApplicationIdValidationError } from './local-application-id.js';
import { errorDiagnostic, type ValidationDiagnostic } from './validation-result.js';
import {
  isObjectRecord,
  pushExistingPathDiagnostic,
  pushRequiredStringDiagnostic,
  pushVersionDiagnostic,
  readJsonFile,
  validateManifestPath,
} from './validation-helpers.js';

const validateUiManifestSection = async (input: {
  diagnostics: ValidationDiagnostic[];
  applicationRoot: string;
  ui: Record<string, unknown> | null;
}): Promise<void> => {
  if (!input.ui) {
    input.diagnostics.push(errorDiagnostic('INVALID_MANIFEST', 'ui must be an object.', 'ui'));
    return;
  }
  const entryHtml = validateManifestPath({
    diagnostics: input.diagnostics,
    value: input.ui.entryHtml,
    fieldName: 'ui.entryHtml',
    requiredPrefix: 'ui/',
  });
  pushVersionDiagnostic(input.diagnostics, input.ui.frontendSdkContractVersion, APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V3, 'ui.frontendSdkContractVersion');
  if (entryHtml) {
    await pushExistingPathDiagnostic({
      diagnostics: input.diagnostics,
      applicationRoot: input.applicationRoot,
      relativePath: entryHtml,
      fieldName: 'ui.entryHtml',
      kind: 'file',
    });
  }
};

const validateBackendManifestSection = async (input: {
  diagnostics: ValidationDiagnostic[];
  applicationRoot: string;
  backend: Record<string, unknown> | null;
}): Promise<void> => {
  if (!input.backend) {
    input.diagnostics.push(errorDiagnostic('INVALID_MANIFEST', 'backend must be an object.', 'backend'));
    return;
  }
  const backendManifest = validateManifestPath({
    diagnostics: input.diagnostics,
    value: input.backend.bundleManifest,
    fieldName: 'backend.bundleManifest',
    requiredPrefix: 'backend/',
  });
  if (!backendManifest) {
    return;
  }
  await pushExistingPathDiagnostic({
    diagnostics: input.diagnostics,
    applicationRoot: input.applicationRoot,
    relativePath: backendManifest,
    fieldName: 'backend.bundleManifest',
    kind: 'file',
  });
  await validateBackendManifestIfPresent({
    diagnostics: input.diagnostics,
    applicationRoot: input.applicationRoot,
    manifestRelativePath: backendManifest,
  });
};

export const validateApplicationRoot = async (input: {
  packageRoot: string;
  localApplicationId: string;
  diagnostics: ValidationDiagnostic[];
}): Promise<void> => {
  const folderIdError = getLocalApplicationIdValidationError(input.localApplicationId, 'application folder id');
  if (folderIdError) {
    input.diagnostics.push(errorDiagnostic('INVALID_LOCAL_APPLICATION_ID', folderIdError, 'applications/<localApplicationId>'));
  }
  const applicationRoot = path.join(input.packageRoot, 'applications', input.localApplicationId);
  const manifestPath = path.join(applicationRoot, 'application.json');
  let rawManifest: unknown;
  try {
    rawManifest = await readJsonFile(manifestPath);
  } catch (error) {
    input.diagnostics.push(errorDiagnostic('INVALID_JSON', `application.json could not be read as JSON: ${String(error)}`, manifestPath));
    return;
  }
  if (!isObjectRecord(rawManifest)) {
    input.diagnostics.push(errorDiagnostic('INVALID_MANIFEST', 'application.json must contain an object.', manifestPath));
    return;
  }

  pushVersionDiagnostic(input.diagnostics, rawManifest.manifestVersion, APPLICATION_MANIFEST_VERSION_V3, 'manifestVersion');
  const manifestId = pushRequiredStringDiagnostic(input.diagnostics, rawManifest, 'id', 'id');
  pushRequiredStringDiagnostic(input.diagnostics, rawManifest, 'name', 'name');
  if (manifestId) {
    const manifestIdError = getLocalApplicationIdValidationError(manifestId, 'application.json id');
    if (manifestIdError) {
      input.diagnostics.push(errorDiagnostic('INVALID_LOCAL_APPLICATION_ID', manifestIdError, 'id'));
    }
  }
  if (manifestId && manifestId !== input.localApplicationId) {
    input.diagnostics.push(errorDiagnostic('APPLICATION_ID_MISMATCH', `application folder id '${input.localApplicationId}' must match manifest id '${manifestId}'.`, 'id'));
  }

  await validateUiManifestSection({
    diagnostics: input.diagnostics,
    applicationRoot,
    ui: isObjectRecord(rawManifest.ui) ? rawManifest.ui : null,
  });
  const icon = validateManifestPath({ diagnostics: input.diagnostics, value: rawManifest.icon, fieldName: 'icon', requiredPrefix: 'ui/', optional: true });
  if (icon) {
    await pushExistingPathDiagnostic({ diagnostics: input.diagnostics, applicationRoot, relativePath: icon, fieldName: 'icon', kind: 'file' });
  }
  await validateBackendManifestSection({
    diagnostics: input.diagnostics,
    applicationRoot,
    backend: isObjectRecord(rawManifest.backend) ? rawManifest.backend : null,
  });
};
