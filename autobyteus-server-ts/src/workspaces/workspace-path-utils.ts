import path from "node:path";

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

export const resolveWorkspaceRelativePath = (
  workspaceRootPath: string,
  relativePath: string,
): string => {
  const normalizedRoot = canonicalizeWorkspaceRootPath(workspaceRootPath);
  if (path.isAbsolute(relativePath)) {
    throw new Error("Access denied: Path resolves outside the workspace boundary.");
  }

  const absolutePath = path.resolve(normalizedRoot, relativePath || ".");
  const relativeToRoot = path.relative(normalizedRoot, absolutePath);
  if (
    relativeToRoot === ".." ||
    relativeToRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToRoot)
  ) {
    throw new Error("Access denied: Path resolves outside the workspace boundary.");
  }

  return absolutePath;
};
