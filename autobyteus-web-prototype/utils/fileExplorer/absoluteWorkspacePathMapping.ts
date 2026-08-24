import { normalizeAbsoluteFilePath } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';

export interface WorkspaceRelativeFileLocator {
  workspaceId: string;
  relativePath: string;
}

const comparisonPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
  return /^[A-Za-z]:\//.test(normalized) ? normalized.toLowerCase() : normalized;
};

/**
 * Maps a host absolute path to an authorized workspace-relative identity.
 * This is advisory client policy only; the server/native reader validates it
 * again before returning bytes.
 */
export function mapAbsolutePathToWorkspaceRelative(
  absolutePath: string,
  workspace: { workspaceId: string; workspaceRootPath?: string | null; absolutePath?: string | null },
): WorkspaceRelativeFileLocator | null {
  const normalizedCandidate = normalizeAbsoluteFilePath(absolutePath);
  const normalizedRoot = normalizeAbsoluteFilePath(
    workspace.workspaceRootPath || workspace.absolutePath || '',
  );
  if (!normalizedCandidate || !normalizedRoot || !workspace.workspaceId) {
    return null;
  }

  const candidateForComparison = comparisonPath(normalizedCandidate);
  const rootForComparison = comparisonPath(normalizedRoot);
  const prefix = rootForComparison === '/' ? '/' : `${rootForComparison}/`;
  if (!candidateForComparison.startsWith(prefix) || candidateForComparison === rootForComparison) {
    return null;
  }

  const relativePath = normalizedCandidate.slice(normalizedRoot.length).replace(/^\/+/, '');
  if (!relativePath || relativePath.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
    return null;
  }

  return { workspaceId: workspace.workspaceId, relativePath };
}
