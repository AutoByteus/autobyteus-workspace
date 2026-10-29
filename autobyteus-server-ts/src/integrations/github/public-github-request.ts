import { getGitHubRateLimitGate, GitHubRateLimitError, type GitHubGateFamily } from "./github-rate-limit-gate.js";
import { isGitHubIdentitySegment } from "./github-repository-source.js";

export type PublicGitHubRequestOptions = Readonly<{
  method?: "GET" | "POST";
  body?: string;
  /** Merged over the defaults (`Accept: application/vnd.github+json`, `User-Agent: AutoByteus`). */
  headers?: Readonly<Record<string, string>>;
  /** `false` returns a redirect answer to the caller instead of following it. */
  followRedirects?: boolean;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}>;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** github.com serves only a repository's git service and its latest-release redirect to this node. */
const isAllowedGitHubWebPath = (pathname: string): boolean => {
  const segments = pathname.split("/").filter(Boolean);
  const [owner, repo, ...rest] = segments;
  if (!isGitHubIdentitySegment(owner) || !repo) return false;
  if (rest.length === 1 && rest[0] === "git-upload-pack") return repo.endsWith(".git") && isGitHubIdentitySegment(repo.slice(0, -4));
  return isGitHubIdentitySegment(repo) && rest.length === 2 && rest[0] === "releases" && rest[1] === "latest";
};

/** The gate family of an allowed GitHub URL; throws for any other host or path. */
const familyOf = (url: URL): GitHubGateFamily => {
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("Unsupported GitHub download or metadata redirect.");
  }
  if (url.hostname === "api.github.com") return "api";
  if (url.hostname === "codeload.github.com") return "web";
  if (url.hostname === "github.com" && isAllowedGitHubWebPath(url.pathname)) return "web";
  throw new Error("Unsupported GitHub download or metadata redirect.");
};

/**
 * Follow GitHub's legitimate public redirects, never arbitrary hosts or paths. Every request obeys
 * GitHub's limits for its host family: none is made before a learned reset time, and a limiting
 * answer throws `GitHubRateLimitError`.
 */
export async function publicGitHubRequest(input: string, options: PublicGitHubRequestOptions = {}): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const signal = options.signal ?? AbortSignal.timeout(30_000);
  const gate = getGitHubRateLimitGate();
  let url = new URL(input);
  for (let redirects = 0; redirects <= 5; redirects++) {
    const family = familyOf(url);
    gate.assertOpen(family);
    const response = await fetchImpl(url.toString(), {
      method: options.method ?? "GET",
      body: options.body,
      redirect: "manual",
      signal,
      headers: { Accept: "application/vnd.github+json", "User-Agent": "AutoByteus", ...options.headers },
    });
    const resetAt = gate.learnFrom(family, response);
    if (resetAt) {
      await response.body?.cancel();
      throw new GitHubRateLimitError(resetAt);
    }
    if (!REDIRECT_STATUSES.has(response.status) || options.followRedirects === false) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new Error("GitHub redirect has no destination.");
    url = new URL(location, url);
  }
  throw new Error("Too many GitHub redirects.");
}
