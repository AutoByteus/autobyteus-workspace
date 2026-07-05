import {
  isAgentRunFilePathAbsolute,
  normalizeAgentRunFilePathDisplay,
} from "../../agent-execution/domain/agent-run-file-path-identity.js";

export type ExplicitAbsoluteLocalReferenceFileValidationError = {
  index?: number;
  reason: string;
};

export type NormalizeExplicitAbsoluteLocalReferenceFilesResult =
  | { ok: true; referenceFiles: string[] }
  | { ok: false; error: ExplicitAbsoluteLocalReferenceFileValidationError };

const PROTOCOL_PATH_PREFIX = /^[a-z][a-z0-9+.-]*:/i;

const hasInvalidSegments = (value: string): boolean => {
  const segments = value.split(/[\\/]+/).filter(Boolean);
  return segments.some((segment) =>
    segment === "." ||
    segment === ".." ||
    segment.startsWith(":") ||
    segment.includes("{") ||
    segment.includes("}")
  );
};

const isProtocolOrUrlPath = (value: string): boolean =>
  value.startsWith("//") || PROTOCOL_PATH_PREFIX.test(value);

export const normalizeAbsoluteLocalReferenceFilePath = (value: string): string =>
  normalizeAgentRunFilePathDisplay(value);

export const validateExplicitAbsoluteLocalReferenceFile = (
  value: string,
): string | null => {
  const normalized = normalizeAbsoluteLocalReferenceFilePath(value);
  if (!normalized) {
    return "empty path";
  }
  if (normalized.includes("\0")) {
    return "path contains a null byte";
  }
  if (normalized.startsWith("//") || normalized.includes("://")) {
    return "path must be a local filesystem path, not a URL or protocol path";
  }
  if (!isAgentRunFilePathAbsolute(normalized)) {
    if (isProtocolOrUrlPath(normalized)) {
      return "path must be a local filesystem path, not a URL or protocol path";
    }
    return "path must be absolute";
  }
  if (hasInvalidSegments(normalized)) {
    return "path contains route-template or relative segments";
  }
  return null;
};

export const normalizeExplicitAbsoluteLocalReferenceFiles = (
  rawReferenceFiles: unknown,
): NormalizeExplicitAbsoluteLocalReferenceFilesResult => {
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
    const normalizedPath = normalizeAbsoluteLocalReferenceFilePath(rawPath);
    const invalidReason = validateExplicitAbsoluteLocalReferenceFile(normalizedPath);
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
