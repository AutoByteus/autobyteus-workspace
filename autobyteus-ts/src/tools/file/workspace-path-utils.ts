import pathModule from 'path';

type WorkspaceContextLike = { agentId: string; workspaceRootPath?: string | null };

export function resolveAbsolutePath(
  context: WorkspaceContextLike,
  inputPath: string
): string {
  if (typeof inputPath !== 'string' || inputPath.trim().length === 0) {
    throw new Error('Path must be a non-empty string.');
  }

  const normalizedInputPath = inputPath.trim();
  if (pathModule.isAbsolute(normalizedInputPath)) {
    return pathModule.normalize(pathModule.resolve(normalizedInputPath));
  }

  const workspaceRootPath = context.workspaceRootPath ?? null;
  if (!workspaceRootPath || workspaceRootPath.trim().length === 0) {
    throw new Error(
      `Relative path '${normalizedInputPath}' provided for agent '${context.agentId}', but no workspace root is configured.`
    );
  }

  return pathModule.normalize(pathModule.resolve(workspaceRootPath, normalizedInputPath));
}
