import { describe, expect, it, vi } from "vitest";
import { TeamRunHistoryDeleteCoordinatorService } from "../../../src/run-history/services/team-run-history-delete-coordinator-service.js";

describe("TeamRunHistoryDeleteCoordinatorService", () => {
  it("completes delete for local-only ownership", async () => {
    const removeLocalMemberSubtrees = vi.fn(async () => undefined);
    const removeTeamDirIfEmpty = vi.fn(async () => undefined);

    const coordinator = new TeamRunHistoryDeleteCoordinatorService({
      memberLayoutStore: {
        removeLocalMemberSubtrees,
        removeTeamDirIfEmpty,
      } as any,
      localNodeId: "node-a",
    });

    const result = await coordinator.executeDeletePlan("team-1", {
      teamId: "team-1",
      teamDefinitionId: "def-1",
      teamDefinitionName: "Team",
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 1,
      createdAt: "2026-02-20T00:00:00.000Z",
      updatedAt: "2026-02-20T00:00:00.000Z",
      memberBindings: [
        {
          memberRouteKey: "coordinator",
          memberName: "Coordinator",
          memberAgentId: "member-a",
          agentDefinitionId: "agent-1",
          llmModelIdentifier: "model-1",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: null,
          hostNodeId: "node-a",
        },
      ],
    });

    expect(result.status).toBe("COMPLETE");
    expect(removeLocalMemberSubtrees).toHaveBeenCalledWith("team-1", ["member-a"]);
    expect(removeTeamDirIfEmpty).toHaveBeenCalledWith("team-1");
  });

  it("returns pending when remote cleanup fails", async () => {
    const coordinator = new TeamRunHistoryDeleteCoordinatorService({
      memberLayoutStore: {
        removeLocalMemberSubtrees: vi.fn(async () => undefined),
        removeTeamDirIfEmpty: vi.fn(async () => undefined),
      } as any,
      localNodeId: "node-a",
      dispatcher: {
        dispatchCleanup: vi.fn(async () => ({
          success: false,
          code: "REMOTE_CLEANUP_HTTP_ERROR",
          detail: "timeout",
        })),
      } as any,
    });

    const result = await coordinator.executeDeletePlan("team-2", {
      teamId: "team-2",
      teamDefinitionId: "def-2",
      teamDefinitionName: "Team",
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 1,
      createdAt: "2026-02-20T00:00:00.000Z",
      updatedAt: "2026-02-20T00:00:00.000Z",
      memberBindings: [
        {
          memberRouteKey: "remote",
          memberName: "Remote",
          memberAgentId: "member-remote",
          agentDefinitionId: "agent-1",
          llmModelIdentifier: "model-1",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: null,
          hostNodeId: "node-b",
        },
      ],
    });

    expect(result.status).toBe("PENDING_RETRY");
    expect(result.pendingNodeIds).toEqual(["node-b"]);
  });
});
