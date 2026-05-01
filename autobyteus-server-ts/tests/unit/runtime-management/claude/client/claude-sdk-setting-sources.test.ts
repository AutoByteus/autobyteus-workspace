import { describe, expect, it } from "vitest";
import {
  getClaudeCatalogSettingSources,
  getClaudeRuntimeSettingSources,
} from "../../../../../src/runtime-management/claude/client/claude-sdk-setting-sources.js";

describe("claude-sdk-setting-sources", () => {
  it("uses user, project, and local settings for runtime turns", () => {
    expect(getClaudeRuntimeSettingSources()).toEqual(["user", "project", "local"]);
  });

  it("uses user settings only for global model catalog discovery", () => {
    expect(getClaudeCatalogSettingSources()).toEqual(["user"]);
  });

  it("returns defensive copies so callers cannot mutate shared source policy", () => {
    const runtimeSources = getClaudeRuntimeSettingSources();
    runtimeSources.pop();

    const catalogSources = getClaudeCatalogSettingSources();
    catalogSources.push("project");

    expect(getClaudeRuntimeSettingSources()).toEqual(["user", "project", "local"]);
    expect(getClaudeCatalogSettingSources()).toEqual(["user"]);
  });
});
