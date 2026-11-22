import {
  createAbsoluteFilePathAction,
  normalizeAbsoluteFilePath,
  type AbsoluteFilePathAction,
} from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';
import { resolveWorkspaceRelativeReference } from '~/utils/fileExplorer/workspaceResourceUrl';

/**
 * A run-relative link's file as an absolute path action inside the run's folder (autobyteus-609 D-H), or null when it has
 * none: the link leaves the folder or names no file (the one rule for relative references, autobyteus-576), the folder is
 * not an absolute path, or the file type cannot be previewed. The `#fragment` and `?query` are not part of the file. A
 * Windows root keeps its drive (`C:/…`), as every absolute path action does.
 */
export const resolveRunRelativeFileLink = (href: string, runRootPath: string): AbsoluteFilePathAction | null => {
  const root = normalizeAbsoluteFilePath(runRootPath);
  if (!root) return null;
  const reference = resolveWorkspaceRelativeReference(href, '');
  if (reference.kind !== 'resolved') return null;
  return createAbsoluteFilePathAction(`run-relative:${href}`, {
    rawCandidate: href,
    rawDestination: href,
    normalizedCandidate: `${root}/${reference.workspaceRelativePath}`,
  }, 'markdown-link');
};
