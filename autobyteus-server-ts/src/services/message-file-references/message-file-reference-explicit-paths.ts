import path from "node:path";
import { normalizeMessageFileReferencePath } from "./message-file-reference-identity.js";

export type ExplicitMessageFileReferencePathValidationError = {
  index?: number;
  reason: string;
};

export type NormalizeExplicitMessageFileReferencePathsResult =
  | { ok: true; referenceFiles: string[] }
  | { ok: false; error: ExplicitMessageFileReferencePathValidationError };

const isAbsoluteLocalPath = (value: string): boolean =>
  path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || path.isAbsolute(value);

const hasInvalidSegments = (value: string): boolean => {
  const segments = value.split(/[\/]+/).filter(Boolean);
  return segments.some((segment) =>
    segment === "." ||
    segment === ".." ||
    segment.startsWith(":") ||
    segment.includes("{") ||
    segment.includes("}")
  );
};

export const validateExplicitMessageFileReferencePath = (value: string): string | null => {
  const normalized = normalizeMessageFileReferencePath(value);
  if (!normalized) {
    return "empty path";
  }
  if (normalized.includes("\0")) {
    return "path contains a null byte";
  }
  if (normalized.startsWith("//") || normalized.includes("://")) {
    return "path must be a local filesystem path, not a URL or protocol path";
  }
  if (!isAbsoluteLocalPath(normalized)) {
    return "path must be absolute";
  }
  if (hasInvalidSegments(normalized)) {
    return "path contains route-template or relative segments";
  }
  return null;
};

export const normalizeExplicitMessageFileReferencePaths = (
  rawReferenceFiles: unknown,
): NormalizeExplicitMessageFileReferencePathsResult => {
  if (rawReferenceFiles === undefined || rawReferenceFiles === null) {
    return { ok: true, referenceFiles: [] };
  }
  if (!Array.isArray(rawReferenceFiles)) {
    return {
      ok: false,
      error: { reason: "reference_files must be an array of absolute path strings" },
    };
  }
  if (rawReferenceFiles.length === 0) {
    return { ok: true, referenceFiles: [] };
  }

  const seen = new Set<string>();
  const referenceFiles: string[] = [];
  for (const [index, rawPath] of rawReferenceFiles.entries()) {
    if (typeof rawPath !== "string") {
      return {
        ok: false,
        error: { index, reason: "each reference_files entry must be a string" },
      };
    }
    const normalizedPath = normalizeMessageFileReferencePath(rawPath);
    const invalidReason = validateExplicitMessageFileReferencePath(normalizedPath);
    if (invalidReason) {
      return {
        ok: false,
        error: { index, reason: invalidReason },
      };
    }
    if (!seen.has(normalizedPath)) {
      seen.add(normalizedPath);
      referenceFiles.push(normalizedPath);
    }
  }

  return { ok: true, referenceFiles };
};
