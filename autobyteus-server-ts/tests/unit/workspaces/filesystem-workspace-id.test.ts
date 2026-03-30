import { describe, expect, it } from "vitest";
import { FileSystemWorkspace } from "../../../src/workspaces/filesystem-workspace.js";
import { buildFilesystemWorkspaceId } from "../../../src/workspaces/workspace-id-mapping-store.js";

describe("FileSystemWorkspace ID", () => {
  it("derives a deterministic workspaceId from the normalized root path", () => {
    const config = { rootPath: "/tmp/autobyteus-workspace" };

    const first = new FileSystemWorkspace(config);
    const second = new FileSystemWorkspace(config);

    expect(first.workspaceId).toBe(second.workspaceId);
    expect(first.workspaceId).toBe(buildFilesystemWorkspaceId("/tmp/autobyteus-workspace"));
    expect(first.workspaceId).toMatch(/^agent_ws_[0-9a-f]{64}$/);
  });

  it("canonicalizes the root path before deriving the workspaceId", () => {
    const workspace = new FileSystemWorkspace(
      { rootPath: "/tmp/autobyteus-workspace/../autobyteus-workspace/" },
    );

    expect(workspace.rootPath).toBe("/tmp/autobyteus-workspace");
    expect(workspace.workspaceId).toBe(buildFilesystemWorkspaceId("/tmp/autobyteus-workspace"));
  });

  it("accepts an explicit workspaceId when provided", () => {
    const config = {
      rootPath: "/tmp/autobyteus-workspace",
      workspaceId: "fixed_ws_id",
    };

    const workspace = new FileSystemWorkspace(config);

    expect(workspace.workspaceId).toBe("fixed_ws_id");
  });
});
