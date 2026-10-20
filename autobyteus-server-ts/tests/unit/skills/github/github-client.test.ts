import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubRepositoryClient } from "../../../../src/integrations/github/github-repository-client.js";
import { parseGitHubSkillRepository } from "../../../../src/integrations/github/github-repository-source.js";
import { GitHubRateLimitGate, setGitHubRateLimitGateForTests } from "../../../../src/integrations/github/github-rate-limit-gate.js";

describe("shared GitHub metadata transport", () => {
  let gateDir: string;
  // Each case gets its own rate-limit gate, so a learned limit never leaks between cases.
  beforeEach(() => {
    gateDir = fs.mkdtempSync(path.join(os.tmpdir(), "github-client-gate-"));
    setGitHubRateLimitGateForTests(new GitHubRateLimitGate(() => path.join(gateDir, "rate-limit.json")));
  });
  afterEach(() => {
    setGitHubRateLimitGateForTests(null);
    fs.rmSync(gateDir, { recursive: true, force: true });
  });

  it("resolves canonical public identity then its default-branch revision without downloading an archive", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      owner: { login: "Acme" }, name: "Skills", default_branch: "next/version", html_url: "https://github.com/Acme/Skills", private: false,
    }))).mockResolvedValueOnce(new Response(JSON.stringify({ commit: { sha: "a".repeat(40) } })));
    const client = new GitHubRepositoryClient(fetch);
    expect(await client.fetchRepositoryRevisionMetadata(parseGitHubSkillRepository("https://github.com/acme/skills"))).toEqual({
      owner: "Acme", repo: "Skills", defaultBranch: "next/version", canonicalUrl: "https://github.com/Acme/Skills", latestRevision: "a".repeat(40),
    });
    expect(fetch.mock.calls.map(call => call[0])).toEqual([
      "https://api.github.com/repos/acme/skills", "https://api.github.com/repos/Acme/Skills/branches/next%2Fversion",
    ]);
    expect(fetch.mock.calls.every(call => call[1].redirect === "manual")).toBe(true);
  });

  it.each([404, 403, 429])("reports public-access/metadata HTTP %s without fetching content", async status => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status }));
    await expect(new GitHubRepositoryClient(fetch).fetchRepositoryRevisionMetadata(
      parseGitHubSkillRepository("https://github.com/acme/skills"))).rejects.toThrow(/GitHub/);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("rejects private metadata and unsafe canonical identity", async () => {
    for (const payload of [
      { private: true },
      { private: false, default_branch: "main", owner: { login: "../outside" }, name: "skills" },
    ]) {
      const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)));
      await expect(new GitHubRepositoryClient(fetch).fetchRepositoryRevisionMetadata(
        parseGitHubSkillRepository("https://github.com/acme/skills"))).rejects.toThrow();
      expect(fetch).toHaveBeenCalledOnce();
    }
  });
});
