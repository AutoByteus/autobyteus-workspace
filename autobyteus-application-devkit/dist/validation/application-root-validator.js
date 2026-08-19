import path from 'node:path';
import { APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V6, APPLICATION_MANIFEST_VERSION_V4, } from '@autobyteus/application-sdk-contracts';
import { validateBackendManifestIfPresent } from './backend-manifest-validator.js';
import { getLocalApplicationIdValidationError } from './local-application-id.js';
import { errorDiagnostic } from './validation-result.js';
import { isObjectRecord, pushExistingPathDiagnostic, pushRequiredStringDiagnostic, pushUnknownKeyDiagnostics, pushVersionDiagnostic, readJsonFile, validateManifestPath, } from './validation-helpers.js';
const validateUiManifestSection = async (input) => {
    if (!input.ui) {
        input.diagnostics.push(errorDiagnostic('INVALID_MANIFEST', 'ui must be an object.', 'ui'));
        return;
    }
    pushUnknownKeyDiagnostics(input.diagnostics, input.ui, ["entryHtml", "frontendSdkContractVersion"], "ui", "INVALID_MANIFEST");
    const entryHtml = validateManifestPath({
        diagnostics: input.diagnostics,
        value: input.ui.entryHtml,
        fieldName: 'ui.entryHtml',
        requiredPrefix: 'ui/',
    });
    pushVersionDiagnostic(input.diagnostics, input.ui.frontendSdkContractVersion, APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V6, 'ui.frontendSdkContractVersion');
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
const validateBackendManifestSection = async (input) => {
    if (!input.backend) {
        input.diagnostics.push(errorDiagnostic('INVALID_MANIFEST', 'backend must be an object.', 'backend'));
        return;
    }
    pushUnknownKeyDiagnostics(input.diagnostics, input.backend, ["bundleManifest"], "backend", "INVALID_MANIFEST");
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
export const validateApplicationRoot = async (input) => {
    const folderIdError = getLocalApplicationIdValidationError(input.localApplicationId, 'application folder id');
    if (folderIdError) {
        input.diagnostics.push(errorDiagnostic('INVALID_LOCAL_APPLICATION_ID', folderIdError, 'applications/<localApplicationId>'));
    }
    const applicationRoot = path.join(input.packageRoot, 'applications', input.localApplicationId);
    const manifestPath = path.join(applicationRoot, 'application.json');
    let rawManifest;
    try {
        rawManifest = await readJsonFile(manifestPath);
    }
    catch (error) {
        input.diagnostics.push(errorDiagnostic('INVALID_JSON', `application.json could not be read as JSON: ${String(error)}`, manifestPath));
        return;
    }
    if (!isObjectRecord(rawManifest)) {
        input.diagnostics.push(errorDiagnostic('INVALID_MANIFEST', 'application.json must contain an object.', manifestPath));
        return;
    }
    pushUnknownKeyDiagnostics(input.diagnostics, rawManifest, ["manifestVersion", "id", "name", "description", "icon", "ui", "backend", "executionResourceSlots"], "", "INVALID_MANIFEST");
    pushVersionDiagnostic(input.diagnostics, rawManifest.manifestVersion, APPLICATION_MANIFEST_VERSION_V4, 'manifestVersion');
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
//# sourceMappingURL=application-root-validator.js.map