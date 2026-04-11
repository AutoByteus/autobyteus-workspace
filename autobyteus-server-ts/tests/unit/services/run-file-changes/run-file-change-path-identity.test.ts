import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalizeRunFileChangePath,
  isCanonicalRunFileChangePathAbsolute,
  resolveRunFileChangeAbsolutePath,
} from "../../../../src/services/run-file-changes/run-file-change-path-identity.js";

describe("run-file-change path identity", () => {
  it("canonicalizes workspace-local absolute paths to relative posix paths", () => {
    const workspaceRoot = path.join(path.sep, "tmp", "workspace-root");
    const absolutePath = path.join(workspaceRoot, "src", "demo.txt");

    expect(canonicalizeRunFileChangePath(absolutePath, workspaceRoot)).toBe("src/demo.txt");
    expect(isCanonicalRunFileChangePathAbsolute("src/demo.txt")).toBe(false);
  });

  it("preserves absolute paths that live outside the workspace", () => {
    const workspaceRoot = path.join(path.sep, "tmp", "workspace-root");
    const externalPath = path.join(path.sep, "tmp", "downloads", "demo.txt");

    expect(canonicalizeRunFileChangePath(externalPath, workspaceRoot)).toBe(externalPath.replace(/\\/g, "/"));
    expect(isCanonicalRunFileChangePathAbsolute(externalPath)).toBe(true);
  });

  it("resolves relative canonical paths back against the workspace root", () => {
    const workspaceRoot = path.join(path.sep, "tmp", "workspace-root");

    expect(resolveRunFileChangeAbsolutePath("src/demo.txt", workspaceRoot)).toBe(
      path.join(workspaceRoot, "src", "demo.txt"),
    );
  });
});
