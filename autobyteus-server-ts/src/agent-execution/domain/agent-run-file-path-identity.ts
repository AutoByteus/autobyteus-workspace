import path from "node:path";

const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;

export type AgentRunFilePathResolutionFailureCode =
  | "INVALID_PATH"
  | "RELATIVE_PATH_REQUIRES_WORKSPACE_ROOT"
  | "UNSUPPORTED_ABSOLUTE_PATH";

export type AgentRunAbsoluteSourcePathResolution =
  | {
      ok: true;
      sourceAbsolutePath: string;
    }
  | {
      ok: false;
      code: AgentRunFilePathResolutionFailureCode;
    };

export const normalizeAgentRunFilePathDisplay = (value: string): string =>
  value.replace(/\\/g, "/").trim();

export const isAgentRunWindowsAbsolutePath = (value: string): boolean =>
  WINDOWS_ABSOLUTE_PATH_PATTERN.test(value);

export const isAgentRunFilePathAbsolute = (value: string): boolean =>
  path.isAbsolute(value) || isAgentRunWindowsAbsolutePath(value);

export const isAgentRunFilePathWithinRoot = (
  rootPath: string,
  candidatePath: string,
): boolean => {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedCandidate = path.resolve(candidatePath);
  return (
    resolvedCandidate === resolvedRoot
    || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  );
};

const normalizeOptionalWorkspaceRoot = (
  workspaceRootPath: string | null | undefined,
): string | null => {
  if (typeof workspaceRootPath !== "string") {
    return null;
  }
  const trimmed = workspaceRootPath.trim();
  return trimmed.length > 0 ? path.resolve(trimmed) : null;
};

const resolveAbsoluteCandidatePath = (
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

export const resolveAgentRunAbsoluteSourcePath = (
  rawPath: string | null | undefined,
  workspaceRootPath?: string | null,
): AgentRunAbsoluteSourcePathResolution => {
  if (typeof rawPath !== "string") {
    return { ok: false, code: "INVALID_PATH" };
  }

  const trimmed = rawPath.trim();
  if (!trimmed) {
    return { ok: false, code: "INVALID_PATH" };
  }

  const resolvedWorkspaceRoot = normalizeOptionalWorkspaceRoot(workspaceRootPath);
  const isAbsolute = isAgentRunFilePathAbsolute(trimmed);
  if (!isAbsolute && !resolvedWorkspaceRoot) {
    return { ok: false, code: "RELATIVE_PATH_REQUIRES_WORKSPACE_ROOT" };
  }

  const sourceAbsolutePath = resolveAbsoluteCandidatePath(trimmed, resolvedWorkspaceRoot);
  if (!sourceAbsolutePath) {
    return { ok: false, code: "UNSUPPORTED_ABSOLUTE_PATH" };
  }

  return {
    ok: true,
    sourceAbsolutePath,
  };
};
