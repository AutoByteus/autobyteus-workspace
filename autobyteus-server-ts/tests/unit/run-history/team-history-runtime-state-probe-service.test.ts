import { describe, expect, it, vi } from "vitest";
import { TeamHistoryRuntimeStateProbeService } from "../../../src/run-history/services/team-history-runtime-state-probe-service.js";

describe("TeamHistoryRuntimeStateProbeService", () => {
  it("blocks delete when local runtime is active", async () => {
    const service = new TeamHistoryRuntimeStateProbeService({
      teamRunManager: {
        getTeamRun: vi.fn(() => ({ teamId: "team-1" })),
      } as any,
      runBindingRegistry: {
        listBindingsByTeamId: vi.fn(() => []),
      } as any,
      localNodeId: "node-a",
    });

    const outcome = await service.probeDeletePrecondition("team-1", {
      teamId: "team-1",
      teamDefinitionId: "def-1",
      teamDefinitionName: "Team",
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 1,
      createdAt: "2026-02-20T00:00:00.000Z",
      updatedAt: "2026-02-20T00:00:00.000Z",
      memberBindings: [],
    });

    expect(outcome.canDelete).toBe(false);
    expect(outcome.code).toBe("TEAM_ACTIVE_LOCAL");
  });

  it("blocks delete when any remote node reports active runtime", async () => {
    const service = new TeamHistoryRuntimeStateProbeService({
      teamRunManager: {
        getTeamRun: vi.fn(() => null),
      } as any,
      runBindingRegistry: {
        listBindingsByTeamId: vi.fn(() => []),
      } as any,
      dispatcher: {
        probeRuntimeState: vi.fn(async () => ({
          success: true,
          active: true,
          code: "OK",
          detail: "active",
        })),
      } as any,
      localNodeId: "node-a",
    });

    const outcome = await service.probeDeletePrecondition("team-2", {
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

    expect(outcome.canDelete).toBe(false);
    expect(outcome.retryable).toBe(false);
    expect(outcome.code).toBe("TEAM_ACTIVE_REMOTE");
  });

  it("returns retryable when remote runtime probe transport fails", async () => {
    const service = new TeamHistoryRuntimeStateProbeService({
      teamRunManager: {
        getTeamRun: vi.fn(() => null),
      } as any,
      runBindingRegistry: {
        listBindingsByTeamId: vi.fn(() => []),
      } as any,
      dispatcher: {
        probeRuntimeState: vi.fn(async () => ({
          success: false,
          active: false,
          code: "REMOTE_RUNTIME_PROBE_HTTP_ERROR",
          detail: "timeout",
        })),
      } as any,
      localNodeId: "node-a",
    });

    const outcome = await service.probeDeletePrecondition("team-3", {
      teamId: "team-3",
      teamDefinitionId: "def-3",
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

    expect(outcome.canDelete).toBe(false);
    expect(outcome.retryable).toBe(true);
    expect(outcome.code).toBe("REMOTE_RUNTIME_PROBE_HTTP_ERROR");
  });
});
