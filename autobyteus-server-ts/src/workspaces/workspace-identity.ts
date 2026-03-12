import path from "node:path";

export const FILESYSTEM_WORKSPACE_ID_PREFIX = "root:";

const trimTrailingSeparators = (value: string): string => {
  const parsedRoot = path.parse(value).root;
  if (value === parsedRoot) {
    return value;
  }
  return value.replace(/[\\/]+$/, "");
};

export const canonicalizeWorkspaceRootPath = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("workspaceRootPath cannot be empty.");
  }
  const normalized = path.normalize(path.resolve(trimmed));
  return trimTrailingSeparators(normalized);
};

export const workspaceDisplayNameFromRootPath = (workspaceRootPath: string): string => {
  const normalized = canonicalizeWorkspaceRootPath(workspaceRootPath);
  const parsedRoot = path.parse(normalized).root;
  if (normalized === parsedRoot) {
    return normalized;
  }
  return path.basename(normalized);
};

export const buildFilesystemWorkspaceId = (rootPath: string): string =>
  `${FILESYSTEM_WORKSPACE_ID_PREFIX}${canonicalizeWorkspaceRootPath(rootPath)}`;

export const tryResolveFilesystemWorkspaceRootPathFromId = (
  workspaceId: string,
): string | null => {
  const trimmedWorkspaceId = workspaceId.trim();
  if (!trimmedWorkspaceId.startsWith(FILESYSTEM_WORKSPACE_ID_PREFIX)) {
    return null;
  }

  const rawRootPath = trimmedWorkspaceId.slice(FILESYSTEM_WORKSPACE_ID_PREFIX.length);
  if (!rawRootPath.trim()) {
    return null;
  }

  return canonicalizeWorkspaceRootPath(rawRootPath);
};
