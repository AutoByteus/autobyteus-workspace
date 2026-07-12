import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalizeWorkspaceRootPath,
  resolveWorkspaceRelativePath,
} from "../../../src/workspaces/workspace-path-utils.js";

describe("resolveWorkspaceRelativePath", () => {
  const root = canonicalizeWorkspaceRootPath(path.join(path.sep, "tmp", "workspace"));

  it("resolves contained relative paths", () => {
    expect(resolveWorkspaceRelativePath(root, "docs/readme.md")).toBe(
      path.join(root, "docs", "readme.md"),
    );
    expect(resolveWorkspaceRelativePath(root, "")).toBe(root);
  });

  it("rejects traversal into a sibling sharing the workspace prefix", () => {
    expect(() => resolveWorkspaceRelativePath(root, "../workspace-other/secret.png")).toThrow(
      "Access denied: Path resolves outside the workspace boundary.",
    );
  });

  it("rejects absolute candidates", () => {
    expect(() => resolveWorkspaceRelativePath(root, path.join(path.sep, "tmp", "secret.png"))).toThrow(
      "Access denied: Path resolves outside the workspace boundary.",
    );
  });
});
