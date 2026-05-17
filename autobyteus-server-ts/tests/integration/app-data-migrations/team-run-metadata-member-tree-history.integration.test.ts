import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import type {
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationRecordSnapshot,
} from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import {
  TeamRunMetadataMemberTreeMigration,
  TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID,
} from "../../../src/app-data-migrations/migrations/team-run-metadata-member-tree-migration.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { WorkspaceRunHistoryService } from "../../../src/run-history/services/workspace-run-history-service.js";
import { TeamRunHistoryIndexService } from "../../../src/run-history/services/team-run-history-index-service.js";
import { TeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";
import { TeamRunHistoryIndexStore } from "../../../src/run-history/store/team-run-history-index-store.js";
import { TeamRunMetadataStore } from "../../../src/run-history/store/team-run-metadata-store.js";
import type { TeamRunMetadata } from "../../../src/run-history/store/team-run-metadata-types.js";

class InMemoryMigrationRepository implements AppDataMigrationRecordRepositoryLike {
  private readonly records = new Map<string, AppDataMigrationRecordSnapshot>();

  async getRecord(migrationId: string): Promise<AppDataMigrationRecordSnapshot | null> {
    return this.records.get(migrationId) ?? null;
  }

  async listRecords(): Promise<AppDataMigrationRecordSnapshot[]> {
    return Array.from(this.records.values());
  }

  async markRunning(input: {
    migrationId: string;
    displayName: string;
    startedAt: Date;
  }): Promise<AppDataMigrationRecordSnapshot> {
    const previous = this.records.get(input.migrationId);
    const record: AppDataMigrationRecordSnapshot = {
      migrationId: input.migrationId,
      displayName: input.displayName,
      status: "RUNNING",
      attempts: (previous?.attempts ?? 0) + 1,
      startedAt: input.startedAt,
      completedAt: null,
      summaryJson: null,
      errorMessage: null,
      logPath: null,
    };
    this.records.set(input.migrationId, record);
    return record;
  }

  async complete(input: {
    migrationId: string;
    displayName: string;
    status: "SUCCEEDED" | "FAILED" | "SUCCEEDED_WITH_WARNINGS";
    completedAt: Date;
    summaryJson: string;
    errorMessage: string | null;
    logPath: string | null;
  }): Promise<AppDataMigrationRecordSnapshot> {
    const previous = this.records.get(input.migrationId);
    const record: AppDataMigrationRecordSnapshot = {
      migrationId: input.migrationId,
      displayName: input.displayName,
      status: input.status,
      attempts: previous?.attempts ?? 1,
      startedAt: previous?.startedAt ?? null,
      completedAt: input.completedAt,
      summaryJson: input.summaryJson,
      errorMessage: input.errorMessage,
      logPath: input.logPath,
    };
    this.records.set(input.migrationId, record);
    return record;
  }

  async markFailed(input: {
    migrationId: string;
    displayName: string;
    completedAt: Date;
    summaryJson: string;
    errorMessage: string;
    logPath: string | null;
  }): Promise<AppDataMigrationRecordSnapshot> {
    return this.complete({ ...input, status: "FAILED" });
  }
}

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/app-data-migrations/team-run-metadata-member-tree",
);

const copyFixtureMetadata = async (
  memoryDir: string,
  teamRunId: string,
  fixtureName: string,
): Promise<string> => {
  const metadataDir = path.join(memoryDir, "agent_teams", teamRunId);
  await fs.mkdir(metadataDir, { recursive: true });
  const target = path.join(metadataDir, "team_run_metadata.json");
  await fs.copyFile(path.join(fixturesDir, fixtureName), target);
  return target;
};

const currentCanonicalMetadata = (): TeamRunMetadata => ({
  teamRunId: "team-run-current-canonical",
  teamDefinitionId: "team-def-current-canonical",
  teamDefinitionName: "Current Canonical Team",
  coordinatorMemberRouteKey: "coordinator",
  createdAt: "2026-05-01T12:00:00.000Z",
  updatedAt: "2026-05-01T12:05:00.000Z",
  archivedAt: null,
  memberTree: [
    {
      memberKind: "agent",
      memberRouteKey: "coordinator",
      memberPath: ["coordinator"],
      memberName: "Coordinator",
      memberRunId: "coordinator-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: null,
      agentDefinitionId: "agent-coordinator",
      llmModelIdentifier: "codex:test-model",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      llmConfig: null,
      workspaceRootPath: "/tmp/autobyteus/current-workspace",
      applicationExecutionContext: null,
    },
  ],
});

