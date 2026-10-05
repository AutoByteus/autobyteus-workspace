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
export type SkillSourceOperationResult = { sources: SkillSourceInfo[]; warnings: string[] };
export const repositoryKey = (repository: { owner: string; repo: string }): string =>
  `${repository.owner}/${repository.repo}`.toLowerCase();
export const repositoryUrl = (repository: { owner: string; repo: string }): string =>
  `https://github.com/${repository.owner}/${repository.repo}`;
