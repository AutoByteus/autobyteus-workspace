import path from "node:path";
import {
  isAbsoluteTeamCommunicationReferencePath,
  normalizeTeamCommunicationReferencePath,
} from "./team-communication-identity.js";

export type ExplicitTeamCommunicationReferenceFileValidationError = {
  index?: number;
  reason: string;
};

export type NormalizeExplicitTeamCommunicationReferenceFilesResult =
  | { ok: true; referenceFiles: string[] }
  | { ok: false; error: ExplicitTeamCommunicationReferenceFileValidationError };

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

export const validateExplicitTeamCommunicationReferenceFile = (value: string): string | null => {
  const normalized = normalizeTeamCommunicationReferencePath(value);
  if (!normalized) {
    return "empty path";
  }
  if (normalized.includes("\0")) {
    return "path contains a null byte";
  }
  if (normalized.startsWith("//") || normalized.includes("://")) {
    return "path must be a local filesystem path, not a URL or protocol path";
  }
  if (!isAbsoluteTeamCommunicationReferencePath(normalized) && !path.isAbsolute(normalized)) {
    return "path must be absolute";
  }
  if (hasInvalidSegments(normalized)) {
    return "path contains route-template or relative segments";
  }
  return null;
};

export const normalizeExplicitTeamCommunicationReferenceFiles = (
  rawReferenceFiles: unknown,
): NormalizeExplicitTeamCommunicationReferenceFilesResult => {
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
    const normalizedPath = normalizeTeamCommunicationReferencePath(rawPath);
    const invalidReason = validateExplicitTeamCommunicationReferenceFile(normalizedPath);
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
