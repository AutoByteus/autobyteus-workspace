import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveAgentRunAbsoluteSourcePath } from "../../../../src/agent-execution/domain/agent-run-file-path-identity.js";

describe("agent-run file path identity", () => {
  it("resolves in-workspace and outside absolute source paths without display canonicalization", () => {
    const workspaceRoot = path.join(path.sep, "tmp", "workspace-root");
    const inWorkspacePath = path.join(workspaceRoot, "src", "demo.txt");
    const externalPath = path.join(path.sep, "tmp", "downloads", "demo.txt");

    expect(resolveAgentRunAbsoluteSourcePath(inWorkspacePath, workspaceRoot)).toEqual({
      ok: true,
      sourceAbsolutePath: inWorkspacePath,
    });
    expect(resolveAgentRunAbsoluteSourcePath(externalPath, workspaceRoot)).toEqual({
      ok: true,
      sourceAbsolutePath: externalPath,
    });
  });

  it("allows absolute paths without a workspace root", () => {
    const externalPath = path.join(path.sep, "tmp", "downloads", "demo.txt");

    expect(resolveAgentRunAbsoluteSourcePath(externalPath, null)).toEqual({
      ok: true,
      sourceAbsolutePath: externalPath,
    });
  });

  it("fails relative source paths without a workspace root", () => {
    expect(resolveAgentRunAbsoluteSourcePath("docs/demo.txt", null)).toEqual({
      ok: false,
      code: "RELATIVE_PATH_REQUIRES_WORKSPACE_ROOT",
    });
  });

  it("resolves relative source paths against the workspace root", () => {
    const workspaceRoot = path.join(path.sep, "tmp", "workspace-root");

    expect(resolveAgentRunAbsoluteSourcePath("src/demo.txt", workspaceRoot)).toEqual({
      ok: true,
      sourceAbsolutePath: path.join(workspaceRoot, "src", "demo.txt"),
    });
  });
});
