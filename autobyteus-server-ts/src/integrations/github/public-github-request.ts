import { getGitHubRateLimitGate, GitHubRateLimitError } from "./github-rate-limit-gate.js";

const GITHUB_API_HOST = "api.github.com";

/**
 * Follow GitHub's legitimate public redirects, never arbitrary download hosts. Requests to
 * `api.github.com` obey GitHub's rate limits: none is made before a learned reset time, and a
 * rate-limited answer throws `GitHubRateLimitError`.
 */
export async function publicGitHubRequest(
  input: string,
  fetchImpl: typeof fetch = fetch,
  signal: AbortSignal = AbortSignal.timeout(30_000),
): Promise<Response> {
  let url = new URL(input);
  for (let redirects = 0; redirects <= 5; redirects++) {
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
        !["api.github.com", "codeload.github.com"].includes(url.hostname)) {
      throw new Error("Unsupported GitHub download or metadata redirect.");
    }
    const gate = url.hostname === GITHUB_API_HOST ? getGitHubRateLimitGate() : null;
    gate?.assertOpen();
    const response = await fetchImpl(url.toString(), {
      redirect: "manual", signal,
      headers: { Accept: "application/vnd.github+json", "User-Agent": "AutoByteus" },
    });
    const resetAt = gate?.learnFrom(response) ?? null;
    if (resetAt) {
      await response.body?.cancel();
      throw new GitHubRateLimitError(resetAt);
    }
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new Error("GitHub redirect has no destination.");
    url = new URL(location, url);
  }
  throw new Error("Too many GitHub redirects.");
}
