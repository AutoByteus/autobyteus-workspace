import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockManager = vi.hoisted(() => ({
  getTeamRun: vi.fn(),
  listActiveRuns: vi.fn(),
  createTeamRun: vi.fn(),
  createTeamRunWithId: vi.fn(),
  terminateTeamRun: vi.fn(),
}));

const mockIngressService = vi.hoisted(() => ({
  dispatchUserMessage: vi.fn(),
  dispatchControlStop: vi.fn(),
  resolveActiveRun: vi.fn(),
}));

const mockTeamRunHistoryService = vi.hoisted(() => ({
  upsertTeamRunHistoryRow: vi.fn(),
  onTeamEvent: vi.fn(),
  onTeamTerminated: vi.fn(),
}));

const mockTeamRunContinuationService = vi.hoisted(() => ({
  continueTeamRun: vi.fn(),
}));

const mockTeamDefinitionService = vi.hoisted(() => ({
  getDefinitionById: vi.fn(),
}));

vi.mock("../../../../../src/agent-team-execution/services/agent-team-run-manager.js", () => ({
  AgentTeamRunManager: {
    getInstance: () => mockManager,
  },
}));

vi.mock("../../../../../src/distributed/bootstrap/default-distributed-runtime-composition.js", () => ({
  getDefaultTeamCommandIngressService: () => mockIngressService,
}));

vi.mock("../../../../../src/run-history/services/team-run-history-service.js", () => ({
  getTeamRunHistoryService: () => mockTeamRunHistoryService,
}));

vi.mock("../../../../../src/run-history/services/team-run-continuation-service.js", () => ({
  getTeamRunContinuationService: () => mockTeamRunContinuationService,
}));

vi.mock("../../../../../src/agent-team-definition/services/agent-team-definition-service.js", () => ({
  AgentTeamDefinitionService: {
    getInstance: () => mockTeamDefinitionService,
  },
}));

import { AgentTeamRunResolver } from "../../../../../src/api/graphql/types/agent-team-run.js";
import { buildTeamMemberAgentId } from "../../../../../src/run-history/utils/team-member-agent-id.js";

