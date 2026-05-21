import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunHistoryCatalogService } from "../../../../src/run-history/services/team-run-history-catalog-service.js";
import { TeamRunHistoryIndexStore } from "../../../../src/run-history/store/team-run-history-index-store.js";
import { TeamRunMetadataStore } from "../../../../src/run-history/store/team-run-metadata-store.js";
import type { TeamRunMetadata } from "../../../../src/run-history/store/team-run-metadata-types.js";

const buildMetadata = (teamRunId: string, overrides: Partial<TeamRunMetadata> = {}): TeamRunMetadata => ({
  teamRunId,
  teamDefinitionId: "team-def-1",
  teamDefinitionName: "Team One",
  coordinatorMemberRouteKey: "planner",
  createdAt: "2026-03-26T10:00:00.000Z",
  archivedAt: null,
  memberTree: [
    {
      memberKind: "agent",
      memberRouteKey: "planner",
      memberPath: ["Planner"],
      memberName: "Planner",
      memberRunId: "planner-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: null,
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "model-1",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      llmConfig: null,
      workspaceRootPath: "/tmp/workspace",
      applicationExecutionContext: null,
    },
  ],
  ...overrides,
});

describe("TeamRunHistoryCatalogService", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-history-catalog-service-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("records team metadata and one V2 catalog row through the catalog boundary", async () => {
    const service = new TeamRunHistoryCatalogService(memoryDir, {
      teamRunManager: { getActiveRun: vi.fn().mockReturnValue(null) },
    });

    await service.recordTeamRunCreated({
      teamRunId: "team-1",
      metadata: buildMetadata("team-1"),
      summary: "initial summary",
    });

    await expect(new TeamRunHistoryIndexStore(memoryDir).listRows()).resolves.toEqual([
      {
        teamRunId: "team-1",
        teamDefinitionId: "team-def-1",
        teamDefinitionName: "Team One",
        workspaceRootPath: "/tmp/workspace",
        summary: "initial summary",
        createdAt: "2026-03-26T10:00:00.000Z",
        archivedAt: null,
        terminatedAt: null,
      },
    ]);
    const rawIndex = JSON.parse(await fs.readFile(path.join(memoryDir, "team_run_history_index.json"), "utf-8"));
    expect(Array.isArray(rawIndex)).toBe(true);
    const rawMetadata = JSON.parse(await fs.readFile(path.join(memoryDir, "agent_teams", "team-1", "team_run_metadata.json"), "utf-8"));
    expect(rawMetadata).not.toHaveProperty("updatedAt");
  });

  it("updates first summary only and does not rewrite on ordinary later activity", async () => {
    const indexStore = new TeamRunHistoryIndexStore(memoryDir);
    const writeSpy = vi.spyOn(indexStore, "writeIndex");
    const service = new TeamRunHistoryCatalogService(memoryDir, {
      indexStore,
      teamRunManager: { getActiveRun: vi.fn().mockReturnValue(null) },
    });
    await service.recordTeamRunCreated({ teamRunId: "team-1", metadata: buildMetadata("team-1") });
    writeSpy.mockClear();

    await service.recordTeamRunSummary({ teamRunId: "team-1", summary: "first" });
    await service.recordTeamRunSummary({ teamRunId: "team-1", summary: "second" });

    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect((await indexStore.getRow("team-1"))?.summary).toBe("first");
  });

  it("archives metadata and catalog row together behind the safe catalog boundary", async () => {
    const service = new TeamRunHistoryCatalogService(memoryDir, {
      teamRunManager: { getActiveRun: vi.fn().mockReturnValue(null) },
    });
    await service.recordTeamRunCreated({ teamRunId: "team-archive", metadata: buildMetadata("team-archive") });

    const result = await service.archiveTeamRun("team-archive");

    expect(result).toEqual({ success: true, message: "Team run 'team-archive' archived." });
    expect((await new TeamRunHistoryIndexStore(memoryDir).getRow("team-archive"))?.archivedAt).toEqual(expect.any(String));
    expect((await new TeamRunMetadataStore(memoryDir).readMetadata("team-archive"))?.archivedAt).toEqual(expect.any(String));
  });

  it("serializes metadata refreshes and preserves stable manifest/lifecycle metadata", async () => {
    const service = new TeamRunHistoryCatalogService(memoryDir, {
      teamRunManager: { getActiveRun: vi.fn().mockReturnValue(null) },
    });
    await service.recordTeamRunCreated({ teamRunId: "team-refresh", metadata: buildMetadata("team-refresh") });
    await service.archiveTeamRun("team-refresh");

    const archivedAt = (await new TeamRunMetadataStore(memoryDir).readMetadata("team-refresh"))?.archivedAt;
    await service.refreshTeamRunMetadata({
      teamRunId: "team-refresh",
      metadata: buildMetadata("team-refresh", {
        teamDefinitionId: "changed-def",
        teamDefinitionName: "Changed Team",
        createdAt: "2026-04-01T00:00:00.000Z",
        archivedAt: null,
      }),
    });

    await expect(new TeamRunMetadataStore(memoryDir).readMetadata("team-refresh")).resolves.toMatchObject({
      teamRunId: "team-refresh",
      teamDefinitionId: "team-def-1",
      teamDefinitionName: "Team One",
      createdAt: "2026-03-26T10:00:00.000Z",
      archivedAt,
    });
  });

  it("rejects unsafe delete identities before filesystem effects", async () => {
    const service = new TeamRunHistoryCatalogService(memoryDir, {
      teamRunManager: { getActiveRun: vi.fn().mockReturnValue(null) },
    });

    await expect(service.deleteTeamRun("../outside")).resolves.toEqual({
      success: false,
      message: "Invalid team run ID path.",
    });
    await expect(fs.stat(path.join(memoryDir, "outside"))).rejects.toThrow();
  });
});
