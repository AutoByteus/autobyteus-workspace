import { describe, expect, it, vi } from "vitest";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { TeamMemberMemoryLayoutStore } from "../../../src/run-history/store/team-member-memory-layout-store.js";
import { buildTeamMemberAgentId } from "../../../src/run-history/utils/team-member-agent-id.js";
import { TeamRuntimeBootstrapApplicationService } from "../../../src/agent-team-execution/services/team-runtime-bootstrap-application-service.js";

describe("TeamRuntimeBootstrapApplicationService", () => {
  it("uses provided teamId and builds canonical member runtime config + manifest", async () => {
    const teamDefinitionService = {
      getDefinitionById: vi.fn().mockResolvedValue({
        id: "def-1",
        name: "Class Room Simulation",
        coordinatorMemberName: "leader",
        nodes: [
          {
            memberName: "leader",
            referenceType: NodeType.AGENT,
            referenceId: "agent-1",
            homeNodeId: "node-local",
          },
        ],
      }),
    } as any;
    const workspaceManager = {
      getWorkspaceById: vi.fn().mockReturnValue(null),
    } as any;
    const placementResolver = {
      resolvePlacement: vi.fn().mockReturnValue({
        leader: { nodeId: "node-local" },
      }),
    } as any;

    const service = new TeamRuntimeBootstrapApplicationService({
      teamDefinitionService,
      workspaceManager,
      placementResolver,
      nodeSnapshotProvider: {
        listPlacementCandidateNodes: () => [
          {
            nodeId: "node-local",
            isHealthy: true,
            supportsAgentExecution: true,
          },
        ],
      },
      memberLayoutStore: new TeamMemberMemoryLayoutStore("/tmp/autobyteus-ws11-test"),
    });

    const prepared = await service.prepareTeamRuntimeBootstrap({
      teamId: "class_room_simulation_abcd1234",
      teamDefinitionId: "def-1",
      memberConfigs: [
        {
          memberName: "leader",
          agentDefinitionId: "agent-1",
          llmModelIdentifier: "model-x",
          autoExecuteTools: true,
          workspaceRootPath: "/tmp/workspace",
        },
      ],
    });

    expect(prepared.teamId).toBe("class_room_simulation_abcd1234");
    expect(prepared.resolvedMemberConfigs).toHaveLength(1);
    expect(prepared.resolvedMemberConfigs[0]).toEqual(
      expect.objectContaining({
        memberRouteKey: "leader",
        memberAgentId: buildTeamMemberAgentId("class_room_simulation_abcd1234", "leader"),
        hostNodeId: "node-local",
        memoryDir: expect.stringContaining(
          "/agent_teams/class_room_simulation_abcd1234/",
        ),
      }),
    );
    expect(prepared.manifest.memberBindings[0]).toEqual(
      expect.objectContaining({
        memberRouteKey: "leader",
        memberName: "leader",
        workspaceRootPath: "/tmp/workspace",
      }),
    );
  });

  it("generates readable teamId when no preferred teamId is supplied", async () => {
    const teamDefinitionService = {
      getDefinitionById: vi.fn().mockResolvedValue({
        id: "def-2",
        name: "Case Study Team",
        coordinatorMemberName: "professor",
        nodes: [
          {
            memberName: "professor",
            referenceType: NodeType.AGENT,
            referenceId: "agent-1",
            homeNodeId: "node-local",
          },
        ],
      }),
    } as any;
    const workspaceManager = {
      getWorkspaceById: vi.fn().mockReturnValue(null),
    } as any;
    const placementResolver = {
      resolvePlacement: vi.fn().mockReturnValue({
        professor: { nodeId: "node-local" },
      }),
    } as any;

    const service = new TeamRuntimeBootstrapApplicationService({
      teamDefinitionService,
      workspaceManager,
      placementResolver,
      nodeSnapshotProvider: {
        listPlacementCandidateNodes: () => [
          {
            nodeId: "node-local",
            isHealthy: true,
            supportsAgentExecution: true,
          },
        ],
      },
      memberLayoutStore: new TeamMemberMemoryLayoutStore("/tmp/autobyteus-ws11-test"),
    });

    const prepared = await service.prepareTeamRuntimeBootstrap({
      teamDefinitionId: "def-2",
      memberConfigs: [
        {
          memberName: "professor",
          agentDefinitionId: "agent-1",
          llmModelIdentifier: "model-x",
          autoExecuteTools: true,
        },
      ],
    });

    expect(prepared.teamId).toMatch(/^case_study_team_[a-f0-9]{8}$/);
    expect(prepared.manifest.teamRunId).toBe(prepared.teamId);
    expect(prepared.manifest.teamDefinitionName).toBe("Case Study Team");
  });
});