describe("AgentTeamRunResolver sendMessageToTeam", () => {
  beforeEach(() => {
    mockManager.getTeamRun.mockReset();
    mockManager.listActiveRuns.mockReset();
    mockManager.createTeamRun.mockReset();
    mockManager.createTeamRunWithId.mockReset();
    mockManager.terminateTeamRun.mockReset();
    mockIngressService.dispatchUserMessage.mockReset();
    mockIngressService.dispatchControlStop.mockReset();
    mockIngressService.dispatchControlStop.mockResolvedValue({
      accepted: true,
      teamId: "team-terminate",
      teamRunId: "run-1",
      runVersion: 1,
      errorCode: null,
      errorMessage: null,
    });
    mockIngressService.resolveActiveRun.mockReset();
    mockIngressService.resolveActiveRun.mockReturnValue(null);
    mockTeamRunHistoryService.upsertTeamRunHistoryRow.mockReset();
    mockTeamRunHistoryService.onTeamEvent.mockReset();
    mockTeamRunHistoryService.onTeamTerminated.mockReset();
    mockTeamRunContinuationService.continueTeamRun.mockReset();
    mockTeamDefinitionService.getDefinitionById.mockReset();
  });

  it("uses team-run continuation flow for existing team history send", async () => {
    mockTeamRunContinuationService.continueTeamRun.mockResolvedValue({
      teamRunId: "team-1",
      restored: true,
    });

    const resolver = new AgentTeamRunResolver();
    const result = await resolver.sendMessageToTeam({
      teamRunId: "team-1",
      targetMemberName: "helper",
      userInput: {
        content: "hello team",
        contextFiles: null,
      },
    } as any);

    expect(result).toMatchObject({
      success: true,
      teamRunId: "team-1",
    });
    expect(mockTeamRunContinuationService.continueTeamRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: "team-1",
        targetMemberRouteKey: "helper",
      }),
    );
    expect(mockIngressService.dispatchUserMessage).not.toHaveBeenCalled();
    expect(mockManager.createTeamRun).not.toHaveBeenCalled();
    expect(mockManager.createTeamRunWithId).not.toHaveBeenCalled();
    expect(mockTeamRunHistoryService.onTeamEvent).not.toHaveBeenCalled();
  });

  it("lazy-creates team then dispatches via ingress", async () => {
    mockManager.createTeamRunWithId.mockImplementation(async (teamId: string) => teamId);
    mockTeamDefinitionService.getDefinitionById.mockResolvedValue({
      name: "Class Room Simulation",
      coordinatorMemberName: "leader",
      nodes: [
        {
          memberName: "leader",
          referenceType: "AGENT",
          referenceId: "agent-1",
          homeNodeId: "node-local",
        },
      ],
    });
    mockIngressService.dispatchUserMessage.mockResolvedValue({
      teamId: "team-new",
      teamRunId: "run-9",
      runVersion: 1,
    });

    const resolver = new AgentTeamRunResolver();
    const result = await resolver.sendMessageToTeam({
      teamDefinitionId: "def-1",
      memberConfigs: [
        {
          memberName: "leader",
          agentDefinitionId: "agent-1",
          llmModelIdentifier: "model-a",
          autoExecuteTools: true,
          workspaceRootPath: "/tmp/remote-ws",
        },
      ],
      userInput: {
        content: "start",
        contextFiles: null,
      },
    } as any);

    expect(mockManager.createTeamRunWithId).toHaveBeenCalledTimes(1);
    const [createdTeamId, createdTeamDefinitionId, createdMemberConfigs] =
      mockManager.createTeamRunWithId.mock.calls[0] ?? [];
    expect(result).toMatchObject({
      success: true,
      teamRunId: createdTeamId,
    });
    expect(createdTeamId).toMatch(/^class_room_simulation_[a-f0-9]{8}$/);
    expect(createdTeamDefinitionId).toBe("def-1");
    expect(createdMemberConfigs).toEqual([
      expect.objectContaining({
        memberName: "leader",
        memberRouteKey: "leader",
        memberAgentId: buildTeamMemberAgentId(createdTeamId, "leader"),
        workspaceRootPath: "/tmp/remote-ws",
        hostNodeId: "node-local",
        memoryDir: expect.stringContaining(`/agent_teams/${createdTeamId}/`),
      }),
    ]);

    expect(mockIngressService.dispatchUserMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: createdTeamId,
      }),
    );
    expect(mockTeamRunHistoryService.upsertTeamRunHistoryRow).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: createdTeamId,
        manifest: expect.objectContaining({
          teamDefinitionId: "def-1",
          teamDefinitionName: "Class Room Simulation",
          coordinatorMemberRouteKey: "leader",
          memberBindings: [
            expect.objectContaining({
              memberRouteKey: "leader",
              memberAgentId: buildTeamMemberAgentId(createdTeamId, "leader"),
              workspaceRootPath: "/tmp/remote-ws",
              hostNodeId: "node-local",
            }),
          ],
        }),
      }),
    );
    expect(mockTeamRunHistoryService.onTeamEvent).toHaveBeenCalledWith(
      createdTeamId,
      expect.objectContaining({
        status: "ACTIVE",
      }),
    );
  });

  it("persists fallback manifest metadata when team definition lookup is unavailable", async () => {
    mockManager.createTeamRunWithId.mockImplementation(async (teamId: string) => teamId);
    mockTeamDefinitionService.getDefinitionById.mockResolvedValue(null);
    mockIngressService.dispatchUserMessage.mockResolvedValue({
      teamId: "team-any",
      teamRunId: "run-9",
      runVersion: 1,
    });

    const resolver = new AgentTeamRunResolver();
    await resolver.sendMessageToTeam({
      teamDefinitionId: "def-fallback",
      memberConfigs: [
        {
          memberName: "professor",
          agentDefinitionId: "agent-1",
          llmModelIdentifier: "model-a",
          autoExecuteTools: true,
        },
        {
          memberName: "student",
          agentDefinitionId: "agent-2",
          llmModelIdentifier: "model-a",
          autoExecuteTools: true,
        },
      ],
      userInput: {
        content: "start",
        contextFiles: null,
      },
    } as any);

    expect(mockTeamRunHistoryService.upsertTeamRunHistoryRow).toHaveBeenCalledWith(
      expect.objectContaining({
        manifest: expect.objectContaining({
          teamDefinitionName: "def-fallback",
          coordinatorMemberRouteKey: "professor",
        }),
      }),
    );
    expect(mockManager.createTeamRunWithId).toHaveBeenCalledTimes(1);
  });

  it("marks team run idle in history when terminate succeeds", async () => {
    mockManager.terminateTeamRun.mockResolvedValue(true);

    const resolver = new AgentTeamRunResolver();
    const result = await resolver.terminateAgentTeamRun("team-terminate");

    expect(result).toMatchObject({ success: true });
    expect(mockIngressService.dispatchControlStop).toHaveBeenCalledWith("team-terminate");
    expect(mockTeamRunHistoryService.onTeamTerminated).toHaveBeenCalledWith("team-terminate");
  });
});
