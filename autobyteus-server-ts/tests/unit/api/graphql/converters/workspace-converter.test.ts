import { describe, expect, it } from "vitest";
import { WorkspaceConverter } from "../../../../../src/api/graphql/converters/workspace-converter.js";
import { FileSystemWorkspace } from "../../../../../src/workspaces/filesystem-workspace.js";
import { TempWorkspace } from "../../../../../src/workspaces/temp-workspace.js";

describe("WorkspaceConverter", () => {
  it("maps a regular workspace's metadata with isTemp false", () => {
    const workspace = new FileSystemWorkspace({ rootPath: "/path/to/ws", workspaceId: "regular_id" });

    const info = WorkspaceConverter.toGraphql(workspace);

    expect(info).toEqual({
      workspaceId: "regular_id",
      name: "ws",
      displayName: "ws",
      config: { rootPath: "/path/to/ws", workspaceId: "regular_id" },
      workspaceRootPath: "/path/to/ws",
      absolutePath: "/path/to/ws",
      kind: "filesystem",
      isTemp: false,
    });
  });

  it("maps the temp workspace with its fixed id and isTemp true", () => {
    const workspace = new TempWorkspace("/path/to/temp");

    const info = WorkspaceConverter.toGraphql(workspace);

    expect(info.workspaceId).toBe(TempWorkspace.TEMP_WORKSPACE_ID);
    expect(info.name).toBe("Temp Workspace");
    expect(info.kind).toBe("temp");
    expect(info.isTemp).toBe(true);
  });
});
