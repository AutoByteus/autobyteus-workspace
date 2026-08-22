import os from 'node:os';
import path from 'node:path';
import * as fs from 'node:fs';
import type { AgentContextLike } from './background-process-context.js';

const isPermissionError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  return code === 'EACCES' || code === 'EPERM';
};

const resolvePhysicalCandidate = (candidate: string): string => {
  let existingAncestor = candidate;
  while (!fs.existsSync(existingAncestor)) {
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) break;
    existingAncestor = parent;
  }
  const realAncestor = fs.realpathSync(existingAncestor);
  return path.resolve(realAncestor, path.relative(existingAncestor, candidate));
};

function resolveTerminalCwd(cwd: string): string {
  if (!path.isAbsolute(cwd)) {
    throw new Error('Working directory must be an absolute path.');
  }
  return path.normalize(resolvePhysicalCandidate(path.resolve(cwd)));
}

function ensureDirectoryExists(directoryPath: string): void {
  let stats;
  try {
    stats = fs.statSync(directoryPath);
  } catch (error) {
    if (isPermissionError(error)) {
      throw new Error(`Working directory '${directoryPath}' is not accessible.`);
    }
    throw new Error(`Working directory '${directoryPath}' does not exist.`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`Working directory '${directoryPath}' is not a directory.`);
  }

  const accessMode = process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK;
  try {
    fs.accessSync(directoryPath, accessMode);
  } catch {
    throw new Error(`Working directory '${directoryPath}' is not accessible.`);
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
  const resolved = resolveTerminalCwd(normalizedCwd);
  ensureDirectoryExists(resolved);
  return resolved;
}
