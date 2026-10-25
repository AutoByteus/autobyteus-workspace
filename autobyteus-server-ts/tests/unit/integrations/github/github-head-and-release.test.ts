import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildLsRefsHeadRequest, LS_REFS_HEADERS, parseLsRefsHead } from "../../../../src/integrations/github/git-ls-refs.js";
import { GitHubRepositoryClient } from "../../../../src/integrations/github/github-repository-client.js";
import { GitHubRateLimitGate, setGitHubRateLimitGateForTests } from "../../../../src/integrations/github/github-rate-limit-gate.js";

/** The request bytes and answers recorded against github.com in evidence/IMP-00-ls-refs-probe.txt. */
const RECORDED_REQUEST = "0014command=ls-refs\n0015agent=autobyteus\n0017object-format=sha1\n0001000csymrefs\n0014ref-prefix HEAD\n0000";
const RECORDED_MAIN = "0050d705e9a367ff6b43f00c47335890b2866dd5f4c3 HEAD symref-target:refs/heads/main\n0000";
const RECORDED_CANARY = "00528b583887cee277dd7036bcfdfeafbd1d6e37fc59 HEAD symref-target:refs/heads/canary\n0000";

describe("git protocol v2 ls-refs (REQ-002)", () => {
  it("builds exactly the request GitHub accepted", () => {
    expect(buildLsRefsHeadRequest()).toBe(RECORDED_REQUEST);
    expect(LS_REFS_HEADERS).toEqual({
      Accept: "application/x-git-upload-pack-result",
      "Content-Type": "application/x-git-upload-pack-request",
      "Git-Protocol": "version=2",
    });
  });

  it("reads the default branch and its head from GitHub's recorded answers", () => {
    expect(parseLsRefsHead(RECORDED_MAIN)).toEqual({ defaultBranch: "main", latestRevision: "d705e9a367ff6b43f00c47335890b2866dd5f4c3" });
    expect(parseLsRefsHead(RECORDED_CANARY)).toEqual({ defaultBranch: "canary", latestRevision: "8b583887cee277dd7036bcfdfeafbd1d6e37fc59" });
  });

  it("refuses an answer without a HEAD line (empty repository, garbage, truncated)", () => {
    for (const answer of ["0000", "", "not a pkt line", RECORDED_MAIN.slice(0, 30), "0047d705e9a367ff6b43f00c47335890b2866dd5f4c3 HEAD\n0000"]) {
      expect(() => parseLsRefsHead(answer)).toThrow("GitHub repository head is unavailable.");
    }
  });
});

describe("GitHubRepositoryClient quota-free reads", () => {
  let gateDir: string;
  beforeEach(() => {
    gateDir = fs.mkdtempSync(path.join(os.tmpdir(), "github-head-gate-"));
    setGitHubRateLimitGateForTests(new GitHubRateLimitGate(() => path.join(gateDir, "rate-limit.json")));
  });
  afterEach(() => {
    setGitHubRateLimitGateForTests(null);
    fs.rmSync(gateDir, { recursive: true, force: true });
  });

  it("fetchDefaultBranchHead posts ls-refs to the repository's git service, never api.github.com", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(RECORDED_MAIN, { status: 200 }));
    expect(await new GitHubRepositoryClient(fetchImpl).fetchDefaultBranchHead("AutoByteus", "autobyteus-agents"))
      .toEqual({ defaultBranch: "main", latestRevision: "d705e9a367ff6b43f00c47335890b2866dd5f4c3" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://github.com/AutoByteus/autobyteus-agents.git/git-upload-pack");
    expect(init).toMatchObject({ method: "POST", body: RECORDED_REQUEST, headers: expect.objectContaining(LS_REFS_HEADERS) });
  });

  it.each([401, 404])("fetchDefaultBranchHead names a missing or private repository for HTTP %s", async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status }));
    await expect(new GitHubRepositoryClient(fetchImpl).fetchDefaultBranchHead("acme", "skills")).rejects.toThrow(
      "GitHub repository not found or not public: https://github.com/acme/skills. For private repositories, clone locally and import the local path.",
    );
  });

  it("fetchDefaultBranchHead reports other failures and refuses unsafe names without a request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 500, statusText: "Server Error" }));
    await expect(new GitHubRepositoryClient(fetchImpl).fetchDefaultBranchHead("acme", "skills")).rejects.toThrow("HTTP 500");
    await expect(new GitHubRepositoryClient(fetchImpl).fetchDefaultBranchHead("..", "skills")).rejects.toThrow("Invalid");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("fetchLatestReleaseTag reads the tag from the releases/latest redirect without following it", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: {
      location: "https://github.com/openai/codex/releases/tag/rust-v0.50.0" } }));
    expect(await new GitHubRepositoryClient(fetchImpl).fetchLatestReleaseTag("openai", "codex")).toBe("rust-v0.50.0");
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0]![0]).toBe("https://github.com/openai/codex/releases/latest");
  });

  it("fetchLatestReleaseTag refuses a non-redirect or a redirect elsewhere", async () => {
    for (const response of [
      new Response("page", { status: 200 }),
      new Response(null, { status: 302, headers: { location: "https://github.com/openai/codex/releases" } }),
      new Response(null, { status: 302, headers: { location: "https://github.com/other/codex/releases/tag/v1" } }),
      new Response(null, { status: 302, headers: { location: "https://evil.example/openai/codex/releases/tag/v1" } }),
    ]) {
      await expect(new GitHubRepositoryClient(vi.fn().mockResolvedValue(response)).fetchLatestReleaseTag("openai", "codex")).rejects.toThrow();
    }
  });
});
