import os from 'node:os';
import path from 'node:path';
import { existsSync, realpathSync, statSync } from 'node:fs';
import type { AgentContextLike } from './background-process-context.js';

const isWithin = (root: string, candidate: string): boolean =>
  candidate === root || candidate.startsWith(`${root}${path.sep}`);

const resolvePhysicalCandidate = (candidate: string): string => {
  let existingAncestor = candidate;
  while (!existsSync(existingAncestor)) {
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) break;
    existingAncestor = parent;
  }
  const realAncestor = realpathSync(existingAncestor);
  return path.resolve(realAncestor, path.relative(existingAncestor, candidate));
};

function resolveContainedTerminalCwd(context: AgentContextLike, cwd: string): string {
  const workspaceRootPath = context.workspaceRootPath;
  if (!workspaceRootPath || workspaceRootPath.trim().length === 0) {
    throw new Error("Parameter 'cwd' requires an authorized workspace root.");
  }

  const lexicalRoot = path.resolve(workspaceRootPath);
  const candidate = path.resolve(path.isAbsolute(cwd) ? cwd : path.join(lexicalRoot, cwd));
  if (!isWithin(lexicalRoot, candidate)) {
    throw new Error('FILE_TOOL_PATH_OUTSIDE_AUTHORIZED_ROOT');
  }

  const physicalRoot = realpathSync(lexicalRoot);
  const physicalCandidate = resolvePhysicalCandidate(candidate);
  if (!isWithin(physicalRoot, physicalCandidate)) {
    throw new Error('FILE_TOOL_PATH_OUTSIDE_AUTHORIZED_ROOT');
  }
  return path.normalize(physicalCandidate);
}

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
  const resolved = resolveContainedTerminalCwd({
    agentId: context?.agentId ?? 'unknown',
    workspaceRootPath: workspaceRootPath as string,
  }, normalizedCwd);
  ensureDirectoryExists(resolved);
  return resolved;
}
