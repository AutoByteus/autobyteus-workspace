import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamRunContinuationService } from "../../../src/run-history/services/team-run-continuation-service.js";

describe("TeamRunContinuationService", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-run-continuation-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("restores with canonical member memoryDir and posts message", async () => {
    let active = false;
    const postMessage = vi.fn().mockResolvedValue(undefined);
    const createTeamRunWithId = vi.fn().mockImplementation(async () => {
      active = true;
      return "team-1";
    });
    const onTeamEvent = vi.fn().mockResolvedValue(undefined);

    const service = new TeamRunContinuationService({
      memoryDir,
      teamRunManager: {
        getTeamRun: (teamRunId: string) =>
          active && teamRunId === "team-1"
            ? ({ teamRunId: "team-1", postMessage } as any)
            : null,
        createTeamRunWithId,
        terminateTeamRun: vi.fn(),
      },
      teamRunHistoryService: {
        getTeamRunResumeConfig: vi.fn().mockResolvedValue({
          teamRunId: "team-1",
          manifest: {
            teamDefinitionId: "team-def-1",
            memberBindings: [
              {
                memberName: "Professor",
                memberRouteKey: "professor",
                memberRunId: "member-1",
                agentDefinitionId: "agent-1",
                llmModelIdentifier: "model-1",
                autoExecuteTools: false,
                llmConfig: null,
                workspaceRootPath: null,
              },
            ],
          },
        }),
        onTeamEvent,
      } as any,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
      } as any,
    });

    await service.continueTeamRun({
      teamRunId: "team-1",
      userInput: { content: "hello", contextFiles: [] } as any,
      targetMemberRouteKey: "professor",
    });

    expect(createTeamRunWithId).toHaveBeenCalledTimes(1);
    const callArgs = createTeamRunWithId.mock.calls[0] ?? [];
    expect(callArgs[0]).toBe("team-1");
    expect(callArgs[1]).toBe("team-def-1");
    expect(callArgs[2][0].memoryDir).toBe(
      path.join(memoryDir, "agent_teams", "team-1", "member-1"),
    );
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(onTeamEvent).toHaveBeenCalledWith("team-1", {
      status: "ACTIVE",
      summary: "hello",
    });
  });

  it("persists refreshed member-runtime references after restore", async () => {
    const persistTeamRunManifest = vi.fn().mockResolvedValue(undefined);
    const onTeamEvent = vi.fn().mockResolvedValue(undefined);
    const sendToMember = vi.fn().mockResolvedValue(undefined);
    const restoreMemberRuntimeSessions = vi.fn().mockResolvedValue([
      {
        memberName: "professor",
        memberRouteKey: "professor",
        memberRunId: "member-professor",
        runtimeKind: "codex_app_server",
        runtimeReference: {
          runtimeKind: "codex_app_server",
          sessionId: "member-professor",
          threadId: "thread-professor",
          metadata: null,
        },
        agentDefinitionId: "agent-prof",
        llmModelIdentifier: "model-prof",
        autoExecuteTools: false,
        llmConfig: null,
        workspaceRootPath: null,
      },
      {
        memberName: "student",
        memberRouteKey: "student",
        memberRunId: "member-student",
        runtimeKind: "codex_app_server",
        runtimeReference: {
          runtimeKind: "codex_app_server",
          sessionId: "member-student",
          threadId: "thread-student-new",
          metadata: null,
        },
        agentDefinitionId: "agent-student",
        llmModelIdentifier: "model-student",
        autoExecuteTools: false,
        llmConfig: null,
        workspaceRootPath: null,
      },
    ]);

    const service = new TeamRunContinuationService({
      memoryDir,
      teamRunManager: {
        getTeamRun: vi.fn().mockReturnValue(null),
        createTeamRunWithId: vi.fn(),
        terminateTeamRun: vi.fn(),
      } as any,
      teamRunHistoryService: {
        getTeamRunResumeConfig: vi.fn().mockResolvedValue({
          teamRunId: "team-codex-1",
          manifest: {
            teamRunId: "team-codex-1",
            teamDefinitionId: "team-def-1",
            teamDefinitionName: "Team Def",
            workspaceRootPath: null,
            coordinatorMemberRouteKey: "professor",
            runVersion: 1,
            createdAt: "2026-03-04T00:00:00.000Z",
            updatedAt: "2026-03-04T00:00:00.000Z",
            memberBindings: [
              {
                memberName: "professor",
                memberRouteKey: "professor",
                memberRunId: "member-professor",
                runtimeKind: "codex_app_server",
                runtimeReference: {
                  runtimeKind: "codex_app_server",
                  sessionId: "member-professor",
                  threadId: "thread-professor",
                  metadata: null,
                },
                agentDefinitionId: "agent-prof",
                llmModelIdentifier: "model-prof",
                autoExecuteTools: false,
                llmConfig: null,
                workspaceRootPath: null,
              },
              {
                memberName: "student",
                memberRouteKey: "student",
                memberRunId: "member-student",
                runtimeKind: "codex_app_server",
                runtimeReference: {
                  runtimeKind: "codex_app_server",
                  sessionId: "member-student",
                  threadId: "thread-student-old",
                  metadata: null,
                },
                agentDefinitionId: "agent-student",
                llmModelIdentifier: "model-student",
                autoExecuteTools: false,
                llmConfig: null,
                workspaceRootPath: null,
              },
            ],
          },
        }),
        persistTeamRunManifest,
        onTeamEvent,
      } as any,
      teamMemberRuntimeOrchestrator: {
        hasActiveMemberBinding: vi.fn().mockReturnValue(false),
        restoreMemberRuntimeSessions,
        sendToMember,
        removeTeam: vi.fn(),
      } as any,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
      } as any,
    });

    await service.continueTeamRun({
      teamRunId: "team-codex-1",
      userInput: { content: "hello codex team", contextFiles: [] } as any,
      targetMemberRouteKey: "student",
    });

    expect(restoreMemberRuntimeSessions).toHaveBeenCalledTimes(1);
    expect(persistTeamRunManifest).toHaveBeenCalledTimes(1);
    const persistedManifest = persistTeamRunManifest.mock.calls[0]?.[1];
    const persistedStudentBinding = persistedManifest?.memberBindings?.find(
      (binding: any) => binding.memberRouteKey === "student",
    );
    expect(persistedStudentBinding?.runtimeReference?.threadId).toBe("thread-student-new");

    expect(sendToMember).toHaveBeenCalledWith(
      "team-codex-1",
      "student",
      expect.any(Object),
      { fallbackTargetMemberName: "professor" },
    );
    expect(onTeamEvent).toHaveBeenCalledWith("team-codex-1", {
      status: "ACTIVE",
      summary: "hello codex team",
    });
  });
});
