import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { gitHubRequest } from "../../../../src/integrations/github/github-request.js";
import { GitHubRateLimitGate, setGitHubRateLimitGateForTests } from "../../../../src/integrations/github/github-rate-limit-gate.js";

const TOKEN_TEXT = "github_pat_UNIT_REQUEST_627";
const token = SecretValue.fromString(TOKEN_TEXT);
const BEARER = `Bearer ${TOKEN_TEXT}`;
const BASIC = `Basic ${Buffer.from(`x-access-token:${TOKEN_TEXT}`).toString("base64")}`;

const authorizationOf = (init: RequestInit | undefined): string | null =>
  (init?.headers as Record<string, string> | undefined)?.["Authorization"] ?? null;

describe("gitHubRequest credential header per host (C-3)", () => {
  let gateDir: string;
  beforeEach(() => {
    gateDir = fs.mkdtempSync(path.join(os.tmpdir(), "github-request-credentials-"));
    setGitHubRateLimitGateForTests(new GitHubRateLimitGate(() => path.join(gateDir, "rate-limit.json")));
  });
  afterEach(() => {
    setGitHubRateLimitGateForTests(null);
    fs.rmSync(gateDir, { recursive: true, force: true });
  });

  it("sends Bearer to api.github.com and codeload.github.com, Basic x-access-token to github.com, and nothing without a token", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => new Response("ok"));
    await gitHubRequest("https://api.github.com/repos/acme/pack", { fetchImpl, token });
    await gitHubRequest("https://codeload.github.com/acme/pack/tar.gz/abc", { fetchImpl, token });
    await gitHubRequest("https://github.com/acme/pack.git/git-upload-pack", { method: "POST", fetchImpl, token });
    await gitHubRequest("https://api.github.com/repos/acme/pack", { fetchImpl });
    expect(fetchImpl.mock.calls.map(([, init]) => authorizationOf(init))).toEqual([BEARER, BEARER, BASIC, null]);
    expect(fetchImpl.mock.calls.every(([url]) => !String(url).includes(TOKEN_TEXT))).toBe(true);
  });

  it("computes the header again for each redirect hop's own host, after the hop passed the host check", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://codeload.github.com/acme/pack/tar.gz/abc" } }))
      .mockResolvedValueOnce(new Response(null, { status: 307, headers: { location: "https://github.com/acme/pack.git/git-upload-pack" } }))
      .mockResolvedValueOnce(new Response("ok"));
    const response = await gitHubRequest("https://api.github.com/repos/acme/pack/tarball/abc", { fetchImpl, token });
    expect(response.status).toBe(200);
    expect(fetchImpl.mock.calls.map(([url, init]) => [url, authorizationOf(init)])).toEqual([
      ["https://api.github.com/repos/acme/pack/tarball/abc", BEARER],
      ["https://codeload.github.com/acme/pack/tar.gz/abc", BEARER],
      ["https://github.com/acme/pack.git/git-upload-pack", BASIC],
    ]);
  });

  it("never sends the token to a redirect outside GitHub's allowed hosts: the hop is refused before any request", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: "https://evil.example/collect" } }));
    await expect(gitHubRequest("https://api.github.com/repos/acme/pack", { fetchImpl, token })).rejects.toThrow("Unsupported");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
