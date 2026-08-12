import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import type {
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationRecordSnapshot,
  AppDataMigrationStatus,
} from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import {
  TeamCanonicalIdentityMigration,
  TEAM_CANONICAL_IDENTITY_MIGRATION_ID,
} from "../../../src/app-data-migrations/migrations/team-canonical-identity-migration.js";
import {
  TeamRunMetadataMemberTreeMigration,
  TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID,
} from "../../../src/app-data-migrations/migrations/team-run-metadata-member-tree-migration.js";
import { TeamRunMetadataStore } from "../../../src/run-history/store/team-run-metadata-store.js";

class InMemoryMigrationRepository implements AppDataMigrationRecordRepositoryLike {
  readonly records = new Map<string, AppDataMigrationRecordSnapshot>();

  seedTerminal(migrationId: string, status: "SUCCEEDED" | "SUCCEEDED_WITH_WARNINGS"): void {
    this.records.set(migrationId, {
      migrationId,
      displayName: migrationId,
      status,
      attempts: 1,
      startedAt: new Date("2026-05-17T00:00:00.000Z"),
      completedAt: new Date("2026-05-17T00:00:01.000Z"),
      summaryJson: JSON.stringify({
        scannedCount: 1,
        migratedCount: status === "SUCCEEDED" ? 1 : 0,
        skippedCount: 0,
        failedCount: status === "SUCCEEDED" ? 0 : 1,
        details: [],
      }),
      errorMessage: status === "SUCCEEDED" ? null : "historical warning",
      logPath: null,
    });
  }

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
    status: Exclude<AppDataMigrationStatus, "NOT_RUN" | "RUNNING">;
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
const safeFixturePath = path.join(fixturesDir, "legacy-flat-safe-team-run-metadata.json");
const unsafeFixturePath = path.join(fixturesDir, "legacy-flat-unsafe-nested-team-run-metadata.json");

const readJson = async (filePath: string): Promise<Record<string, any>> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as Record<string, any>;

const writeFixture = async (
  memoryDir: string,
  teamRunId: string,
  fixturePath: string,
): Promise<string> => {
  const payload = await readJson(fixturePath);
  payload.teamRunId = teamRunId;
  const metadataDir = path.join(memoryDir, "agent_teams", teamRunId);
  const metadataPath = path.join(metadataDir, "team_run_metadata.json");
  await fs.mkdir(metadataDir, { recursive: true });
  await fs.writeFile(metadataPath, JSON.stringify(payload, null, 2), "utf-8");
  return metadataPath;
};

const listArtifacts = async (metadataPath: string) => {
  const names = await fs.readdir(path.dirname(metadataPath));
  return {
    backups: names.filter((name) => name.startsWith("team_run_metadata.json.backup-")),
    temporary: names.filter((name) => name.startsWith("team_run_metadata.json.") && name.endsWith(".tmp")),
  };
};

const removeBackups = async (metadataPath: string): Promise<void> => {
  const { backups } = await listArtifacts(metadataPath);
  await Promise.all(backups.map((name) => fs.rm(path.join(path.dirname(metadataPath), name))));
};

const emptyTokenMigrator = {
  migrate: async () => [{
    itemId: "token-usage",
    status: "SKIPPED" as const,
    message: "The TeamRun transition fixture contains no token rows.",
  }],
};

const createRunner = (
  memoryDir: string,
  appDataDir: string,
  tempDir: string,
  repository: InMemoryMigrationRepository,
  stableMigration = new TeamRunMetadataMemberTreeMigration(memoryDir),
) => ({
  stableMigration,
  runner: new AppDataMigrationRunner(
    new AppDataMigrationRegistry([
      stableMigration,
      new TeamCanonicalIdentityMigration(
        memoryDir,
        appDataDir,
        emptyTokenMigrator,
      ),
    ]),
    repository,
    { logsDir: path.join(tempDir, "logs") },
  ),
});

const expectCanonicalProgramTeam = async (memoryDir: string, teamRunId: string) => {
  const metadata = await new TeamRunMetadataStore(memoryDir).readMetadata(teamRunId);
  expect(metadata).toMatchObject({
    schemaVersion: 3,
    rootTeam: {
      kind: "agent_team",
      address: "/",
      teamRunId,
      coordinatorAddress: "/program_manager",
      children: [
        expect.objectContaining({
          kind: "agent",
          address: "/program_manager",
          agentRunId: "program-manager-run",
        }),
        expect.objectContaining({
          kind: "agent",
          address: "/qa_specialist",
          agentRunId: "qa-specialist-run",
        }),
      ],
    },
  });
  for (const child of metadata?.rootTeam.children ?? []) {
    expect(child).not.toHaveProperty("memberName");
    expect(child).not.toHaveProperty("memberRouteKey");
    expect(child).not.toHaveProperty("memberPath");
    expect(child).not.toHaveProperty("memberRunId");
  }
  return metadata;
};

describe("SR-013 two-ID TeamRun metadata transition", () => {
  let tempDir: string;
  let memoryDir: string;
  let appDataDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-sr013-migration-"));
    memoryDir = path.join(tempDir, "memory");
    appDataDir = path.join(tempDir, "app-data");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("runs fresh Program Manager flat data through predecessor then final v3 with two atomic backups", async () => {
    const teamRunId = "team-run-legacy-flat-safe";
    const metadataPath = await writeFixture(memoryDir, teamRunId, safeFixturePath);
    const originalBytes = await fs.readFile(metadataPath, "utf-8");
    const repository = new InMemoryMigrationRepository();
    const { runner } = createRunner(memoryDir, appDataDir, tempDir, repository);

    const results = await runner.runPending();

    expect(results.map(({ migrationId, status, attempts }) => ({ migrationId, status, attempts })))
      .toEqual([
        { migrationId: TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID, status: "SUCCEEDED", attempts: 1 },
        { migrationId: TEAM_CANONICAL_IDENTITY_MIGRATION_ID, status: "SUCCEEDED", attempts: 1 },
      ]);
    expect(results[0]?.summary).toMatchObject({ migratedCount: 1, failedCount: 0 });
    expect(results[1]?.summary).toMatchObject({ migratedCount: 1, failedCount: 0 });
    await expectCanonicalProgramTeam(memoryDir, teamRunId);

    const { backups, temporary } = await listArtifacts(metadataPath);
    expect(backups).toHaveLength(2);
    expect(temporary).toEqual([]);
    const backupBytes = await Promise.all(
      backups.map((name) => fs.readFile(path.join(path.dirname(metadataPath), name), "utf-8")),
    );
    expect(backupBytes).toContain(originalBytes);
    expect(backupBytes.some((value) => value.includes('"memberTree"') && !value.includes('"schemaVersion"')))
      .toBe(true);
  });

  it("skips a terminal-success predecessor record and lets the pending canonical ID write final v3", async () => {
    const teamRunId = "team-run-terminal-predecessor";
    const metadataPath = await writeFixture(memoryDir, teamRunId, safeFixturePath);
    const prerequisite = await new TeamRunMetadataMemberTreeMigration(memoryDir).execute();
    expect(prerequisite).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1 } });
    await removeBackups(metadataPath);
    const predecessorBytes = await fs.readFile(metadataPath, "utf-8");

    const repository = new InMemoryMigrationRepository();
    repository.seedTerminal(TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID, "SUCCEEDED");
    const stableMigration = new TeamRunMetadataMemberTreeMigration(memoryDir);
    const stableExecute = vi.spyOn(stableMigration, "execute");
    const { runner } = createRunner(
      memoryDir,
      appDataDir,
      tempDir,
      repository,
      stableMigration,
    );

    const results = await runner.runPending();

    expect(stableExecute).not.toHaveBeenCalled();
    expect(results).toMatchObject([
      { migrationId: TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID, status: "SUCCEEDED", attempts: 1 },
      { migrationId: TEAM_CANONICAL_IDENTITY_MIGRATION_ID, status: "SUCCEEDED", attempts: 1 },
    ]);
    await expectCanonicalProgramTeam(memoryDir, teamRunId);
    const { backups, temporary } = await listArtifacts(metadataPath);
    expect(backups).toHaveLength(1);
    expect(temporary).toEqual([]);
    await expect(fs.readFile(path.join(path.dirname(metadataPath), backups[0]!), "utf-8"))
      .resolves.toBe(predecessorBytes);
  });

  it("skips a terminal-warning stable record and converts residual flat input directly to final v3", async () => {
    const teamRunId = "team-run-terminal-warning-flat";
    const metadataPath = await writeFixture(memoryDir, teamRunId, safeFixturePath);
    const originalBytes = await fs.readFile(metadataPath, "utf-8");
    const repository = new InMemoryMigrationRepository();
    repository.seedTerminal(TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID, "SUCCEEDED_WITH_WARNINGS");
    const stableMigration = new TeamRunMetadataMemberTreeMigration(memoryDir);
    const stableExecute = vi.spyOn(stableMigration, "execute");
    const { runner } = createRunner(
      memoryDir,
      appDataDir,
      tempDir,
      repository,
      stableMigration,
    );

    const results = await runner.runPending();

    expect(stableExecute).not.toHaveBeenCalled();
    expect(results).toMatchObject([
      {
        migrationId: TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID,
        status: "SUCCEEDED_WITH_WARNINGS",
        attempts: 1,
      },
      { migrationId: TEAM_CANONICAL_IDENTITY_MIGRATION_ID, status: "SUCCEEDED", attempts: 1 },
    ]);
    await expectCanonicalProgramTeam(memoryDir, teamRunId);
    const { backups, temporary } = await listArtifacts(metadataPath);
    expect(backups).toHaveLength(1);
    expect(temporary).toEqual([]);
    await expect(fs.readFile(path.join(path.dirname(metadataPath), backups[0]!), "utf-8"))
      .resolves.toBe(originalBytes);
  });

  it("keeps unsafe residual flat bytes stable, then retries only canonical after repair and skips current v3", async () => {
    const teamRunId = "team-run-repairable-flat";
    const metadataPath = await writeFixture(memoryDir, teamRunId, unsafeFixturePath);
    const unsafeBytes = await fs.readFile(metadataPath, "utf-8");
    const repository = new InMemoryMigrationRepository();
    repository.seedTerminal(TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID, "SUCCEEDED_WITH_WARNINGS");
    const stableMigration = new TeamRunMetadataMemberTreeMigration(memoryDir);
    const stableExecute = vi.spyOn(stableMigration, "execute");
    const { runner } = createRunner(
      memoryDir,
      appDataDir,
      tempDir,
      repository,
      stableMigration,
    );

    const failed = await runner.runPending();

    expect(stableExecute).not.toHaveBeenCalled();
    expect(failed[1]).toMatchObject({
      migrationId: TEAM_CANONICAL_IDENTITY_MIGRATION_ID,
      status: "FAILED",
      attempts: 1,
      canRetry: true,
      summary: { migratedCount: 0, failedCount: 2 },
    });
    expect(failed[1]?.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: "token-usage:team-identity-dependency",
        status: "FAILED",
      }),
    ]));
    await expect(fs.readFile(metadataPath, "utf-8")).resolves.toBe(unsafeBytes);
    await expect(listArtifacts(metadataPath)).resolves.toEqual({ backups: [], temporary: [] });

    await writeFixture(memoryDir, teamRunId, safeFixturePath);
    const repairedBytes = await fs.readFile(metadataPath, "utf-8");
    const repaired = await runner.runPending();

    expect(stableExecute).not.toHaveBeenCalled();
    expect(repaired[1]).toMatchObject({
      migrationId: TEAM_CANONICAL_IDENTITY_MIGRATION_ID,
      status: "SUCCEEDED",
      attempts: 2,
      canRetry: false,
      summary: { migratedCount: 1, failedCount: 0 },
    });
    const current = await expectCanonicalProgramTeam(memoryDir, teamRunId);
    const currentBytes = await fs.readFile(metadataPath, "utf-8");
    const afterRepairArtifacts = await listArtifacts(metadataPath);
    expect(afterRepairArtifacts.backups).toHaveLength(1);
    expect(afterRepairArtifacts.temporary).toEqual([]);
    await expect(fs.readFile(
      path.join(path.dirname(metadataPath), afterRepairArtifacts.backups[0]!),
      "utf-8",
    )).resolves.toBe(repairedBytes);

    const idempotent = await runner.runPending();

    expect(idempotent).toMatchObject([
      {
        migrationId: TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID,
        status: "SUCCEEDED_WITH_WARNINGS",
        attempts: 1,
      },
      { migrationId: TEAM_CANONICAL_IDENTITY_MIGRATION_ID, status: "SUCCEEDED", attempts: 2 },
    ]);
    await expect(fs.readFile(metadataPath, "utf-8")).resolves.toBe(currentBytes);
    await expect(new TeamRunMetadataStore(memoryDir).readMetadata(teamRunId)).resolves.toEqual(current);
    await expect(listArtifacts(metadataPath)).resolves.toEqual(afterRepairArtifacts);
  });
});
