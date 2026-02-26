import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalizeWorkspaceRootPath,
  workspaceDisplayNameFromRootPath,
} from "../../../src/run-history/utils/workspace-path-normalizer.js";

describe("workspace-path-normalizer", () => {
  it("canonicalizes workspace root paths", () => {
    const normalized = canonicalizeWorkspaceRootPath("  /tmp/autobyteus_org//// ");
    expect(normalized).toBe(path.resolve("/tmp/autobyteus_org"));
  });

  it("throws for empty workspace path", () => {
    expect(() => canonicalizeWorkspaceRootPath("   ")).toThrow("workspaceRootPath cannot be empty");
  });

  it("returns folder name as workspace display name", () => {
    const name = workspaceDisplayNameFromRootPath("/tmp/autobyteus_org");
    expect(name).toBe("autobyteus_org");
  });
});
