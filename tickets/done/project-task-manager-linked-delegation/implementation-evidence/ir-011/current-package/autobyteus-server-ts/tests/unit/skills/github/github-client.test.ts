import { describe, expect, it, vi } from "vitest";
import { GitHubRepositoryClient } from "../../../../src/integrations/github/github-repository-client.js";
import { parseGitHubSkillRepository } from "../../../../src/integrations/github/github-repository-source.js";

describe("shared GitHub metadata transport", () => {
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
