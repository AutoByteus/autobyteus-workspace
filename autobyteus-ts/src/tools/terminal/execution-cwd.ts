import os from 'node:os';
import path from 'node:path';
import { statSync } from 'node:fs';
import type { AgentContextLike } from './background-process-context.js';

function ensureDirectoryExists(directoryPath: string): void {
  let stats;
  try {
    stats = statSync(directoryPath);
  } catch {
    throw new Error(`Working directory '${directoryPath}' does not exist.`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`Working directory '${directoryPath}' is not a directory.`);
  }
}

export function resolveExecutionCwd(
  context: AgentContextLike | null | undefined,
  cwd?: string | null
): string {
  const workspaceRootPath = context?.workspaceRootPath;

  if (cwd === undefined || cwd === null) {
    const defaultCwd =
      workspaceRootPath && typeof workspaceRootPath === 'string' && workspaceRootPath.trim().length > 0
        ? path.resolve(workspaceRootPath)
        : os.tmpdir();
    ensureDirectoryExists(defaultCwd);
    return defaultCwd;
  }

  if (typeof cwd !== 'string' || cwd.trim().length === 0) {
    throw new Error("Parameter 'cwd' for terminal tool must be a non-empty string when provided.");
  }

  const normalizedCwd = cwd.trim();
  const hasWorkspaceRoot =
    workspaceRootPath && typeof workspaceRootPath === 'string' && workspaceRootPath.trim().length > 0;
  if (!path.isAbsolute(normalizedCwd) && !hasWorkspaceRoot) {
    throw new Error(
      "Parameter 'cwd' for terminal tool must be absolute when no workspace root is configured. Configure a workspace or pass an absolute path."
    );
  }

  const resolved = path.isAbsolute(normalizedCwd)
    ? path.resolve(normalizedCwd)
    : path.resolve(path.resolve(workspaceRootPath as string), normalizedCwd);
  ensureDirectoryExists(resolved);
  return resolved;
}
