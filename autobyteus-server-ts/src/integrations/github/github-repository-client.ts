import fs from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { SecretVaultError } from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import { gitHubRequest, type GitHubRequestOptions } from "./github-request.js";
import type { GitHubTokenReader } from "./node-github-token.js";
import type { GitHubRepositorySource, GitHubRepositoryMetadata, GitHubRepositoryRevisionMetadata } from "./types.js";
import {
  buildGitHubRepositoryApiUrl,
  buildGitHubRepositoryArchiveUrlForRef,
  buildGitHubRepositoryBranchApiUrl,
  isGitHubIdentitySegment,
} from "./github-repository-source.js";
import { buildLsRefsHeadRequest, LS_REFS_HEADERS, parseLsRefsHead, type RepositoryHead } from "./git-ls-refs.js";

const ARCHIVE_TIMEOUT_MS = 120_000;

const TOKEN_REJECTED_MESSAGE = "GitHub rejected this node's GitHub token (expired or revoked). Reconnect GitHub on this node.";
const notVisibleMessage = (repositoryUrl: string): string =>
  `GitHub repository not found, or it is private: ${repositoryUrl}. To use a private repository, connect GitHub on this node.`;
const noAccessMessage = (repositoryUrl: string): string =>
  `GitHub repository not found, or this node's GitHub token can't read it: ${repositoryUrl}. Give the token access to this repository with Contents: read.`;
const vaultUnavailableMessage = (repositoryUrl: string): string =>
  `GitHub repository not found, or it is private: ${repositoryUrl}. This node's secret vault is unavailable, so its GitHub token can't be used.`;

const repositoryUrlOf = (owner: string, repo: string): string => `https://github.com/${owner}/${repo}`;

const assertIdentity = (owner: string, repo: string): void => {
  if (!isGitHubIdentitySegment(owner) || !isGitHubIdentitySegment(repo)) {
    throw new Error("Invalid GitHub repository owner or name.");
  }
};

/**
 * Repository reads and archive downloads on GitHub; no package or skill installation policy. Owns the access rule:
 * every request goes out without a token first; only when GitHub answers "not visible" (401 or 404) is this node's
 * GitHub token read and the request sent again with it. Public repositories therefore never use the token, and a
 * rejected token cannot break them.
 */
export class GitHubRepositoryClient {
  private readonly readToken: GitHubTokenReader;
  /** Left to `gitHubRequest` when absent, which then uses the global `fetch` at the time of each request. */
  private readonly fetchImpl: typeof fetch | undefined;

  constructor(deps: Readonly<{ readToken: GitHubTokenReader; fetchImpl?: typeof fetch }>) {
    this.readToken = deps.readToken;
    this.fetchImpl = deps.fetchImpl;
  }

  /**
   * The default branch and its head commit, read through git (protocol v2 `ls-refs`): one
   * github.com request that costs no REST quota. Used by update checks and updates; imports keep
   * the REST metadata for the repository's identity.
   */
  async fetchDefaultBranchHead(owner: string, repo: string): Promise<RepositoryHead> {
    assertIdentity(owner, repo);
    const response = await this.request(
      `https://github.com/${owner}/${repo}.git/git-upload-pack`,
      repositoryUrlOf(owner, repo),
      { method: "POST", body: buildLsRefsHeadRequest(), headers: LS_REFS_HEADERS },
    );
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
    assertIdentity(owner, repo);
    const base = `https://github.com/${owner}/${repo}/releases/latest`;
    const response = await this.request(base, repositoryUrlOf(owner, repo), { followRedirects: false });
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
    const response = await this.request(
      buildGitHubRepositoryBranchApiUrl(metadata.owner, metadata.repo, metadata.defaultBranch),
      metadata.canonicalUrl,
    );

    if (!response.ok) {
      await response.body?.cancel();
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

  /**
   * The repository at `revision` (a commit) as a `.tar.gz` written to `destinationFile`, which must not exist yet
   * (it is created with mode 0600). From codeload, outside the REST quota; the URL never carries a credential.
   */
  async downloadArchive(owner: string, repo: string, revision: string, destinationFile: string): Promise<void> {
    assertIdentity(owner, repo);
    const signal = AbortSignal.timeout(ARCHIVE_TIMEOUT_MS);
    const response = await this.request(
      buildGitHubRepositoryArchiveUrlForRef(owner, repo, revision),
      repositoryUrlOf(owner, repo),
      { signal },
    );
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error(`GitHub archive download failed (HTTP ${response.status}).`);
    }
    await pipeline(
      Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
      fs.createWriteStream(destinationFile, { flags: "wx", mode: 0o600 }),
      { signal },
    );
  }

  private async fetchRepositoryMetadata(
    source: GitHubRepositorySource,
  ): Promise<GitHubRepositoryMetadata> {
    const response = await this.request(buildGitHubRepositoryApiUrl(source), source.canonicalUrl);

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(
        `GitHub repository metadata request failed with HTTP ${response.status} ${response.statusText}.`,
      );
    }

    const payload = (await response.json()) as Partial<{
      default_branch: string;
      html_url: string;
      name: string;
      owner: { login?: string };
    }>;

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

  /**
   * The access rule. Without a token first; on 401 or 404, with this node's token. With the token, 401 means GitHub
   * rejected it, and 403 or 404 means it can't read the repository. `repositoryUrl` names the repository in the
   * messages; no message ever holds the token.
   */
  private async request(url: string, repositoryUrl: string, options: GitHubRequestOptions = {}): Promise<Response> {
    const anonymous = await gitHubRequest(url, { ...options, fetchImpl: this.fetchImpl });
    if (anonymous.status !== 401 && anonymous.status !== 404) return anonymous;
    await anonymous.body?.cancel();
    const token = await this.tokenFor(repositoryUrl);
    const response = await gitHubRequest(url, { ...options, fetchImpl: this.fetchImpl, token });
    if (response.status === 401) {
      await response.body?.cancel();
      throw new Error(TOKEN_REJECTED_MESSAGE);
    }
    if (response.status === 403 || response.status === 404) {
      await response.body?.cancel();
      throw new Error(noAccessMessage(repositoryUrl));
    }
    return response;
  }

  /** This node's token; without one, the "connect GitHub" text; when the vault fails, the vault text. */
  private async tokenFor(repositoryUrl: string): Promise<SecretValue> {
    let token: SecretValue | null;
    try {
      token = await this.readToken();
    } catch (error) {
      if (error instanceof SecretVaultError) throw new Error(vaultUnavailableMessage(repositoryUrl));
      throw error;
    }
    if (!token) throw new Error(notVisibleMessage(repositoryUrl));
    return token;
  }
}
