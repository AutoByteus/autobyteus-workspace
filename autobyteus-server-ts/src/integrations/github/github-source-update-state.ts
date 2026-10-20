/**
 * What a source owner knows about one imported GitHub source's update, without its status:
 * the facts both agent packages and skill sources keep. `latestRevision` is the latest revision
 * the owner last saw; it is kept after a failed check.
 */
export type GitHubSourceUpdateState = {
  sourceId: string;
  displayName: string;
  repositoryUrl: string;
  defaultBranch: string | null;
  installedRevision: string | null;
  latestRevision: string | null;
  lastCheckedAt: string | null;
};

/** Called by a source owner after an import, removal, check or update settled. */
export type GitHubSourceStateListener = () => void;
