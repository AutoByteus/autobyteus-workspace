import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeOptionalPackageManifestPath, normalizePackageManifestPath } from './manifest-paths.js';
import { errorDiagnostic } from './validation-result.js';
export const isObjectRecord = (value) => (Boolean(value) && typeof value === 'object' && !Array.isArray(value));
export const pushUnknownKeyDiagnostics = (diagnostics, record, allowedKeys, diagnosticPath, code) => {
    const allowed = new Set(allowedKeys);
    for (const key of Object.keys(record)) {
        if (!allowed.has(key)) {
            const pathValue = diagnosticPath ? `${diagnosticPath}.${key}` : key;
            diagnostics.push(errorDiagnostic(code, `${pathValue} is not supported.`, pathValue));
        }
    }
};
export const pathExists = async (targetPath) => {
    try {
        await fs.access(targetPath);
        return true;
    }
    catch {
        return false;
    }
};
export const statIfExists = async (targetPath) => {
    try {
        return await fs.stat(targetPath);
    }
    catch {
        return null;
    }
};
export const readJsonFile = async (filePath) => {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
};
export const pushRequiredStringDiagnostic = (diagnostics, record, key, diagnosticPath) => {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim()) {
        diagnostics.push(errorDiagnostic('REQUIRED_STRING', `${diagnosticPath} must be a non-empty string.`, diagnosticPath));
        return null;
    }
    return value.trim();
};
export const pushVersionDiagnostic = (diagnostics, actual, expected, diagnosticPath) => {
    if (actual !== expected) {
        diagnostics.push(errorDiagnostic('UNSUPPORTED_CONTRACT_VERSION', `${diagnosticPath} must be "${expected}"; received ${JSON.stringify(actual)}.`, diagnosticPath));
    }
};
export const pushExistingPathDiagnostic = async (input) => {
    const targetPath = path.join(input.applicationRoot, input.relativePath);
    const stat = await statIfExists(targetPath);
    if (!stat || (input.kind === 'file' ? !stat.isFile() : !stat.isDirectory())) {
        input.diagnostics.push(errorDiagnostic('MISSING_PACKAGE_FILE', `${input.fieldName} ${input.kind} does not exist at ${input.relativePath}.`, input.relativePath));
    }
};
export const validateManifestPath = (input) => {
    const result = input.optional
        ? normalizeOptionalPackageManifestPath(input.value, input.fieldName, input.requiredPrefix)
        : normalizePackageManifestPath(input.value, input.fieldName, input.requiredPrefix);
    if (result.errorMessage) {
        input.diagnostics.push(errorDiagnostic('INVALID_MANIFEST_PATH', result.errorMessage, input.fieldName));
    }
    return result.relativePath;
};
export const validateSupportedExposures = (diagnostics, value) => {
    if (!isObjectRecord(value)) {
        diagnostics.push(errorDiagnostic('INVALID_BACKEND_MANIFEST', 'supportedExposures must be an object.', 'supportedExposures'));
        return null;
    }
    const supportedKeys = ['queries', 'commands', 'routes', 'graphql', 'notifications', 'eventHandlers', 'webSockets'];
    const supportedKeySet = new Set(supportedKeys);
    for (const key of Object.keys(value)) {
        if (!supportedKeySet.has(key)) {
            diagnostics.push(errorDiagnostic('INVALID_BACKEND_MANIFEST', `supportedExposures contains unsupported key '${key}'.`, `supportedExposures.${key}`));
        }
    }
    const output = {};
    for (const key of supportedKeys) {
        if (typeof value[key] !== 'boolean') {
            diagnostics.push(errorDiagnostic('INVALID_BACKEND_MANIFEST', `supportedExposures.${key} must be a boolean.`, `supportedExposures.${key}`));
            output[key] = false;
            continue;
        }
        output[key] = value[key];
    }
    return output;
};
//# sourceMappingURL=validation-helpers.js.map