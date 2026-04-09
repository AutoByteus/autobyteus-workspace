import { describe, expect, it } from "vitest";
import {
  normalizeGitHubRepositorySource,
} from "../../../src/agent-packages/utils/github-repository-source.js";

describe("normalizeGitHubRepositorySource", () => {
  it("normalizes a repository homepage URL", () => {
    expect(
      normalizeGitHubRepositorySource(
        "https://github.com/AutoByteus/autobyteus-agents",
      ),
    ).toEqual({
      owner: "AutoByteus",
      repo: "autobyteus-agents",
      normalizedRepository: "autobyteus/autobyteus-agents",
      canonicalUrl: "https://github.com/AutoByteus/autobyteus-agents",
      installKey: "autobyteus__autobyteus-agents",
    });
  });

  it("accepts github.com input without a scheme and strips .git plus extra path segments", () => {
    expect(
      normalizeGitHubRepositorySource(
        "github.com/AutoByteus/autobyteus-agents.git/tree/main/agents",
      ),
    ).toMatchObject({
      owner: "AutoByteus",
      repo: "autobyteus-agents",
      normalizedRepository: "autobyteus/autobyteus-agents",
      installKey: "autobyteus__autobyteus-agents",
    });
  });

  it("rejects unsupported hosts", () => {
    expect(() =>
      normalizeGitHubRepositorySource("https://gitlab.com/AutoByteus/autobyteus-agents"),
    ).toThrow(/github\.com/i);
  });
});
