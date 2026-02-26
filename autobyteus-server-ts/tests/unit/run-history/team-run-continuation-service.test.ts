import { describe, expect, it, vi } from "vitest";
import { TeamRunContinuationService } from "../../../src/run-history/services/team-run-continuation-service.js";

describe("TeamRunContinuationService", () => {
  it("dispatches message to active team without restore", async () => {
    const teamRunManager = {
      getTeamRun: vi.fn(() => ({ teamRunId: "team-1" })),
      createTeamRunWithId: vi.fn(),
      terminateTeamRun: vi.fn(),
    };
    const teamCommandIngressService = {
      dispatchUserMessage: vi.fn().mockResolvedValue({
        teamRunId: "run-1",
        runVersion: 1,
      }),
    };
    const teamRunHistoryService = {
      getTeamRunResumeConfig: vi.fn(),
      onTeamEvent: vi.fn().mockResolvedValue(undefined),
    };
    const workspaceManager = {
      ensureWorkspaceByRootPath: vi.fn(),
    };

    const service = new TeamRunContinuationService({
      teamRunManager: teamRunManager as any,
      teamCommandIngressService: teamCommandIngressService as any,
      teamRunHistoryService: teamRunHistoryService as any,
      workspaceManager: workspaceManager as any,
      memoryDir: "/tmp/memory",
    });

    const result = await service.continueTeamRun({
      teamRunId: "team-1",
      targetMemberRouteKey: "coordinator",
      userInput: { content: "hello team", contextFiles: null } as any,
    });

    expect(result).toEqual({
      teamRunId: "team-1",
      restored: false,
    });
    expect(teamRunManager.createTeamRunWithId).not.toHaveBeenCalled();
    expect(teamCommandIngressService.dispatchUserMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team-1",
        targetMemberName: "coordinator",
      }),
    );
  });

  it("restores inactive team from manifest before dispatching", async () => {
    const teamRunManager = {
      getTeamRun: vi.fn(() => null),
      createTeamRunWithId: vi.fn().mockResolvedValue("team-1"),
      terminateTeamRun: vi.fn(),
    };
    const teamCommandIngressService = {
      dispatchUserMessage: vi.fn().mockResolvedValue({
        teamRunId: "run-1",
        runVersion: 1,
      }),
    };
    const teamRunHistoryService = {
      getTeamRunResumeConfig: vi.fn().mockResolvedValue({
        teamRunId: "team-1",
        isActive: false,
        manifest: {
          teamRunId: "team-1",
          teamDefinitionId: "def-1",
          teamDefinitionName: "Classroom Team",
          coordinatorMemberRouteKey: "coordinator",
          runVersion: 1,
          createdAt: "2026-02-15T00:00:00.000Z",
          updatedAt: "2026-02-15T00:00:00.000Z",
          memberBindings: [
            {
              memberRouteKey: "coordinator",
              memberName: "Coordinator",
              memberAgentId: "member-1",
              agentDefinitionId: "agent-def-1",
              llmModelIdentifier: "model-a",
              autoExecuteTools: true,
              llmConfig: { temperature: 0.2 },
              workspaceRootPath: "/tmp/workspace-a",
              hostNodeId: "local",
            },
          ],
        },
      }),
      onTeamEvent: vi.fn().mockResolvedValue(undefined),
    };
    const workspaceManager = {
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({ workspaceId: "ws-1" }),
    };

    const service = new TeamRunContinuationService({
      teamRunManager: teamRunManager as any,
      teamCommandIngressService: teamCommandIngressService as any,
      teamRunHistoryService: teamRunHistoryService as any,
      workspaceManager: workspaceManager as any,
      memoryDir: "/tmp/memory",
    });

    const result = await service.continueTeamRun({
      teamRunId: "team-1",
      targetMemberRouteKey: "coordinator",
      userInput: { content: "restore and continue", contextFiles: null } as any,
    });

    expect(result).toEqual({
      teamRunId: "team-1",
      restored: true,
    });
    expect(teamRunHistoryService.getTeamRunResumeConfig).toHaveBeenCalledWith("team-1");
    expect(workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/workspace-a");
    expect(teamRunManager.createTeamRunWithId).toHaveBeenCalledWith(
      "team-1",
      "def-1",
      [
        {
          memberName: "Coordinator",
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "model-a",
          autoExecuteTools: true,
          workspaceId: "ws-1",
          workspaceRootPath: "/tmp/workspace-a",
          llmConfig: { temperature: 0.2 },
          memberRouteKey: "coordinator",
          memberAgentId: "member-1",
          memoryDir: "/tmp/memory/agent_teams/team-1/member-1",
          hostNodeId: "local",
        },
      ],
    );
  });

  it("validates required input content", async () => {
    const service = new TeamRunContinuationService({
      teamRunManager: {
        getTeamRun: vi.fn(() => null),
        createTeamRunWithId: vi.fn(),
        terminateTeamRun: vi.fn(),
      } as any,
      teamCommandIngressService: {
        dispatchUserMessage: vi.fn(),
      } as any,
      teamRunHistoryService: {
        getTeamRunResumeConfig: vi.fn(),
        onTeamEvent: vi.fn(),
      } as any,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
      } as any,
      memoryDir: "/tmp/memory",
    });

    await expect(
      service.continueTeamRun({
        teamRunId: "team-1",
        userInput: { content: "   ", contextFiles: null } as any,
      }),
    ).rejects.toThrow("userInput.content is required");
  });

  it("rolls back restored runtime when dispatch fails", async () => {
    const teamRunManager = {
      getTeamRun: vi.fn(() => null),
      createTeamRunWithId: vi.fn().mockResolvedValue("team-rollback"),
      terminateTeamRun: vi.fn().mockResolvedValue(true),
    };
    const teamCommandIngressService = {
      dispatchUserMessage: vi.fn().mockRejectedValue(new Error("dispatch failed")),
    };
    const teamRunHistoryService = {
      getTeamRunResumeConfig: vi.fn().mockResolvedValue({
        teamRunId: "team-rollback",
        isActive: false,
        manifest: {
          teamRunId: "team-rollback",
          teamDefinitionId: "def-rollback",
          teamDefinitionName: "Rollback Team",
          coordinatorMemberRouteKey: "coordinator",
          runVersion: 1,
          createdAt: "2026-02-15T00:00:00.000Z",
          updatedAt: "2026-02-15T00:00:00.000Z",
          memberBindings: [],
        },
      }),
      onTeamEvent: vi.fn(),
    };
    const workspaceManager = {
      ensureWorkspaceByRootPath: vi.fn(),
    };

    const service = new TeamRunContinuationService({
      teamRunManager: teamRunManager as any,
      teamCommandIngressService: teamCommandIngressService as any,
      teamRunHistoryService: teamRunHistoryService as any,
      workspaceManager: workspaceManager as any,
      memoryDir: "/tmp/memory",
    });

    await expect(
      service.continueTeamRun({
        teamRunId: "team-rollback",
        userInput: { content: "hello", contextFiles: null } as any,
      }),
    ).rejects.toThrow("dispatch failed");

    expect(teamRunManager.terminateTeamRun).toHaveBeenCalledWith("team-rollback");
  });
});
