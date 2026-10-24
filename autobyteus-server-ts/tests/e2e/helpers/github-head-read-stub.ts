/**
 * GitHub answers for server E2E stubs of the quota-free requests (update-checks-and-auto-updates, SR-005):
 * - the head read: `POST https://github.com/<owner>/<repo>.git/git-upload-pack` (git protocol v2 `ls-refs`), which
 *   package and skill-source checks and updates use instead of the REST metadata;
 * - the Codex latest-release redirect: `GET https://github.com/openai/codex/releases/latest` → 302 to the tag.
 * The answer shape is what GitHub sends (investigation AF-08; `git-ls-refs.ts` parses it).
 */

const HEAD_READ = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\.git\/git-upload-pack$/;

/** `owner/repo` (lower case: GitHub names are case-insensitive, and the node sends its normalized identity) when the
 * request is a head read; null otherwise. */
export const headReadRepository = (url: string, init?: RequestInit): string | null => {
  const match = HEAD_READ.exec(url);
  return match && (init?.method ?? "GET").toUpperCase() === "POST" ? `${match[1]}/${match[2]}`.toLowerCase() : null;
};

const pktLine = (payload: string): string => `${(Buffer.byteLength(payload) + 4).toString(16).padStart(4, "0")}${payload}`;

/** GitHub's `ls-refs` answer for `HEAD`: one line with the head commit and its branch, then a flush packet. */
export const headReadResponse = (revision: string, branch = "main"): Response =>
  new Response(`${pktLine(`${revision} HEAD symref-target:refs/heads/${branch}\n`)}0000`, {
    status: 200, headers: { "content-type": "application/x-git-upload-pack-result" },
  });

export const CODEX_LATEST_RELEASE_URL = "https://github.com/openai/codex/releases/latest";

/** GitHub's answer to the latest-release page: a redirect to the release tag (never followed by the node). */
export const codexLatestReleaseResponse = (tag: string): Response =>
  new Response(null, { status: 302, headers: { location: `https://github.com/openai/codex/releases/tag/${tag}` } });
