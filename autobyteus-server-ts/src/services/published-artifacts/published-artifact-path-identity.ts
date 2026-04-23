import path from "node:path";
import {
  buildPublishedArtifactId,
  normalizePublishedArtifactPath,
} from "./published-artifact-types.js";

const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;

const isWindowsAbsolutePath = (value: string): boolean => WINDOWS_ABSOLUTE_PATH_PATTERN.test(value);

const isAbsolutePath = (value: string): boolean => path.isAbsolute(value) || isWindowsAbsolutePath(value);

export const isPublishedArtifactPathWithinRoot = (
  rootPath: string,
  candidatePath: string,
): boolean => {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedCandidate = path.resolve(candidatePath);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`);
};

export const canonicalizePublishedArtifactPath = (
  rawPath: string | null | undefined,
  workspaceRootPath: string | null | undefined,
): string | null => {
  if (typeof rawPath !== "string" || typeof workspaceRootPath !== "string") {
    return null;
  }

  const trimmedPath = rawPath.trim();
  const trimmedWorkspaceRoot = workspaceRootPath.trim();
  if (!trimmedPath || !trimmedWorkspaceRoot) {
    return null;
  }

  const resolvedWorkspaceRoot = path.resolve(trimmedWorkspaceRoot);
  const absoluteCandidatePath = isAbsolutePath(trimmedPath)
    ? path.resolve(trimmedPath)
    : path.resolve(resolvedWorkspaceRoot, trimmedPath);

  if (!isPublishedArtifactPathWithinRoot(resolvedWorkspaceRoot, absoluteCandidatePath)) {
    return null;
  }

  const relativePath = path.relative(resolvedWorkspaceRoot, absoluteCandidatePath);
  if (!relativePath || relativePath === ".") {
    return null;
  }

  return normalizePublishedArtifactPath(relativePath);
};

export const resolvePublishedArtifactAbsolutePath = (
  canonicalPath: string | null | undefined,
  workspaceRootPath: string | null | undefined,
): string | null => {
  if (typeof canonicalPath !== "string" || typeof workspaceRootPath !== "string") {
    return null;
  }

  const trimmedPath = canonicalPath.trim();
  const trimmedWorkspaceRoot = workspaceRootPath.trim();
  if (!trimmedPath || !trimmedWorkspaceRoot) {
    return null;
  }

  const resolvedWorkspaceRoot = path.resolve(trimmedWorkspaceRoot);
  const absoluteCandidatePath = path.resolve(resolvedWorkspaceRoot, trimmedPath);
  if (!isPublishedArtifactPathWithinRoot(resolvedWorkspaceRoot, absoluteCandidatePath)) {
    return null;
  }

  return absoluteCandidatePath;
};

export const buildPublishedArtifactIdentity = (
  runId: string,
  canonicalPath: string,
): { artifactId: string; canonicalPath: string } => {
  const normalizedCanonicalPath = normalizePublishedArtifactPath(canonicalPath);
  return {
    artifactId: buildPublishedArtifactId(runId, normalizedCanonicalPath),
    canonicalPath: normalizedCanonicalPath,
  };
};
