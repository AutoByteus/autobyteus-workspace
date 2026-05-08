import path from "node:path";

import {
  isAgentRunFilePathAbsolute,
  isAgentRunFilePathWithinRoot,
  isAgentRunWindowsAbsolutePath,
  normalizeAgentRunFilePathDisplay,
} from "./agent-run-file-path-identity.js";

const normalizeOptionalWorkspaceRoot = (
  workspaceRootPath: string | null | undefined,
): string | null => {
  if (typeof workspaceRootPath !== "string") {
    return null;
  }
  const trimmed = workspaceRootPath.trim();
  return trimmed.length > 0 ? path.resolve(trimmed) : null;
};

const resolveFileChangeCandidatePath = (
  rawPath: string,
  workspaceRootPath: string | null,
): string | null => {
  if (isAgentRunWindowsAbsolutePath(rawPath) && path.sep !== "\\") {
    return null;
  }

  if (isAgentRunFilePathAbsolute(rawPath)) {
    return path.resolve(rawPath);
  }

  if (!workspaceRootPath) {
    return null;
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

  const resolvedWorkspaceRoot = normalizeOptionalWorkspaceRoot(workspaceRootPath);
  const absoluteCandidatePath = resolveFileChangeCandidatePath(trimmed, resolvedWorkspaceRoot);
  if (!resolvedWorkspaceRoot) {
    return normalizeAgentRunFilePathDisplay(absoluteCandidatePath ?? trimmed);
  }

  if (!absoluteCandidatePath) {
    return null;
  }

  if (isAgentRunFilePathWithinRoot(resolvedWorkspaceRoot, absoluteCandidatePath)) {
    const relativePath = path.relative(resolvedWorkspaceRoot, absoluteCandidatePath);
    return normalizeAgentRunFilePathDisplay(relativePath || path.basename(absoluteCandidatePath));
  }

  return normalizeAgentRunFilePathDisplay(absoluteCandidatePath);
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

  if (isAgentRunWindowsAbsolutePath(trimmed) && path.sep !== "\\") {
    return null;
  }

  if (isAgentRunFilePathAbsolute(trimmed)) {
    return path.resolve(trimmed);
  }

  const resolvedWorkspaceRoot = normalizeOptionalWorkspaceRoot(workspaceRootPath);
  if (!resolvedWorkspaceRoot) {
    return null;
  }

  return path.resolve(resolvedWorkspaceRoot, trimmed);
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

  return isAgentRunFilePathAbsolute(trimmed);
};
