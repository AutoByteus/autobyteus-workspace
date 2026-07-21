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

export function resolveAbsolutePath(
  context: WorkspaceContextLike,
  inputPath: string
): string {
  if (typeof inputPath !== 'string' || inputPath.trim().length === 0) {
    throw new Error('Path must be a non-empty string.');
  }

  const normalizedInputPath = inputPath.trim();
  const workspaceRootPath = context.workspaceRootPath ?? null;
  if (!workspaceRootPath || workspaceRootPath.trim().length === 0) {
    throw new Error(
      `Path access is unavailable for agent '${context.agentId}' because no workspace root is configured.`
    );
  }
  const lexicalRoot = pathModule.resolve(workspaceRootPath);
  const candidate = pathModule.resolve(
    pathModule.isAbsolute(normalizedInputPath) ? normalizedInputPath : pathModule.join(lexicalRoot, normalizedInputPath),
  );
  if (!isWithin(lexicalRoot, candidate)) throw new Error('FILE_TOOL_PATH_OUTSIDE_AUTHORIZED_ROOT');

  const physicalRoot = fs.realpathSync(lexicalRoot);
  const physicalCandidate = resolvePhysicalCandidate(candidate);
  if (!isWithin(physicalRoot, physicalCandidate)) throw new Error('FILE_TOOL_PATH_OUTSIDE_AUTHORIZED_ROOT');
  if (deniedRealPaths.some((denied) => isWithin(denied, physicalCandidate))) {
    throw new Error('FILE_TOOL_PATH_DENIED');
  }
  return pathModule.normalize(physicalCandidate);
}
