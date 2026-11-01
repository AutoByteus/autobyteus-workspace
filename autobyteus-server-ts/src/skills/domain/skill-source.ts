export type GitHubSkillSourceRecord = {
  id: string;
  repository: { owner: string; repo: string };
  state: "ACTIVE" | "REMOVING";
  installed: { generation: string; revision: string; defaultBranch: string };
  lastCheck: null | {
    checkedAt: string; latestRevision: string | null; defaultBranch: string | null; error: string | null;
  };
  lastUpdateError: string | null;
};

export type GitHubSkillSourceInfo = {
  repositoryUrl: string;
  defaultBranch: string;
  installedRevision: string;
  latestRevision: string | null;
  latestCheckedAt: string | null;
  status: "NOT_CHECKED" | "UP_TO_DATE" | "UPDATE_AVAILABLE" | "CHECK_FAILED" | "UPDATE_FAILED" | "REMOVING";
  lastError: string | null;
};

export type SkillSourceInfo = {
  sourceId: string;
  sourceKind: "DEFAULT" | "LOCAL_PATH" | "GITHUB_REPOSITORY";
  path: string;
  skillCount: number;
  isDefault: boolean;
  github: GitHubSkillSourceInfo | null;
};
export type SkillSourceOperationResult = {
  sources: SkillSourceInfo[];
  warnings: string[];
  /** Set when a GitHub import found the repository already imported (nothing was imported). */
  alreadyImported?: true;
};

/**
 * Told before a source changes, so what depends on its files can let go first (the Integrations page removes the
 * connections of a source's integrations). A rejection refuses the removal or update.
 */
export interface SkillSourceChangeObserver {
  /** Before a source (local folder or GitHub repository) is removed; `rootPath` is its current root. */
  sourceRemoving(rootPath: string): Promise<void>;
  /** Before a GitHub source's update is published: its current root and the prepared new root. */
  sourceChanging(oldRoot: string, newRoot: string): Promise<void>;
}
export const repositoryKey = (repository: { owner: string; repo: string }): string =>
  `${repository.owner}/${repository.repo}`.toLowerCase();
export const repositoryUrl = (repository: { owner: string; repo: string }): string =>
  `https://github.com/${repository.owner}/${repository.repo}`;
