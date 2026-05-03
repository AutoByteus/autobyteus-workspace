import path from "node:path";

const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;

const normalizePathDisplay = (value: string): string => value.replace(/\\/g, "/").trim();

const isWindowsAbsolutePath = (value: string): boolean => WINDOWS_ABSOLUTE_PATH_PATTERN.test(value);

const isAbsolutePath = (value: string): boolean => path.isAbsolute(value) || isWindowsAbsolutePath(value);

const isWithinRoot = (rootPath: string, candidatePath: string): boolean => {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedCandidate = path.resolve(candidatePath);
  return (
    resolvedCandidate === resolvedRoot
    || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  );
};

const resolveAbsoluteCandidatePath = (
  rawPath: string,
  workspaceRootPath: string,
): string => {
  if (isAbsolutePath(rawPath)) {
    return path.resolve(rawPath);
  }
  return path.resolve(workspaceRootPath, rawPath);
};

export const canonicalizeAgentRunFileChangePath = (
  rawPath: string | null | undefined,
  workspaceRootPath?: string | null,
): string | null => {
  if (typeof rawPath !== "string") {
    return null;
  }

  const trimmed = rawPath.trim();
  if (!trimmed) {
    return null;
  }

  const normalizedRawPath = normalizePathDisplay(trimmed);
  if (!workspaceRootPath) {
    return normalizedRawPath;
  }

  const resolvedWorkspaceRoot = path.resolve(workspaceRootPath);
  const absoluteCandidatePath = resolveAbsoluteCandidatePath(trimmed, resolvedWorkspaceRoot);

  if (isWithinRoot(resolvedWorkspaceRoot, absoluteCandidatePath)) {
    const relativePath = path.relative(resolvedWorkspaceRoot, absoluteCandidatePath);
    return normalizePathDisplay(relativePath || path.basename(absoluteCandidatePath));
  }

  return normalizePathDisplay(absoluteCandidatePath);
};

export const resolveAgentRunFileChangeAbsolutePath = (
  canonicalPath: string | null | undefined,
  workspaceRootPath?: string | null,
): string | null => {
  if (typeof canonicalPath !== "string") {
    return null;
  }

  const trimmed = canonicalPath.trim();
  if (!trimmed) {
    return null;
  }

  if (isWindowsAbsolutePath(trimmed) && path.sep !== "\\") {
    return null;
  }

  if (isAbsolutePath(trimmed)) {
    return path.resolve(trimmed);
  }

  if (!workspaceRootPath) {
    return null;
  }

  return path.resolve(workspaceRootPath, trimmed);
};

export const isCanonicalAgentRunFileChangePathAbsolute = (
  canonicalPath: string | null | undefined,
): boolean => {
  if (typeof canonicalPath !== "string") {
    return false;
  }

  const trimmed = canonicalPath.trim();
  if (!trimmed) {
    return false;
  }

  return isAbsolutePath(trimmed);
};
