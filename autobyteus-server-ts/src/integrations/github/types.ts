export type GitHubRepositorySource = {
  owner: string;
  repo: string;
  normalizedRepository: string;
  canonicalUrl: string;
  installKey: string;
};

export type GitHubRepositoryMetadata = {
  owner: string;
  repo: string;
  canonicalUrl: string;
  defaultBranch: string;
};

export type GitHubRepositoryRevisionMetadata = GitHubRepositoryMetadata & {
  latestRevision: string;
};

