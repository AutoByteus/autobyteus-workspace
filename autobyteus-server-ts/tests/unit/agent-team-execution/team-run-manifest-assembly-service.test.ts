import { describe, expect, it } from "vitest";
import { TeamRunManifestAssemblyService } from "../../../src/agent-team-execution/services/team-run-manifest-assembly-service.js";
import type { TeamMemberConfigInput } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";

describe("TeamRunManifestAssemblyService", () => {
  it("builds manifest bindings with workspace root fallback from workspaceId", () => {
    const workspaceManager = {
      getWorkspaceById: (workspaceId: string) =>
        workspaceId === "ws-1"
          ? ({
              rootPath: "/tmp/workspace-1",
            } as any)
          : null,
    } as any;

    const service = new TeamRunManifestAssemblyService({ workspaceManager });

    const memberConfigs: TeamMemberConfigInput[] = [
      {
        memberName: "professor",
        memberRouteKey: "professor",
        memberAgentId: "professor_a1",
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "model-a",
        autoExecuteTools: true,
        workspaceRootPath: "/explicit/path",
        hostNodeId: "node-a",
      },
      {
        memberName: "student",
        memberRouteKey: "student",
        memberAgentId: "student_b2",
        agentDefinitionId: "agent-2",
        llmModelIdentifier: "model-b",
        autoExecuteTools: false,
        workspaceId: "ws-1",
        hostNodeId: "node-b",
      },
    ];

    const manifest = service.buildTeamRunManifest({
      teamId: "class_room_simulation_a1b2c3d4",
      teamDefinitionId: "team-def-1",
      teamDefinitionName: "Class Room Simulation",
      coordinatorMemberName: "professor",
      memberConfigs,
      localNodeId: "node-local",
    });

    expect(manifest.teamRunId).toBe("class_room_simulation_a1b2c3d4");
    expect(manifest.coordinatorMemberRouteKey).toBe("professor");
    expect(manifest.memberBindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberRouteKey: "professor",
          workspaceRootPath: "/explicit/path",
          hostNodeId: "node-a",
        }),
        expect.objectContaining({
          memberRouteKey: "student",
          workspaceRootPath: "/tmp/workspace-1",
          hostNodeId: "node-b",
        }),
      ]),
    );
  });
});
