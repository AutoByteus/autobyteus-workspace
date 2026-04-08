import pathModule from 'path';

type WorkspaceContextLike = { agentId: string; workspaceRootPath?: string | null };

export function resolveWorkspaceBoundPath(
  context: WorkspaceContextLike,
  inputPath: string
): string {
  if (typeof inputPath !== 'string' || inputPath.trim().length === 0) {
    throw new Error('Path must be a non-empty string.');
  }

  const normalizedInputPath = inputPath.trim();
  const workspaceRootPath = context.workspaceRootPath ?? null;

  if (!workspaceRootPath) {
    if (!pathModule.isAbsolute(normalizedInputPath)) {
      throw new Error(
        `Relative path '${normalizedInputPath}' provided, but no workspace is configured for agent '${context.agentId}'. A workspace is required to resolve relative paths.`
      );
    }
    return pathModule.normalize(pathModule.resolve(normalizedInputPath));
  }

  const workspaceRoot = pathModule.resolve(workspaceRootPath);
  const resolvedPath = pathModule.isAbsolute(normalizedInputPath)
    ? pathModule.resolve(normalizedInputPath)
    : pathModule.resolve(workspaceRoot, normalizedInputPath);

  return pathModule.normalize(resolvedPath);
}
