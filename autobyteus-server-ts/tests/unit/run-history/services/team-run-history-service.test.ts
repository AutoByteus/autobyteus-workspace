import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { TeamRunMetadata } from "../../../../src/run-history/store/team-run-metadata-types.js";
import { TeamRunMetadataStore } from "../../../../src/run-history/store/team-run-metadata-store.js";

const teamRunManagerMock = {
  getActiveRun: vi.fn<(teamRunId: string) => unknown>(),
};

vi.mock("../../../../src/agent-team-execution/services/agent-team-run-manager.js", () => ({
  AgentTeamRunManager: {
    getInstance: () => teamRunManagerMock,
  },
}));

const buildTeamMetadata = (
  teamRunId: string,
  overrides: Partial<TeamRunMetadata> = {},
): TeamRunMetadata => ({
  teamRunId,
  teamDefinitionId: "team-def-1",
  teamDefinitionName: "Team Alpha",
  coordinatorMemberRouteKey: "coordinator",
  runVersion: 1,
  createdAt: "2026-04-11T20:00:00.000Z",
  updatedAt: "2026-04-11T20:05:00.000Z",
  archivedAt: null,
  memberMetadata: [
    {
      memberRouteKey: "coordinator",
      memberName: "Coordinator",
      memberRunId: "member-run-1",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: null,
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "model-1",
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.NONE,
      llmConfig: null,
      workspaceRootPath: "/ws/a",
      applicationExecutionContext: null,
    },
  ],
  ...overrides,
});

