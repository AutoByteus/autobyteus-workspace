import { describe, expect, it } from "vitest";
import { WorkspaceConfig } from "autobyteus-ts";
import { FileSystemWorkspace } from "../../../src/workspaces/filesystem-workspace.js";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("FileSystemWorkspace ID", () => {
  it("creates a unique workspaceId per instance", () => {
    const config = new WorkspaceConfig({ rootPath: "/tmp/autobyteus-workspace" });

    const first = new FileSystemWorkspace(config);
    const second = new FileSystemWorkspace(config);

    expect(first.workspaceId).not.toBe(second.workspaceId);
    expect(first.workspaceId).toMatch(uuidRegex);
    expect(second.workspaceId).toMatch(uuidRegex);
  });

  it("accepts an explicit workspaceId when provided", () => {
    const config = new WorkspaceConfig({
      rootPath: "/tmp/autobyteus-workspace",
      workspaceId: "fixed_ws_id",
    });

    const workspace = new FileSystemWorkspace(config);

    expect(workspace.workspaceId).toBe("fixed_ws_id");
  });
});
