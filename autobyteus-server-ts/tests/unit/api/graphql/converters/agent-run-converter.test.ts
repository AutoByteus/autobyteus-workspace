import { describe, expect, it } from "vitest";
import { AgentRunConverter } from "../../../../../src/api/graphql/converters/agent-run-converter.js";
import { TempWorkspace } from "../../../../../src/workspaces/temp-workspace.js";

describe("AgentRunConverter", () => {
  it("projects workspace info from context workspaceRootPath and snapshot metadata", async () => {
    const run = await AgentRunConverter.toGraphql({
      agentId: "run-1",
      currentStatus: "idle",
      context: {
        config: { name: "A", role: "R" },
        workspaceRootPath: "/tmp/project/../project",
        customData: {
          workspace_id: "ws-1",
          workspace_name: "Project",
          workspace_is_temp: false,
          agent_definition_id: "def-1",
        },
      },
    } as any);

    expect(run.workspace).not.toBeNull();
    expect(run.workspace?.workspaceId).toBe("ws-1");
    expect(run.workspace?.name).toBe("Project");
    expect(run.workspace?.isTemp).toBe(false);
    expect(run.workspace?.absolutePath).toBe("/tmp/project");
    expect(run.agentDefinitionId).toBe("def-1");
  });

  it("falls back to customData workspace_root_path when runtime path is absent", async () => {
    const run = await AgentRunConverter.toGraphql({
      agentId: "run-2",
      context: {
        config: { name: "B", role: "R2" },
        customData: {
          workspace_root_path: "/tmp/fallback",
          workspace_id: TempWorkspace.TEMP_WORKSPACE_ID,
        },
      },
    } as any);

    expect(run.workspace).not.toBeNull();
    expect(run.workspace?.absolutePath).toBe("/tmp/fallback");
    expect(run.workspace?.workspaceId).toBe(TempWorkspace.TEMP_WORKSPACE_ID);
    expect(run.workspace?.isTemp).toBe(true);
  });

  it("returns null workspace when no path is available", async () => {
    const run = await AgentRunConverter.toGraphql({
      agentId: "run-3",
      context: {
        config: { name: "C", role: "R3" },
        customData: {},
      },
    } as any);

    expect(run.workspace).toBeNull();
  });
});
