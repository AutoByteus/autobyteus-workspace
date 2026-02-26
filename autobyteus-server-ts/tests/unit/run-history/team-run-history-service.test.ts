import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";
import { TeamRunManifestStore } from "../../../src/run-history/store/team-run-manifest-store.js";

const createTempMemoryDir = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-run-history-service-"));

const dirExists = async (dirPath: string): Promise<boolean> => {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
};

describe("TeamRunHistoryService", () => {
  let memoryDir: string;
  let service: TeamRunHistoryService;
  let manifestStore: TeamRunManifestStore;
  let fakeTeamManager: { getTeamRun: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    memoryDir = await createTempMemoryDir();
    fakeTeamManager = {
      getTeamRun: vi.fn(() => null),
    };
    service = new TeamRunHistoryService(memoryDir, {
      teamRunManager: fakeTeamManager as any,
    });
    manifestStore = new TeamRunManifestStore(memoryDir);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("rebuilds history index from team manifests on disk", async () => {
    await manifestStore.writeManifest("team-1", {
      teamRunId: "team-1",
      teamDefinitionId: "def-1",
      teamDefinitionName: "Classroom Team",
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 1,
      createdAt: "2026-02-15T00:00:00.000Z",
      updatedAt: "2026-02-15T00:05:00.000Z",
      memberBindings: [
        {
          memberRouteKey: "coordinator",
          memberName: "Coordinator",
          memberAgentId: "member-1",
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "model-a",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: "/tmp/workspace",
          hostNodeId: "node-a",
        },
      ],
    });

    const list = await service.listTeamRunHistory();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      teamRunId: "team-1",
      teamDefinitionId: "def-1",
      teamDefinitionName: "Classroom Team",
      lastKnownStatus: "IDLE",
      isActive: false,
    });
    expect(list[0]?.members).toEqual([
      {
        memberRouteKey: "coordinator",
        memberName: "Coordinator",
        memberAgentId: "member-1",
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "model-a",
        autoExecuteTools: false,
        llmConfig: null,
        workspaceRootPath: path.resolve("/tmp/workspace"),
        hostNodeId: "node-a",
      },
    ]);
  });

  it("upserts row and reports active status from runtime manager", async () => {
    fakeTeamManager.getTeamRun.mockImplementation((teamRunId: string) =>
      teamRunId === "team-1" ? ({ teamRunId } as any) : null,
    );

    await service.upsertTeamRunHistoryRow({
      teamRunId: "team-1",
      summary: " Team run summary ",
      manifest: {
        teamRunId: "team-1",
        teamDefinitionId: "def-1",
        teamDefinitionName: "Classroom Team",
        coordinatorMemberRouteKey: "coordinator",
        runVersion: 1,
        createdAt: "2026-02-15T00:00:00.000Z",
        updatedAt: "2026-02-15T00:05:00.000Z",
        memberBindings: [],
      },
    });

    const list = await service.listTeamRunHistory();
    expect(list[0]).toMatchObject({
      teamRunId: "team-1",
      summary: "Team run summary",
      isActive: true,
      lastKnownStatus: "ACTIVE",
    });
  });

  it("creates missing row from manifest when onTeamEvent is received", async () => {
    await manifestStore.writeManifest("team-2", {
      teamRunId: "team-2",
      teamDefinitionId: "def-2",
      teamDefinitionName: "Ops Team",
      coordinatorMemberRouteKey: "lead",
      runVersion: 1,
      createdAt: "2026-02-15T00:00:00.000Z",
      updatedAt: "2026-02-15T00:00:00.000Z",
      memberBindings: [],
    });

    await service.onTeamEvent("team-2", {
      summary: "First user message",
      status: "ACTIVE",
    });

    const list = await service.listTeamRunHistory();
    expect(list[0]).toMatchObject({
      teamRunId: "team-2",
      summary: "First user message",
      lastKnownStatus: "ACTIVE",
    });
  });

  it("returns resume config and delete safety checks", async () => {
    await manifestStore.writeManifest("team-3", {
      teamRunId: "team-3",
      teamDefinitionId: "def-3",
      teamDefinitionName: "Data Team",
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 1,
      createdAt: "2026-02-15T00:00:00.000Z",
      updatedAt: "2026-02-15T00:00:00.000Z",
      memberBindings: [],
    });
    await service.upsertTeamRunHistoryRow({
      teamRunId: "team-3",
      summary: "summ",
      manifest: {
        teamRunId: "team-3",
        teamDefinitionId: "def-3",
        teamDefinitionName: "Data Team",
        coordinatorMemberRouteKey: "coordinator",
        runVersion: 1,
        createdAt: "2026-02-15T00:00:00.000Z",
        updatedAt: "2026-02-15T00:00:00.000Z",
        memberBindings: [],
      },
      lastKnownStatus: "IDLE",
    });

    let resume = await service.getTeamRunResumeConfig("team-3");
    expect(resume.teamRunId).toBe("team-3");
    expect(resume.isActive).toBe(false);

    fakeTeamManager.getTeamRun.mockReturnValue({ teamRunId: "team-3" } as any);
    resume = await service.getTeamRunResumeConfig("team-3");
    expect(resume.isActive).toBe(true);

    const blockedDelete = await service.deleteTeamRunHistory("team-3");
    expect(blockedDelete.success).toBe(false);
    expect(blockedDelete.message).toContain("active");

    fakeTeamManager.getTeamRun.mockReturnValue(null);
    const deleted = await service.deleteTeamRunHistory("team-3");
    expect(deleted.success).toBe(true);

    const teamDir = path.join(memoryDir, "agent_teams", "team-3");
    expect(await dirExists(teamDir)).toBe(false);
  });
});
