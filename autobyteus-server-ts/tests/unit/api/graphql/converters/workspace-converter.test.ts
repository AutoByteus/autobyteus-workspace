import { describe, expect, it, vi } from "vitest";
import { WorkspaceConverter } from "../../../../../src/api/graphql/converters/workspace-converter.js";
import { TempWorkspace } from "../../../../../src/workspaces/temp-workspace.js";

describe("WorkspaceConverter", () => {
  it("sets isTemp false for regular workspace IDs", async () => {
    const workspace = {
      workspaceId: "regular_id",
      getName: () => "Regular Workspace",
      config: { toDict: () => ({}) },
      getBasePath: () => "/path/to/ws",
      getFileExplorer: vi.fn().mockResolvedValue({
        toShallowJson: vi.fn().mockResolvedValue({}),
      }),
    };

    const info = await WorkspaceConverter.toGraphql(workspace);

    expect(info.isTemp).toBe(false);
    expect(info.workspaceId).toBe("regular_id");
  });

  it("sets isTemp true for temp workspace ID", async () => {
    const workspace = {
      workspaceId: TempWorkspace.TEMP_WORKSPACE_ID,
      getName: () => "Temp Workspace",
      config: { toDict: () => ({}) },
      getBasePath: () => "/path/to/temp",
      getFileExplorer: vi.fn().mockResolvedValue({
        toShallowJson: vi.fn().mockResolvedValue({}),
      }),
    };

    const info = await WorkspaceConverter.toGraphql(workspace);

    expect(info.isTemp).toBe(true);
    expect(info.workspaceId).toBe(TempWorkspace.TEMP_WORKSPACE_ID);
  });
});
