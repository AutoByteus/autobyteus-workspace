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
import { TeamRunMetadataStore } from "../../../src/app-data-migrations/legacy/team-run-metadata-store.js";
import {
  TeamRunExecutionTreeV1AppDataMigration,
  TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID,
} from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-app-data-migration.js";
import { TeamRunMigrationStateClassifier } from "../../../src/app-data-migrations/migrations/team-run-migration-state-classifier.js";
import {
  TeamCommunicationProjectionAddressMigration,
  TEAM_COMMUNICATION_PROJECTION_ADDRESS_MIGRATION_ID,
} from "../../../src/app-data-migrations/migrations/team-communication-projection-address-migration.js";

class InMemoryMigrationRepository implements AppDataMigrationRecordRepositoryLike {
  readonly records = new Map<string, AppDataMigrationRecordSnapshot>();

  seedTerminal(migrationId: string, status: "SUCCEEDED" | "SUCCEEDED_WITH_WARNINGS"): void {
    this.seedCompleted(migrationId, status);
  }

  seedCompleted(
    migrationId: string,
    status: "SUCCEEDED" | "SUCCEEDED_WITH_WARNINGS" | "FAILED",
    attempts = 1,
  ): void {
    this.records.set(migrationId, {
      migrationId,
      displayName: migrationId,
      status,
      attempts,
      startedAt: new Date("2026-05-17T00:00:00.000Z"),
      completedAt: new Date("2026-05-17T00:00:01.000Z"),
      summaryJson: JSON.stringify({
        scannedCount: 1,
        migratedCount: status === "SUCCEEDED" ? 1 : 0,
        skippedCount: 0,
        failedCount: status === "SUCCEEDED" ? 0 : 1,
        details: [],
      }),
      errorMessage: status === "SUCCEEDED" ? null : status === "FAILED" ? "retryable failure" : "historical warning",
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

const writeCommunication = async (
  memoryDir: string,
  teamRunId: string,
  receiverAddress: unknown,
): Promise<string> => {
  const filePath = path.join(memoryDir, "agent_teams", teamRunId, "team_communication_messages.json");
  await fs.writeFile(filePath, JSON.stringify({
    teamRunId,
    messages: [{
      messageId: `message-${teamRunId}`,
      senderAddress: { segments: [{ kind: "member", memberRouteKey: "program_manager" }] },
      receiverAddress,
      content: "Please verify the migration.",
      messageType: "agent_message",
      createdAt: "2026-05-01T10:01:00.000Z",
      referenceFiles: [],
    }],
  }, null, 2), "utf8");
  return filePath;
};

const snapshotTree = async (root: string): Promise<readonly string[]> => {
  const entries: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    let children: import("node:fs").Dirent[];
    try {
      children = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    for (const child of children.sort((left, right) => left.name.localeCompare(right.name))) {
      const filePath = path.join(directory, child.name);
      const relativePath = path.relative(root, filePath);
      if (child.isDirectory()) {
        entries.push(`directory:${relativePath}`);
        await visit(filePath);
      } else {
        entries.push(`file:${relativePath}:${await fs.readFile(filePath, "base64")}`);
      }
    }
  };
  await visit(root);
  return Object.freeze(entries);
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

  it("converges a predecessor/current/historical cohort and performs no second-run writes or attempts", async () => {
    const predecessorId = "team-run-mixed-predecessor";
    await writeFixture(memoryDir, predecessorId, safeFixturePath);

    const currentSource = path.resolve(
      process.cwd(),
      "tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-001-persistent-only",
    );
    const currentTree = await readJson(path.join(currentSource, "team_run_execution_tree.json"));
    const currentId = currentTree.rootTeam.teamRunId as string;
    const currentDirectory = path.join(memoryDir, "agent_teams", currentId);
    await fs.mkdir(currentDirectory, { recursive: true });
    await Promise.all([
      "team_run_execution_tree.json",
      "task_delegation_records.json",
      "team_communication_messages.json",
    ].map((name) => fs.copyFile(path.join(currentSource, name), path.join(currentDirectory, name))));

    const historicalId = "team-run-mixed-historical";
    const historicalDirectory = path.join(memoryDir, "agent_teams", historicalId);
    await fs.mkdir(historicalDirectory, { recursive: true });
    await fs.writeFile(path.join(historicalDirectory, "team_run_manifest.json"), JSON.stringify({
      teamRunId: historicalId,
      runVersion: 1,
      coordinatorMemberRouteKey: "coordinator",
      memberBindings: [{ memberRouteKey: "coordinator", memberRunId: "member-run-1" }],
    }), "utf8");

    const repository = new InMemoryMigrationRepository();
    const v1TokenStore = {
      listExecutionIdentityMigrationEvidence: vi.fn(async () => []),
      migrateExecutionIdentity: vi.fn(async () => ({ migratedRows: 0, alreadyCurrent: true })),
      disconnectExecutionIdentityMigration: vi.fn(async () => undefined),
    };
    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([
        new TeamRunMetadataMemberTreeMigration(memoryDir),
        new TeamCanonicalIdentityMigration(memoryDir, appDataDir, emptyTokenMigrator),
        new TeamRunExecutionTreeV1AppDataMigration(memoryDir, appDataDir, v1TokenStore),
      ]),
      repository,
      { logsDir: path.join(tempDir, "logs") },
    );

    const first = await runner.runPending();

    expect(first.map(({ migrationId, status, attempts }) => ({ migrationId, status, attempts })))
      .toEqual([
        { migrationId: TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID, status: "SUCCEEDED", attempts: 1 },
        { migrationId: TEAM_CANONICAL_IDENTITY_MIGRATION_ID, status: "SUCCEEDED", attempts: 1 },
        { migrationId: TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID, status: "SUCCEEDED", attempts: 1 },
      ]);
    const states = await new TeamRunMigrationStateClassifier(memoryDir).listAndClassifyRoots();
    expect(states.map(({ rootTeamRunId, kind }) => ({ rootTeamRunId, kind }))).toEqual([
      { rootTeamRunId: currentId, kind: "CURRENT_V1" },
      { rootTeamRunId: historicalId, kind: "HISTORICAL_RESIDUE" },
      { rootTeamRunId: predecessorId, kind: "CURRENT_V1" },
    ].sort((left, right) => left.rootTeamRunId.localeCompare(right.rootTeamRunId)));
    expect(v1TokenStore.migrateExecutionIdentity).toHaveBeenCalledOnce();
    const historyRows = JSON.parse(await fs.readFile(
      path.join(memoryDir, "team_run_history_index.json"),
      "utf8",
    )) as Array<{ teamRunId: string; workspaceRootPath: string | null }>;
    expect(historyRows.map((row) => row.teamRunId).sort()).toEqual([currentId, predecessorId].sort());
    expect(historyRows.some((row) => row.teamRunId === historicalId)).toBe(false);

    const memorySnapshot = await snapshotTree(memoryDir);
    const appDataSnapshot = await snapshotTree(appDataDir);
    const second = await runner.runPending();

    expect(second.map(({ migrationId, status, attempts }) => ({ migrationId, status, attempts })))
      .toEqual(first.map(({ migrationId, status, attempts }) => ({ migrationId, status, attempts })));
    await expect(snapshotTree(memoryDir)).resolves.toEqual(memorySnapshot);
    await expect(snapshotTree(appDataDir)).resolves.toEqual(appDataSnapshot);
    expect(v1TokenStore.migrateExecutionIdentity).toHaveBeenCalledOnce();
  });

  it("retries only failed V1 after terminal address/canonical migrations and is idempotent", async () => {
    const teamRunId = "team-run-released-address-retry";
    await writeFixture(memoryDir, teamRunId, safeFixturePath);
    await expect(new TeamRunMetadataMemberTreeMigration(memoryDir).execute())
      .resolves.toMatchObject({ status: "SUCCEEDED" });
    await expect(new TeamCanonicalIdentityMigration(memoryDir, appDataDir, emptyTokenMigrator).execute())
      .resolves.toMatchObject({ status: "SUCCEEDED" });
    await writeCommunication(memoryDir, teamRunId, {
      segments: [{ kind: "member", member_path: ["qa_specialist"], member_route_key: "qa_specialist" }],
    });

    const repository = new InMemoryMigrationRepository();
    repository.seedTerminal(TEAM_COMMUNICATION_PROJECTION_ADDRESS_MIGRATION_ID, "SUCCEEDED");
    repository.seedTerminal(TEAM_CANONICAL_IDENTITY_MIGRATION_ID, "SUCCEEDED");
    repository.seedCompleted(TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID, "FAILED", 3);
    const communicationMigration = new TeamCommunicationProjectionAddressMigration(memoryDir);
    const canonicalMigration = new TeamCanonicalIdentityMigration(memoryDir, appDataDir, emptyTokenMigrator);
    const communicationExecute = vi.spyOn(communicationMigration, "execute");
    const canonicalExecute = vi.spyOn(canonicalMigration, "execute");
    const v1TokenStore = {
      listExecutionIdentityMigrationEvidence: vi.fn(async () => []),
      migrateExecutionIdentity: vi.fn(async () => ({ migratedRows: 0, alreadyCurrent: true })),
      disconnectExecutionIdentityMigration: vi.fn(async () => undefined),
    };
    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([
        communicationMigration,
        canonicalMigration,
        new TeamRunExecutionTreeV1AppDataMigration(memoryDir, appDataDir, v1TokenStore),
      ]),
      repository,
      { logsDir: path.join(tempDir, "logs") },
    );

    const first = await runner.runPending();

    expect(first.map(({ migrationId, status, attempts }) => ({ migrationId, status, attempts })))
      .toEqual([
        { migrationId: TEAM_COMMUNICATION_PROJECTION_ADDRESS_MIGRATION_ID, status: "SUCCEEDED", attempts: 1 },
        { migrationId: TEAM_CANONICAL_IDENTITY_MIGRATION_ID, status: "SUCCEEDED", attempts: 1 },
        { migrationId: TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID, status: "SUCCEEDED", attempts: 4 },
      ]);
    expect(communicationExecute).not.toHaveBeenCalled();
    expect(canonicalExecute).not.toHaveBeenCalled();
    const rootDir = path.join(memoryDir, "agent_teams", teamRunId);
    await expect(readJson(path.join(rootDir, "team_communication_messages.json"))).resolves.toMatchObject({
      schemaVersion: 1,
      rootTeamRunId: teamRunId,
      messages: [{
        senderAgentRunId: "program-manager-run",
        receiverAgentRunId: "qa-specialist-run",
      }],
    });
    const memorySnapshot = await snapshotTree(memoryDir);
    const appDataSnapshot = await snapshotTree(appDataDir);

    const second = await runner.runPending();

    expect(second.map(({ migrationId, status, attempts }) => ({ migrationId, status, attempts })))
      .toEqual(first.map(({ migrationId, status, attempts }) => ({ migrationId, status, attempts })));
    await expect(snapshotTree(memoryDir)).resolves.toEqual(memorySnapshot);
    await expect(snapshotTree(appDataDir)).resolves.toEqual(appDataSnapshot);
    expect(v1TokenStore.migrateExecutionIdentity).toHaveBeenCalledOnce();
  });

  it("keeps the whole predecessor cohort unpromoted when one released address is malformed", async () => {
    const validRoot = "team-run-valid-address";
    const invalidRoot = "team-run-invalid-address";
    await Promise.all([
      writeFixture(memoryDir, validRoot, safeFixturePath),
      writeFixture(memoryDir, invalidRoot, safeFixturePath),
    ]);
    await expect(new TeamRunMetadataMemberTreeMigration(memoryDir).execute())
      .resolves.toMatchObject({ status: "SUCCEEDED" });
    await expect(new TeamCanonicalIdentityMigration(memoryDir, appDataDir, emptyTokenMigrator).execute())
      .resolves.toMatchObject({ status: "SUCCEEDED" });
    await Promise.all([
      writeCommunication(memoryDir, validRoot, {
        segments: [{ kind: "member", memberPath: ["qa_specialist"] }],
      }),
      writeCommunication(memoryDir, invalidRoot, {
        segments: [{ kind: "member", memberPath: ["qa_specialist"], memberRouteKey: "wrong_member" }],
      }),
    ]);
    const before = await snapshotTree(memoryDir);

    const result = await new TeamRunExecutionTreeV1AppDataMigration(
      memoryDir,
      appDataDir,
      {
        listExecutionIdentityMigrationEvidence: vi.fn(async () => []),
        migrateExecutionIdentity: vi.fn(async () => ({ migratedRows: 0, alreadyCurrent: true })),
        disconnectExecutionIdentityMigration: vi.fn(async () => undefined),
      },
    ).execute();

    expect(result.status).toBe("FAILED");
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: `team-root:${invalidRoot}`,
        status: "FAILED",
        message: expect.stringContaining("messages[0].receiverAddress.segments[0] route/path identity contradicts"),
      }),
    ]));
    await expect(snapshotTree(memoryDir)).resolves.toEqual(before);
    await expect(fs.stat(path.join(memoryDir, "agent_teams", validRoot, "team_run_metadata.json")))
      .resolves.toBeDefined();
    await expect(fs.stat(path.join(memoryDir, "agent_teams", invalidRoot, "team_run_metadata.json")))
      .resolves.toBeDefined();
  });
});
