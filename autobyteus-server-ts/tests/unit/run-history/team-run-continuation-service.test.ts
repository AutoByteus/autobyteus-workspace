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
            teamRunId: "team-1",
            teamDefinitionId: "team-def-1",
            teamDefinitionName: "Team 1",
            workspaceRootPath: null,
            coordinatorMemberRouteKey: "professor",
            runVersion: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            memberBindings: [
              {
                memberName: "Professor",
                memberRouteKey: "professor",
                memberRunId: "member-1",
                runtimeKind: "autobyteus",
                runtimeReference: null,
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
});
