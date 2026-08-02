import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { TeamRunMetadata } from "../../../../src/run-history/store/team-run-metadata-types.js";
import {
  LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_MESSAGE,
  UnsupportedLegacyTeamRunMetadataError,
} from "../../../../src/run-history/store/team-run-metadata-store.js";
import { TeamRunHistoryService } from "../../../../src/run-history/services/team-run-history-service.js";

const buildTeamMetadata = (
  teamRunId: string,
  overrides: Partial<TeamRunMetadata> = {},
): TeamRunMetadata => ({
  teamRunId,
  teamDefinitionId: "team-def-1",
  teamDefinitionName: "Team Alpha",
  coordinatorMemberRouteKey: "coordinator",
  createdAt: "2026-04-11T20:00:00.000Z",
  archivedAt: null,
  memberTree: [
    {
      memberKind: "agent",
      memberRouteKey: "coordinator",
      memberPath: ["Coordinator"],
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

const buildCatalogRow = (teamRunId: string, overrides: Record<string, unknown> = {}) => ({
  teamRunId,
  teamDefinitionId: "team-def-1",
  teamDefinitionName: "Team Alpha",
  workspaceRootPath: "/ws/a",
  summary: "team summary",
  createdAt: "2026-04-11T20:05:00.000Z",
  archivedAt: null,
  terminatedAt: null,
  ...overrides,
});

describe("TeamRunHistoryService", () => {
  it("projects team history from catalog rows with row-scoped metadata reads", async () => {
    const catalogService = {
      listCatalogRows: vi.fn().mockResolvedValue([buildCatalogRow("team-1")]),
      archiveTeamRun: vi.fn(),
      deleteTeamRun: vi.fn(),
    };
    const metadataStore = {
      readMetadata: vi.fn().mockResolvedValue(buildTeamMetadata("team-1")),
    };
    const service = new TeamRunHistoryService("/tmp/memory", {
      catalogService: catalogService as any,
      metadataStore: metadataStore as any,
      teamRunManager: { getActiveRun: vi.fn().mockReturnValue(null) } as any,
    });

    const result = await service.listTeamRunHistory();

    expect(catalogService.listCatalogRows).toHaveBeenCalledTimes(1);
    expect(metadataStore.readMetadata).toHaveBeenCalledWith("team-1");
    expect(result).toEqual([
      expect.objectContaining({
        teamRunId: "team-1",
        summary: "team summary",
        createdAt: "2026-04-11T20:05:00.000Z",
        status: "offline",
        isActive: false,
        members: [expect.objectContaining({ memberRunId: "member-run-1", status: "offline" })],
      }),
    ]);
    expect(catalogService).not.toHaveProperty("rebuildIndexFromDisk");
  });

  it("uses active team and member status snapshots for history rows", async () => {
    const activeRun = {
      getStatusSnapshot: () => ({ status: "idle" }),
      getMemberStatusSnapshots: () => [
        {
          agent_id: "member-run-1",
          agent_name: "Coordinator",
          status: "running",
        },
      ],
    };
    const service = new TeamRunHistoryService("/tmp/memory", {
      catalogService: { listCatalogRows: vi.fn().mockResolvedValue([buildCatalogRow("team-active")]) } as any,
      metadataStore: { readMetadata: vi.fn().mockResolvedValue(buildTeamMetadata("team-active")) } as any,
      teamRunManager: { getActiveRun: vi.fn().mockReturnValue(activeRun) } as any,
    });

    const result = await service.listTeamRunHistory();

    expect(result[0]).toMatchObject({
      teamRunId: "team-active",
      status: "idle",
      isActive: true,
      members: [{ memberRunId: "member-run-1", status: "running" }],
    });
  });

  it("does not use bare agent_name as a team member status identity fallback", async () => {
    const activeRun = {
      getStatusSnapshot: () => ({ status: "running" }),
      getMemberStatusSnapshots: () => [
        {
          agent_id: "unrelated-run-id",
          agent_name: "Coordinator",
          status: "running",
        },
      ],
    };
    const service = new TeamRunHistoryService("/tmp/memory", {
      catalogService: { listCatalogRows: vi.fn().mockResolvedValue([buildCatalogRow("team-name-only-status")]) } as any,
      metadataStore: { readMetadata: vi.fn().mockResolvedValue(buildTeamMetadata("team-name-only-status")) } as any,
      teamRunManager: { getActiveRun: vi.fn().mockReturnValue(activeRun) } as any,
    });

    const result = await service.listTeamRunHistory();

    expect(result[0]?.members[0]).toMatchObject({
      memberRunId: "member-run-1",
      memberName: "Coordinator",
      status: "offline",
    });
  });

  it("skips missing and unmigrated metadata without repairing the catalog during listing", async () => {
    const catalogService = {
      listCatalogRows: vi.fn().mockResolvedValue([
        buildCatalogRow("team-legacy"),
        buildCatalogRow("team-missing"),
        buildCatalogRow("team-current"),
      ]),
      deleteTeamRun: vi.fn(),
      archiveTeamRun: vi.fn(),
    };
    const metadataStore = {
      readMetadata: vi.fn(async (teamRunId: string) => {
        if (teamRunId === "team-legacy") {
          throw new UnsupportedLegacyTeamRunMetadataError(teamRunId);
        }
        if (teamRunId === "team-missing") {
          return null;
        }
        return buildTeamMetadata(teamRunId);
      }),
    };
    const service = new TeamRunHistoryService("/tmp/memory", {
      catalogService: catalogService as any,
      metadataStore: metadataStore as any,
      teamRunManager: { getActiveRun: vi.fn().mockReturnValue(null) } as any,
    });

    const result = await service.listTeamRunHistory();

    expect(result.map((row) => row.teamRunId)).toEqual(["team-current"]);
    expect(catalogService.deleteTeamRun).not.toHaveBeenCalled();
  });

  it("maps direct resume of unmigrated legacy team metadata to a friendly upgrade-required error", async () => {
    const service = new TeamRunHistoryService("/tmp/memory", {
      metadataStore: {
        readMetadata: vi.fn(async (teamRunId: string) => {
          throw new UnsupportedLegacyTeamRunMetadataError(teamRunId);
        }),
      } as any,
      catalogService: { listCatalogRows: vi.fn() } as any,
      teamRunManager: { getActiveRun: vi.fn().mockReturnValue(null) } as any,
    });

    await expect(service.getTeamRunResumeConfig("team-legacy")).rejects.toMatchObject({
      message: LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_MESSAGE,
      code: "LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED",
      teamRunId: "team-legacy",
    });
  });

  it("delegates archive and delete through the team catalog boundary", async () => {
    const catalogService = {
      listCatalogRows: vi.fn(),
      archiveTeamRun: vi.fn().mockResolvedValue({ success: true, message: "archived" }),
      deleteTeamRun: vi.fn().mockResolvedValue({ success: true, message: "deleted" }),
    };
    const service = new TeamRunHistoryService("/tmp/memory", {
      catalogService: catalogService as any,
      metadataStore: { readMetadata: vi.fn() } as any,
      teamRunManager: { getActiveRun: vi.fn().mockReturnValue(null) } as any,
    });

    await expect(service.archiveStoredTeamRun("team-archive")).resolves.toEqual({
      success: true,
      message: "archived",
    });
    await expect(service.deleteStoredTeamRun("team-delete")).resolves.toEqual({
      success: true,
      message: "deleted",
    });
    expect(catalogService.archiveTeamRun).toHaveBeenCalledWith("team-archive");
    expect(catalogService.deleteTeamRun).toHaveBeenCalledWith("team-delete");
  });
});
