import fs from 'node:fs/promises';
import path from 'node:path';
import type { ApplicationBackendSupportedExposures } from '@autobyteus/application-sdk-contracts';
import { normalizeOptionalPackageManifestPath, normalizePackageManifestPath } from './manifest-paths.js';
import { errorDiagnostic, type ValidationDiagnostic } from './validation-result.js';

export type UnknownRecord = Record<string, unknown>;

export const isObjectRecord = (value: unknown): value is UnknownRecord => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

export const statIfExists = async (targetPath: string) => {
  try {
    return await fs.stat(targetPath);
  } catch {
    return null;
  }
};

export const readJsonFile = async (filePath: string): Promise<unknown> => {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content) as unknown;
};

export const pushRequiredStringDiagnostic = (
  diagnostics: ValidationDiagnostic[],
  record: UnknownRecord,
  key: string,
  diagnosticPath: string,
): string | null => {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    diagnostics.push(errorDiagnostic('REQUIRED_STRING', `${diagnosticPath} must be a non-empty string.`, diagnosticPath));
    return null;
  }
  return value.trim();
};

export const pushVersionDiagnostic = (
  diagnostics: ValidationDiagnostic[],
  actual: unknown,
  expected: string,
  diagnosticPath: string,
): void => {
  if (actual !== expected) {
    diagnostics.push(
      errorDiagnostic(
        'UNSUPPORTED_CONTRACT_VERSION',
        `${diagnosticPath} must be "${expected}"; received ${JSON.stringify(actual)}.`,
        diagnosticPath,
      ),
    );
  }
};

export const pushExistingPathDiagnostic = async (input: {
  diagnostics: ValidationDiagnostic[];
  applicationRoot: string;
  relativePath: string;
  fieldName: string;
  kind: 'file' | 'directory';
}): Promise<void> => {
  const targetPath = path.join(input.applicationRoot, input.relativePath);
  const stat = await statIfExists(targetPath);
  if (!stat || (input.kind === 'file' ? !stat.isFile() : !stat.isDirectory())) {
    input.diagnostics.push(
      errorDiagnostic(
        'MISSING_PACKAGE_FILE',
        `${input.fieldName} ${input.kind} does not exist at ${input.relativePath}.`,
        input.relativePath,
      ),
    );
  }
};

export const validateManifestPath = (input: {
  diagnostics: ValidationDiagnostic[];
  value: unknown;
  fieldName: string;
  requiredPrefix: 'ui/' | 'backend/';
  optional?: boolean;
}): string | null => {
  const result = input.optional
    ? normalizeOptionalPackageManifestPath(input.value, input.fieldName, input.requiredPrefix)
    : normalizePackageManifestPath(input.value, input.fieldName, input.requiredPrefix);
  if (result.errorMessage) {
    input.diagnostics.push(errorDiagnostic('INVALID_MANIFEST_PATH', result.errorMessage, input.fieldName));
  }
  return result.relativePath;
};

export const validateSupportedExposures = (
  diagnostics: ValidationDiagnostic[],
  value: unknown,
): ApplicationBackendSupportedExposures | null => {
  if (!isObjectRecord(value)) {
    diagnostics.push(errorDiagnostic('INVALID_BACKEND_MANIFEST', 'supportedExposures must be an object.', 'supportedExposures'));
    return null;
  }
  const output = {} as ApplicationBackendSupportedExposures;
  for (const key of ['queries', 'commands', 'routes', 'graphql', 'notifications', 'eventHandlers'] as const) {
    if (typeof value[key] !== 'boolean') {
      diagnostics.push(
        errorDiagnostic('INVALID_BACKEND_MANIFEST', `supportedExposures.${key} must be a boolean.`, `supportedExposures.${key}`),
      );
      output[key] = false;
      continue;
    }
    output[key] = value[key];
  }
  return output;
};
