import { publicGitHubRequest } from "./public-github-request.js";
import { isGitHubIdentitySegment } from "./github-repository-source.js";
import type { GitHubRepositorySource, GitHubRepositoryMetadata, GitHubRepositoryRevisionMetadata } from "./types.js";
import { buildGitHubRepositoryApiUrl, buildGitHubRepositoryBranchApiUrl } from "./github-repository-source.js";
import { buildLsRefsHeadRequest, LS_REFS_HEADERS, parseLsRefsHead, type RepositoryHead } from "./git-ls-refs.js";

/** Public repository metadata transport; no package or skill installation policy. */
export class GitHubRepositoryClient {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  /**
   * The default branch and its head commit, read through git (protocol v2 `ls-refs`): one
   * github.com request that costs no REST quota. Used by update checks and updates; imports keep
   * the REST metadata for the repository's identity and visibility.
   */
  async fetchDefaultBranchHead(owner: string, repo: string): Promise<RepositoryHead> {
    if (!isGitHubIdentitySegment(owner) || !isGitHubIdentitySegment(repo)) {
      throw new Error("Invalid GitHub repository owner or name.");
    }
    const response = await publicGitHubRequest(
      `https://github.com/${owner}/${repo}.git/git-upload-pack`,
      { method: "POST", body: buildLsRefsHeadRequest(), headers: LS_REFS_HEADERS, fetchImpl: this.fetchImpl },
    );
    if (response.status === 401 || response.status === 404) {
      await response.body?.cancel();
      throw new Error(
        `GitHub repository not found or not public: https://github.com/${owner}/${repo}. For private repositories, clone locally and import the local path.`,
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`GitHub repository head request failed with HTTP ${response.status} ${response.statusText}.`);
    }
    return parseLsRefsHead(await response.text());
  }

  /**
   * The tag of a repository's latest release, from github.com's `releases/latest` redirect (no
   * REST quota). The redirect must name that repository's release tag page.
   */
  async fetchLatestReleaseTag(owner: string, repo: string): Promise<string> {
    if (!isGitHubIdentitySegment(owner) || !isGitHubIdentitySegment(repo)) {
      throw new Error("Invalid GitHub repository owner or name.");
    }
    const base = `https://github.com/${owner}/${repo}/releases/latest`;
    const response = await publicGitHubRequest(base, { followRedirects: false, fetchImpl: this.fetchImpl });
    await response.body?.cancel();
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) {
      throw new Error(`GitHub latest release request answered HTTP ${response.status}.`);
    }
    const target = new URL(location, base);
    const prefix = `/${owner}/${repo}/releases/tag/`.toLowerCase();
    if (target.protocol !== "https:" || target.hostname !== "github.com"
      || !target.pathname.toLowerCase().startsWith(prefix) || target.pathname.length === prefix.length) {
      throw new Error("GitHub latest release redirect has an unexpected destination.");
    }
    return decodeURIComponent(target.pathname.slice(prefix.length));
  }
  async fetchRepositoryRevisionMetadata(
    source: GitHubRepositorySource,
  ): Promise<GitHubRepositoryRevisionMetadata> {
    const metadata = await this.fetchRepositoryMetadata(source);
    const response = await publicGitHubRequest(
      buildGitHubRepositoryBranchApiUrl(metadata.owner, metadata.repo, metadata.defaultBranch), { fetchImpl: this.fetchImpl },
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
    const response = await publicGitHubRequest(buildGitHubRepositoryApiUrl(source), { fetchImpl: this.fetchImpl });

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
