import { describe, expect, it, vi } from "vitest";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { TeamMemberPlacementPlanningService } from "../../../src/agent-team-execution/services/team-member-placement-planning-service.js";

describe("TeamMemberPlacementPlanningService", () => {
  it("resolves host ownership by flattened nested memberRouteKey", async () => {
    const teamDefinitionService = {
      getDefinitionById: vi.fn(async (id: string) => {
        if (id === "team-root") {
          return {
            id: "team-root",
            coordinatorMemberName: "professor",
            nodes: [
              {
                memberName: "professor",
                referenceType: NodeType.AGENT,
                referenceId: "agent-prof",
                homeNodeId: "node-local",
              },
              {
                memberName: "lab_subteam",
                referenceType: NodeType.AGENT_TEAM,
                referenceId: "team-lab",
              },
            ],
          };
        }
        if (id === "team-lab") {
          return {
            id: "team-lab",
            coordinatorMemberName: "analyst",
            nodes: [
              {
                memberName: "analyst",
                referenceType: NodeType.AGENT,
                referenceId: "agent-analyst",
                homeNodeId: "node-worker",
              },
            ],
          };
        }
        return null;
      }),
    } as any;

    const placementResolver = {
      resolvePlacement: vi.fn().mockReturnValue({
        professor: { nodeId: "node-local" },
        lab_subteam_analyst: { nodeId: "node-worker" },
      }),
    } as any;

    const service = new TeamMemberPlacementPlanningService({
      teamDefinitionService,
      placementResolver,
      nodeSnapshotProvider: {
        listPlacementCandidateNodes: () => [
          {
            nodeId: "node-local",
            isHealthy: true,
            supportsAgentExecution: true,
          },
          {
            nodeId: "node-worker",
            isHealthy: true,
            supportsAgentExecution: true,
          },
        ],
      },
    });

    const result = await service.resolveHostNodeIdByMemberRouteKey("team-root");
    expect(result).toEqual({
      professor: "node-local",
      lab_subteam_analyst: "node-worker",
    });
  });

  it("returns empty mapping when definition traversal fails", async () => {
    const service = new TeamMemberPlacementPlanningService({
      teamDefinitionService: {
        getDefinitionById: vi.fn().mockRejectedValue(new Error("boom")),
      } as any,
      placementResolver: {
        resolvePlacement: vi.fn(),
      } as any,
      nodeSnapshotProvider: {
        listPlacementCandidateNodes: vi.fn(() => []),
      },
    });

    const result = await service.resolveHostNodeIdByMemberRouteKey("team-root");
    expect(result).toEqual({});
  });
});
