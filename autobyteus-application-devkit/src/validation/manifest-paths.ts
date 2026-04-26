import path from 'node:path';

export type ManifestPathValidation = {
  relativePath: string | null;
  errorMessage: string | null;
};

const normalizeManifestPathString = (
  value: unknown,
  fieldName: string,
): ManifestPathValidation => {
  if (typeof value !== 'string') {
    return { relativePath: null, errorMessage: `${fieldName} must be a string.` };
  }
  const normalized = value.trim().replace(/\\/g, '/');
  if (!normalized) {
    return { relativePath: null, errorMessage: `${fieldName} is required.` };
  }
  if (normalized.startsWith('/') || path.posix.isAbsolute(normalized)) {
    return { relativePath: null, errorMessage: `${fieldName} must be a relative path.` };
  }
  return { relativePath: normalized, errorMessage: null };
};

export const normalizePackageManifestPath = (
  value: unknown,
  fieldName: string,
  requiredPrefix: 'ui/' | 'backend/',
): ManifestPathValidation => {
  const normalized = normalizeManifestPathString(value, fieldName);
  if (!normalized.relativePath) {
    return normalized;
  }
  const resolved = path.posix.normalize(normalized.relativePath);
  if (resolved === '.' || resolved.startsWith('../') || resolved === '..') {
    return { relativePath: null, errorMessage: `${fieldName} must stay inside the application package root.` };
  }
  if (!resolved.startsWith(requiredPrefix)) {
    return { relativePath: null, errorMessage: `${fieldName} must point under ${requiredPrefix}.` };
  }
  return { relativePath: resolved, errorMessage: null };
};

export const normalizeOptionalPackageManifestPath = (
  value: unknown,
  fieldName: string,
  requiredPrefix: 'ui/' | 'backend/',
): ManifestPathValidation => {
  if (value === undefined || value === null || value === '') {
    return { relativePath: null, errorMessage: null };
  }
  return normalizePackageManifestPath(value, fieldName, requiredPrefix);
};
