/** Follow GitHub's legitimate public redirects, never arbitrary download hosts. */
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
    const response = await fetchImpl(url.toString(), {
      redirect: "manual", signal,
      headers: { Accept: "application/vnd.github+json", "User-Agent": "AutoByteus" },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new Error("GitHub redirect has no destination.");
    url = new URL(location, url);
  }
  throw new Error("Too many GitHub redirects.");
}
