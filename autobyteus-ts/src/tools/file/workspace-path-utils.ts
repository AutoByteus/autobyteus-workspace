import pathModule from 'path';
import fs from 'node:fs';

type WorkspaceContextLike = { agentId: string; workspaceRootPath?: string | null };

let deniedRealPaths: string[] = [];

export const configureFileToolDeniedPaths = (paths: Iterable<string>): void => {
  deniedRealPaths = [...new Set(Array.from(paths, (value) => {
    const resolved = pathModule.resolve(value);
    try { return fs.realpathSync(resolved); } catch { return resolved; }
  }))];
};

const isWithin = (root: string, candidate: string): boolean =>
  candidate === root || candidate.startsWith(`${root}${pathModule.sep}`);

const resolvePhysicalCandidate = (candidate: string): string => {
  let existingAncestor = candidate;
  while (!fs.existsSync(existingAncestor)) {
    const parent = pathModule.dirname(existingAncestor);
    if (parent === existingAncestor) break;
    existingAncestor = parent;
  }
  const realAncestor = fs.realpathSync(existingAncestor);
  return pathModule.resolve(realAncestor, pathModule.relative(existingAncestor, candidate));
};

const RELATIVE_PATH_ERROR =
  "Relative file paths require an explicit absolute 'base_dir'. Provide an absolute path or an absolute base_dir; relative paths are not resolved from the configured workspace, process cwd, or prior shell cd state.";

export function resolveFileToolPath(
  _context: WorkspaceContextLike,
  inputPath: string,
  baseDir?: string | null
): string {
  if (typeof inputPath !== 'string' || inputPath.trim().length === 0) {
    throw new Error('Path must be a non-empty string.');
  }

  const normalizedInputPath = inputPath.trim();
  let candidate: string;
  if (pathModule.isAbsolute(normalizedInputPath)) {
    candidate = pathModule.resolve(normalizedInputPath);
  } else {
    if (typeof baseDir !== 'string' || baseDir.trim().length === 0) {
      throw new Error(RELATIVE_PATH_ERROR);
    }
    const normalizedBaseDir = baseDir.trim();
    if (!pathModule.isAbsolute(normalizedBaseDir)) {
      throw new Error("Parameter 'base_dir' must be an absolute directory when provided for a relative path.");
    }
    candidate = pathModule.resolve(normalizedBaseDir, normalizedInputPath);
  }

  const physicalCandidate = resolvePhysicalCandidate(candidate);
  if (deniedRealPaths.some((denied) => isWithin(denied, physicalCandidate))) {
    throw new Error('FILE_TOOL_PATH_DENIED');
  }
  return pathModule.normalize(candidate);
}
