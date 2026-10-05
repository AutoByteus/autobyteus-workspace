import { publicGitHubRequest } from "./public-github-request.js";
import { isGitHubIdentitySegment } from "./github-repository-source.js";
import type { GitHubRepositorySource, GitHubRepositoryMetadata, GitHubRepositoryRevisionMetadata } from "./types.js";
import { buildGitHubRepositoryApiUrl, buildGitHubRepositoryBranchApiUrl } from "./github-repository-source.js";

/** Public repository metadata transport; no package or skill installation policy. */
export class GitHubRepositoryClient {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}
  async fetchRepositoryRevisionMetadata(
    source: GitHubRepositorySource,
  ): Promise<GitHubRepositoryRevisionMetadata> {
    const metadata = await this.fetchRepositoryMetadata(source);
    const response = await publicGitHubRequest(
      buildGitHubRepositoryBranchApiUrl(metadata.owner, metadata.repo, metadata.defaultBranch), this.fetchImpl,
    );

    if (!response.ok) {
      throw new Error(
        `GitHub repository branch metadata request failed with HTTP ${response.status} ${response.statusText}.`,
      );
    }

    const payload = (await response.json()) as Partial<{
      commit: { sha?: string };
    }>;
    const latestRevision = payload.commit?.sha?.trim();
    if (!latestRevision) {
      throw new Error(
        `GitHub repository latest revision is unavailable: ${metadata.canonicalUrl}`,
      );
    }

    return {
      ...metadata,
      latestRevision,
    };
  }

  private async fetchRepositoryMetadata(
    source: GitHubRepositorySource,
  ): Promise<GitHubRepositoryMetadata> {
    const response = await publicGitHubRequest(buildGitHubRepositoryApiUrl(source), this.fetchImpl);

    if (response.status === 404) {
      throw new Error(
        `GitHub repository not found or not public: ${source.canonicalUrl}. For private repositories, clone locally and import the local path.`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `GitHub repository metadata request failed with HTTP ${response.status} ${response.statusText}.`,
      );
    }

    const payload = (await response.json()) as Partial<{
      default_branch: string;
      html_url: string;
      private: boolean;
      name: string;
      owner: { login?: string };
    }>;

    if (payload.private) {
      throw new Error(
        `GitHub repository is not public and cannot be imported: ${source.canonicalUrl}. Clone it locally and import the local path instead.`,
      );
    }

    const defaultBranch = payload.default_branch?.trim();
    if (!defaultBranch) {
      throw new Error(
        `GitHub repository default branch is unavailable: ${source.canonicalUrl}`,
      );
    }

    if (!isGitHubIdentitySegment(payload.owner?.login?.trim() || source.owner) ||
        !isGitHubIdentitySegment(payload.name?.trim() || source.repo)) {
      throw new Error("GitHub returned an invalid repository identity.");
    }
    return {
      owner: payload.owner?.login?.trim() || source.owner,
      repo: payload.name?.trim() || source.repo,
      canonicalUrl: payload.html_url?.trim() || source.canonicalUrl,
      defaultBranch,
    };
  }

}
