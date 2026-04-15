import type { GitHubRepositorySource } from "../types.js";

const SUPPORTED_HOSTS = new Set(["github.com", "www.github.com"]);

const slugGitHubSegment = (value: string, label: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new Error(`GitHub ${label} segment is invalid.`);
  }
  return normalized;
};

const decodeUrlSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const normalizeGitHubRepositorySource = (
  rawSource: string,
): GitHubRepositorySource => {
  const trimmed = rawSource.trim();
  if (!trimmed) {
    throw new Error("GitHub repository URL cannot be empty.");
  }

  const normalizedInput = /^github\.com\//i.test(trimmed)
    ? `https://${trimmed}`
    : trimmed;

  let url: URL;
  try {
    url = new URL(normalizedInput);
  } catch {
    throw new Error("GitHub repository URL is invalid.");
  }

  if (!SUPPORTED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Only public github.com repository URLs are supported.");
  }

  const pathSegments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeUrlSegment(segment));

  if (pathSegments.length < 2) {
    throw new Error("GitHub repository URL must identify a repository.");
  }

  const owner = pathSegments[0]?.trim();
  const repoSegment = pathSegments[1]?.trim();
  if (!owner || !repoSegment) {
    throw new Error("GitHub repository URL must identify a repository.");
  }

  const repo = repoSegment.replace(/\.git$/i, "").trim();
  if (!repo) {
    throw new Error("GitHub repository URL must identify a repository.");
  }

  const normalizedOwner = owner.toLowerCase();
  const normalizedRepo = repo.toLowerCase();

  return {
    owner,
    repo,
    normalizedRepository: `${normalizedOwner}/${normalizedRepo}`,
    canonicalUrl: `https://github.com/${owner}/${repo}`,
    installKey: `${slugGitHubSegment(owner, "owner")}__${slugGitHubSegment(repo, "repo")}`,
  };
};

export const buildGitHubRepositoryApiUrl = (
  source: GitHubRepositorySource,
): string =>
  `https://api.github.com/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}`;

export const buildGitHubRepositoryArchiveUrl = (
  owner: string,
  repo: string,
  defaultBranch: string,
): string =>
  `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tar.gz/refs/heads/${encodeURIComponent(defaultBranch)}`;
