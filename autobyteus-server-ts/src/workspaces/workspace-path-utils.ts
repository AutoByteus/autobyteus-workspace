import fs from "node:fs/promises";
import path from "node:path";
import { WorkspaceAccessError } from "./workspace-access-error.js";

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

/**
 * For a workspace that does not follow links: refuses `WORKSPACE_LINK_NOT_OPENED` when any entry from the root down to
 * `absolutePath` (a path already inside the root, from `resolveWorkspaceRelativePath`) is a symbolic link. With no link
 * on the way, the real path is the lexical one and so stays inside the root. A missing entry ends the check: the caller
 * reports it as not found.
 */
export const assertNoSymbolicLinkOnPath = async (
  workspaceRootPath: string,
  absolutePath: string,
): Promise<void> => {
  const root = canonicalizeWorkspaceRootPath(workspaceRootPath);
  const parts = path.relative(root, absolutePath).split(path.sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    let isLink: boolean;
    try {
      isLink = (await fs.lstat(current)).isSymbolicLink();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | null)?.code;
      if (code === "ENOENT" || code === "ENOTDIR") return;
      throw error;
    }
    if (isLink) {
      throw new WorkspaceAccessError(
        "WORKSPACE_LINK_NOT_OPENED",
        `'${path.relative(root, current)}' is a symbolic link; links in this workspace are listed but never opened.`,
      );
    }
  }
};