describe("TeamRunHistoryService", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-history-service-"));
    teamRunManagerMock.getActiveRun.mockReset();
    teamRunManagerMock.getActiveRun.mockReturnValue(null);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("backfills blank historical summaries from the coordinator trace before returning history", async () => {
    const metadata = buildTeamMetadata("team-1");

    const memberDir = path.join(memoryDir, "agent_teams", "team-1", "member-run-1");
    await fs.mkdir(memberDir, { recursive: true });
    await fs.writeFile(
      path.join(memberDir, "raw_traces.jsonl"),
      [
        JSON.stringify({ trace_type: "user", content: "Could you rebuild the electron app?", ts: 10 }),
        JSON.stringify({ trace_type: "assistant", content: "Sure.", ts: 11 }),
      ].join("\n"),
      "utf-8",
    );

    const indexService = {
      listRows: vi.fn().mockResolvedValue([
        {
          teamRunId: "team-1",
          teamDefinitionId: "team-def-1",
          teamDefinitionName: "Team Alpha",
          workspaceRootPath: "/ws/a",
          summary: "",
          lastActivityAt: "2026-04-11T20:05:00.000Z",
          lastKnownStatus: "IDLE",
          deleteLifecycle: "READY",
        },
      ]),
      rebuildIndexFromDisk: vi.fn().mockResolvedValue([]),
      removeRow: vi.fn().mockResolvedValue(undefined),
      recordRunActivity: vi.fn().mockResolvedValue(undefined),
    };

    const { TeamRunHistoryService } = await import(
      "../../../../src/run-history/services/team-run-history-service.js"
    );

    const service = new TeamRunHistoryService(memoryDir, {
      metadataStore: {
        readMetadata: vi.fn().mockResolvedValue(metadata),
      } as any,
      indexService: indexService as any,
      teamRunManager: teamRunManagerMock as any,
    });

    const result = await service.listTeamRunHistory();

    expect(result).toEqual([
      expect.objectContaining({
        teamRunId: "team-1",
        coordinatorMemberRouteKey: "coordinator",
        summary: "Could you rebuild the electron app?",
      }),
    ]);
    expect(indexService.recordRunActivity).toHaveBeenCalledWith({
      teamRunId: "team-1",
      metadata,
      summary: "Could you rebuild the electron app?",
      lastKnownStatus: "IDLE",
      lastActivityAt: "2026-04-11T20:05:00.000Z",
    });
  });

  it("archives a stored team run by writing metadata without deleting memory or index rows", async () => {
    const { TeamRunHistoryService } = await import(
      "../../../../src/run-history/services/team-run-history-service.js"
    );

    const metadataStore = new TeamRunMetadataStore(memoryDir);
    const teamDir = path.join(memoryDir, "agent_teams", "team-archive");
    await fs.mkdir(path.join(teamDir, "member-run-1"), { recursive: true });
    await fs.writeFile(path.join(teamDir, "member-run-1", "raw_traces.jsonl"), "{}", "utf-8");
    await metadataStore.writeMetadata(
      "team-archive",
      buildTeamMetadata("team-archive", {
        memberMetadata: [
          {
            ...buildTeamMetadata("team-archive").memberMetadata[0]!,
            applicationExecutionContext: {
              applicationId: "app-1",
              bindingId: "binding-1",
              producer: {
                runId: "team-archive",
                memberRouteKey: "coordinator",
                memberName: "Coordinator",
                displayName: "Coordinator",
                runtimeKind: "AGENT_TEAM_MEMBER",
                teamPath: ["Team Alpha"],
              },
            },
          },
        ],
      }),
    );

    const indexService = {
      listRows: vi.fn().mockResolvedValue([]),
      rebuildIndexFromDisk: vi.fn().mockResolvedValue([]),
      removeRow: vi.fn(),
      recordRunActivity: vi.fn(),
    };
    const service = new TeamRunHistoryService(memoryDir, {
      metadataStore,
      indexService: indexService as any,
      teamRunManager: teamRunManagerMock as any,
    });

    const result = await service.archiveStoredTeamRun("team-archive");
    const archivedMetadata = await metadataStore.readMetadata("team-archive");

    expect(result).toEqual({
      success: true,
      message: "Team run 'team-archive' archived.",
    });
    expect(archivedMetadata?.archivedAt).toEqual(expect.any(String));
    expect(archivedMetadata?.memberMetadata[0]?.applicationExecutionContext?.applicationId).toBe("app-1");
    await expect(fs.stat(teamDir)).resolves.toBeTruthy();
    await expect(fs.stat(path.join(teamDir, "member-run-1", "raw_traces.jsonl"))).resolves.toBeTruthy();
    expect(indexService.removeRow).not.toHaveBeenCalled();
  });

  it("refuses to archive a live active team run without writing metadata", async () => {
    const { TeamRunHistoryService } = await import(
      "../../../../src/run-history/services/team-run-history-service.js"
    );

    teamRunManagerMock.getActiveRun.mockReturnValue({ teamRunId: "team-active" });
    const metadataStore = {
      readMetadata: vi.fn().mockResolvedValue(buildTeamMetadata("team-active")),
      writeMetadata: vi.fn(),
      getTeamDirPath: vi.fn((teamRunId: string) =>
        path.join(memoryDir, "agent_teams", teamRunId),
      ),
    };
    const service = new TeamRunHistoryService(memoryDir, {
      metadataStore: metadataStore as any,
      indexService: {
        listRows: vi.fn().mockResolvedValue([]),
        rebuildIndexFromDisk: vi.fn().mockResolvedValue([]),
        removeRow: vi.fn(),
        recordRunActivity: vi.fn(),
      } as any,
      teamRunManager: teamRunManagerMock as any,
    });

    const result = await service.archiveStoredTeamRun("team-active");

    expect(result).toEqual({
      success: false,
      message: "Team run is active. Terminate it before archiving history.",
    });
    expect(metadataStore.readMetadata).not.toHaveBeenCalled();
    expect(metadataStore.writeMetadata).not.toHaveBeenCalled();
  });

  it("rejects unsafe archive team IDs before metadata access and creates no out-of-root file", async () => {
    const { TeamRunHistoryService } = await import(
      "../../../../src/run-history/services/team-run-history-service.js"
    );

    const metadataStore = {
      readMetadata: vi.fn(),
      writeMetadata: vi.fn(),
      getTeamDirPath: vi.fn((teamRunId: string) =>
        teamRunId ? path.join(memoryDir, "agent_teams", teamRunId) : path.join(memoryDir, "agent_teams"),
      ),
    };
    const service = new TeamRunHistoryService(memoryDir, {
      metadataStore: metadataStore as any,
      indexService: {
        listRows: vi.fn().mockResolvedValue([]),
        rebuildIndexFromDisk: vi.fn().mockResolvedValue([]),
        removeRow: vi.fn(),
        recordRunActivity: vi.fn(),
      } as any,
      teamRunManager: teamRunManagerMock as any,
    });

    for (const unsafeTeamRunId of ["", "   ", "temp-team-1", "../outside", "/tmp/outside", "foo/bar", "foo\\bar", ".", ".."]) {
      const result = await service.archiveStoredTeamRun(unsafeTeamRunId);
      expect(result.success).toBe(false);
    }

    expect(metadataStore.readMetadata).not.toHaveBeenCalled();
    expect(metadataStore.writeMetadata).not.toHaveBeenCalled();
    await expect(fs.stat(path.join(memoryDir, "outside", "team_run_metadata.json"))).rejects.toThrow();
  });

  it("filters archived inactive team runs while keeping archived active teams visible", async () => {
    const { TeamRunHistoryService } = await import(
      "../../../../src/run-history/services/team-run-history-service.js"
    );

    const indexService = {
      listRows: vi.fn().mockResolvedValue([
        {
          teamRunId: "team-archived-inactive",
          teamDefinitionId: "team-def-1",
          teamDefinitionName: "Team Alpha",
          workspaceRootPath: "/ws/a",
          summary: "hidden",
          lastActivityAt: "2026-04-13T20:05:00.000Z",
          lastKnownStatus: "IDLE",
          deleteLifecycle: "READY",
        },
        {
          teamRunId: "team-archived-active",
          teamDefinitionId: "team-def-1",
          teamDefinitionName: "Team Alpha",
          workspaceRootPath: "/ws/a",
          summary: "visible active",
          lastActivityAt: "2026-04-12T20:05:00.000Z",
          lastKnownStatus: "IDLE",
          deleteLifecycle: "READY",
        },
        {
          teamRunId: "team-visible",
          teamDefinitionId: "team-def-1",
          teamDefinitionName: "Team Alpha",
          workspaceRootPath: "/ws/a",
          summary: "visible",
          lastActivityAt: "2026-04-11T20:05:00.000Z",
          lastKnownStatus: "IDLE",
          deleteLifecycle: "READY",
        },
      ]),
      rebuildIndexFromDisk: vi.fn().mockResolvedValue([]),
      removeRow: vi.fn(),
      recordRunActivity: vi.fn(),
    };
    teamRunManagerMock.getActiveRun.mockImplementation((teamRunId: string) =>
      teamRunId === "team-archived-active" ? { teamRunId } : null,
    );

    const metadataStore = {
      readMetadata: vi.fn(async (teamRunId: string) =>
        buildTeamMetadata(teamRunId, {
          archivedAt: teamRunId.startsWith("team-archived")
            ? "2026-05-01T10:00:00.000Z"
            : null,
        }),
      ),
    };
    const service = new TeamRunHistoryService(memoryDir, {
      metadataStore: metadataStore as any,
      indexService: indexService as any,
      teamRunManager: teamRunManagerMock as any,
    });

    const result = await service.listTeamRunHistory();

    expect(result.map((teamRun) => teamRun.teamRunId)).toEqual([
      "team-archived-active",
      "team-visible",
    ]);
    expect(result[0]).toEqual(expect.objectContaining({
      teamRunId: "team-archived-active",
      isActive: true,
      lastKnownStatus: "ACTIVE",
    }));
  });
});