const inactiveTeamRunManager = {
  getActiveRun: vi.fn().mockReturnValue(null),
  getTeamRun: vi.fn().mockReturnValue(null),
  listActiveRuns: vi.fn().mockReturnValue([]),
} as any;

describe("team run metadata member-tree app-data migration history boundary", () => {
  let tempDir: string;
  let memoryDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-migration-history-e2e-"));
    memoryDir = path.join(tempDir, "memory");
    inactiveTeamRunManager.getActiveRun.mockClear();
    inactiveTeamRunManager.getTeamRun.mockClear();
    inactiveTeamRunManager.listActiveRuns.mockClear();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("migrates a real historical flat metadata file to canonical history format", async () => {
    const safeMetadataPath = await copyFixtureMetadata(
      memoryDir,
      "team-run-legacy-flat-safe",
      "legacy-flat-safe-team-run-metadata.json",
    );

    const metadataStore = new TeamRunMetadataStore(memoryDir);
    const repository = new InMemoryMigrationRepository();
    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([new TeamRunMetadataMemberTreeMigration(memoryDir)]),
      repository,
      { logsDir: path.join(tempDir, "logs") },
    );

    const firstRun = await runner.runPending();
    expect(firstRun).toHaveLength(1);
    expect(firstRun[0]).toMatchObject({
      migrationId: TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID,
      status: "SUCCEEDED",
      attempts: 1,
      canRetry: false,
    });
    expect(firstRun[0]?.summary).toMatchObject({
      scannedCount: 1,
      migratedCount: 1,
      skippedCount: 0,
      failedCount: 0,
    });

    const converted = JSON.parse(await fs.readFile(safeMetadataPath, "utf-8"));
    expect(converted.runVersion).toBeUndefined();
    expect(converted.memberMetadata).toBeUndefined();
    expect(converted.memberTree).toEqual([
      expect.objectContaining({
        memberKind: "agent",
        memberRouteKey: "program_manager",
        memberPath: ["program_manager"],
        memberRunId: "program-manager-run",
      }),
      expect.objectContaining({
        memberKind: "agent",
        memberRouteKey: "qa_specialist",
        memberPath: ["qa_specialist"],
        memberRunId: "qa-specialist-run",
      }),
    ]);
    const backupNames = await fs.readdir(path.dirname(safeMetadataPath));
    expect(backupNames.some((name) => name.includes("team_run_metadata.json.backup-"))).toBe(true);

    const indexStore = new TeamRunHistoryIndexStore(memoryDir);
    const indexService = new TeamRunHistoryIndexService(memoryDir, {
      indexStore,
      metadataStore,
      teamRunManager: inactiveTeamRunManager,
    });
    const teamRunHistoryService = new TeamRunHistoryService(memoryDir, {
      metadataStore,
      indexService,
      teamRunManager: inactiveTeamRunManager,
    });
    const workspaceRunHistoryService = new WorkspaceRunHistoryService({
      agentRunHistoryService: { listRunHistory: vi.fn(async () => []) } as any,
      teamRunHistoryService,
    });

    const workspaceHistory = await workspaceRunHistoryService.listWorkspaceRunHistory(10);
    const returnedTeamRunIds = workspaceHistory.flatMap((workspace) =>
      workspace.teamDefinitions.flatMap((definition) =>
        definition.runs.map((run) => run.teamRunId),
      ),
    );
    expect(returnedTeamRunIds).toEqual(["team-run-legacy-flat-safe"]);

    await expect(
      teamRunHistoryService.getTeamRunResumeConfig("team-run-legacy-flat-safe"),
    ).resolves.toMatchObject({
      teamRunId: "team-run-legacy-flat-safe",
      metadata: {
        memberTree: [
          expect.objectContaining({ memberRouteKey: "program_manager" }),
          expect.objectContaining({ memberRouteKey: "qa_specialist" }),
        ],
      },
    });

    const retry = await runner.runMigration(TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID);
    expect(retry).toMatchObject({
      status: "SUCCEEDED",
      attempts: 2,
      summary: {
        scannedCount: 1,
        migratedCount: 0,
        skippedCount: 1,
        failedCount: 0,
      },
    });
  });

  it("keeps workspace history usable when an unsafe historical file cannot be migrated", async () => {
    const safeMetadataPath = await copyFixtureMetadata(
      memoryDir,
      "team-run-legacy-flat-safe",
      "legacy-flat-safe-team-run-metadata.json",
    );
    await copyFixtureMetadata(
      memoryDir,
      "team-run-legacy-flat-unsafe",
      "legacy-flat-unsafe-nested-team-run-metadata.json",
    );

    const metadataStore = new TeamRunMetadataStore(memoryDir);
    await metadataStore.writeMetadata("team-run-current-canonical", currentCanonicalMetadata());

    const repository = new InMemoryMigrationRepository();
    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([new TeamRunMetadataMemberTreeMigration(memoryDir)]),
      repository,
      { logsDir: path.join(tempDir, "logs") },
    );

    const firstRun = await runner.runPending();
    expect(firstRun).toHaveLength(1);
    expect(firstRun[0]).toMatchObject({
      migrationId: TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID,
      status: "SUCCEEDED_WITH_WARNINGS",
      attempts: 1,
      canRetry: true,
    });
    expect(firstRun[0]?.summary).toMatchObject({
      scannedCount: 3,
      migratedCount: 1,
      skippedCount: 1,
      failedCount: 1,
    });

    const converted = JSON.parse(await fs.readFile(safeMetadataPath, "utf-8"));
    expect(converted.runVersion).toBeUndefined();
    expect(converted.memberMetadata).toBeUndefined();
    expect(converted.memberTree).toEqual([
      expect.objectContaining({
        memberKind: "agent",
        memberRouteKey: "program_manager",
        memberPath: ["program_manager"],
        memberRunId: "program-manager-run",
      }),
      expect.objectContaining({
        memberKind: "agent",
        memberRouteKey: "qa_specialist",
        memberPath: ["qa_specialist"],
        memberRunId: "qa-specialist-run",
      }),
    ]);
    const backupNames = await fs.readdir(path.dirname(safeMetadataPath));
    expect(backupNames.some((name) => name.includes("team_run_metadata.json.backup-"))).toBe(true);

    const indexStore = new TeamRunHistoryIndexStore(memoryDir);
    const indexService = new TeamRunHistoryIndexService(memoryDir, {
      indexStore,
      metadataStore,
      teamRunManager: inactiveTeamRunManager,
    });
    const teamRunHistoryService = new TeamRunHistoryService(memoryDir, {
      metadataStore,
      indexService,
      teamRunManager: inactiveTeamRunManager,
    });
    const workspaceRunHistoryService = new WorkspaceRunHistoryService({
      agentRunHistoryService: { listRunHistory: vi.fn(async () => []) } as any,
      teamRunHistoryService,
    });

    const workspaceHistory = await workspaceRunHistoryService.listWorkspaceRunHistory(10);
    const returnedTeamRunIds = workspaceHistory.flatMap((workspace) =>
      workspace.teamDefinitions.flatMap((definition) =>
        definition.runs.map((run) => run.teamRunId),
      ),
    );
    expect(returnedTeamRunIds).toEqual([
      "team-run-current-canonical",
      "team-run-legacy-flat-safe",
    ]);
    expect(returnedTeamRunIds).not.toContain("team-run-legacy-flat-unsafe");

    await expect(
      teamRunHistoryService.getTeamRunResumeConfig("team-run-legacy-flat-safe"),
    ).resolves.toMatchObject({
      teamRunId: "team-run-legacy-flat-safe",
      metadata: {
        memberTree: [
          expect.objectContaining({ memberRouteKey: "program_manager" }),
          expect.objectContaining({ memberRouteKey: "qa_specialist" }),
        ],
      },
    });
    await expect(
      teamRunHistoryService.getTeamRunResumeConfig("team-run-legacy-flat-unsafe"),
    ).rejects.toMatchObject({
      code: "LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED",
      teamRunId: "team-run-legacy-flat-unsafe",
    });

    const retry = await runner.runMigration(TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID);
    expect(retry).toMatchObject({
      status: "SUCCEEDED_WITH_WARNINGS",
      attempts: 2,
      summary: {
        scannedCount: 3,
        migratedCount: 0,
        skippedCount: 2,
        failedCount: 1,
      },
    });
  });
});
