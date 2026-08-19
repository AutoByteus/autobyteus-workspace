import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationRecordRepositoryLike,
} from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import { AppDataMigrationRecordRepository } from "../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js";
import { MAX_APP_DATA_MIGRATION_SUMMARY_BYTES } from "../../../src/app-data-migrations/repositories/app-data-migration-summary-projection.js";
import { TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.js";
import { TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.js";
import { TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/token-usage-run-records-v1/token-usage-run-records-v1-app-data-migration.js";
import {
  STORED_AUDIT_DETAILS_COMPACTED_ITEM_ID,
  TOKEN_USAGE_MIGRATION_AUDIT_COMPACTION_V1_MIGRATION_ID,
  TokenUsageMigrationAuditCompactionV1AppDataMigration,
} from "../../../src/app-data-migrations/migrations/token-usage-migration-audit-compaction-v1/token-usage-migration-audit-compaction-v1-app-data-migration.js";
import { TokenUsageMigrationAuditLogCompactor } from "../../../src/app-data-migrations/migrations/token-usage-migration-audit-compaction-v1/token-usage-migration-audit-log-compactor.js";
import {
  TokenUsageMigrationAuditCompactionRepository,
  type TokenUsageMigrationAuditCompactionRepositoryLike,
} from "../../../src/app-data-migrations/migrations/token-usage-migration-audit-compaction-v1/token-usage-migration-audit-compaction-repository.js";
import {
  createAuditFixture,
  destroyAuditFixture,
  insertAuditRecord,
  makeSummary,
  readRawAuditRecord,
  readTokenSentinels,
  type AuditFixture,
} from "../../helpers/app-data-migration-audit-fixtures.js";

const fixtures: AuditFixture[] = [];
const emptySummary = { scannedCount: 0, migratedCount: 0, skippedCount: 0, failedCount: 0, details: [] };

const terminalSourceDefinition = (id: string): AppDataMigrationDefinition => ({
  id,
  displayName: `Source ${id}`,
  description: "terminal source fixture",
  requiredOnStartup: true,
  execute: vi.fn(async () => { throw new Error("terminal source must be skipped"); }),
});

const registryFor = (
  compactor: TokenUsageMigrationAuditCompactionV1AppDataMigration,
): AppDataMigrationRegistry => new AppDataMigrationRegistry([
  terminalSourceDefinition(TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID),
  terminalSourceDefinition(TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID),
  compactor,
]);

class ObservedRecordRepository implements AppDataMigrationRecordRepositoryLike {
  readonly selectedSummaryBytes: number[] = [];

  constructor(
    protected readonly delegate: AppDataMigrationRecordRepository,
  ) {}

  private observe<T extends { summaryJson: string | null } | null>(record: T): T {
    if (record?.summaryJson) this.selectedSummaryBytes.push(Buffer.byteLength(record.summaryJson, "utf8"));
    return record;
  }

  async getRecord(id: string) { return this.observe(await this.delegate.getRecord(id)); }
  async listRecords() {
    const records = await this.delegate.listRecords();
    records.forEach((record) => this.observe(record));
    return records;
  }
  async markRunning(input: Parameters<AppDataMigrationRecordRepository["markRunning"]>[0]) {
    return this.observe(await this.delegate.markRunning(input))!;
  }
  async complete(input: Parameters<AppDataMigrationRecordRepository["complete"]>[0]) {
    return this.observe(await this.delegate.complete(input))!;
  }
  async markFailed(input: Parameters<AppDataMigrationRecordRepository["markFailed"]>[0]) {
    return this.observe(await this.delegate.markFailed(input))!;
  }
}

const sourceTuple = (record: Record<string, unknown> | null): unknown => record && ({
  migration_id: record["migration_id"],
  display_name: record["display_name"],
  status: record["status"],
  attempts: record["attempts"],
  started_at: record["started_at"],
  completed_at: record["completed_at"],
  error_message: record["error_message"],
  log_path: record["log_path"],
});

const expectedCanonicalLog = (input: {
  tuple: Record<string, unknown>;
  counts: {
    scannedCount: number;
    migratedCount: number;
    skippedCount: number;
    failedCount: number;
  };
  detailCount: number;
}): string => [
  `migrationId=${input.tuple.migration_id}`,
  `displayName=${input.tuple.display_name}`,
  `status=${input.tuple.status}`,
  `attempts=${input.tuple.attempts}`,
  `startedAt=${input.tuple.started_at}`,
  `completedAt=${input.tuple.completed_at}`,
  `errorState=${input.tuple.error_message === null ? "absent" : "present"}`,
  `statusSummary=${JSON.stringify(input.counts)}`,
  `detailsOmitted=${input.detailCount}`,
  "reason=historical audit detail exceeded 65,536 bytes",
  "",
].join("\n");

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(destroyAuditFixture));
});

describe("TokenUsageMigrationAuditCompactionV1", () => {
  it("runs through registry runPending and compacts 100,000+ detail summaries and >10 MiB owned logs", async () => {
    const fixture = await createAuditFixture("large-run-pending");
    fixtures.push(fixture);
    const large = makeSummary(100_001, 48);
    expect(Buffer.byteLength(large.json, "utf8")).toBeGreaterThan(10 * 1024 * 1024);
    const sourceIds = [
      TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID,
      TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID,
    ] as const;
    const tuples = new Map<string, unknown>();
    for (const [index, migrationId] of sourceIds.entries()) {
      const logPath = path.join(fixture.logsDir, `${migrationId}.log`);
      await fs.writeFile(logPath, `${large.json}\n`, "utf8");
      expect((await fs.stat(logPath)).size).toBeGreaterThan(10 * 1024 * 1024);
      insertAuditRecord({
        databasePath: fixture.databasePath,
        migrationId,
        status: index === 0 ? "SUCCEEDED" : "SUCCEEDED_WITH_WARNINGS",
        attempts: index + 5,
        summaryJson: large.json,
        errorMessage: index === 0 ? null : "released bounded warning",
        logPath,
      });
      tuples.set(migrationId, sourceTuple(readRawAuditRecord(fixture.databasePath, migrationId)));
    }
    const tokenBefore = readTokenSentinels(fixture.databasePath);
    const recordRepository = new ObservedRecordRepository(
      new AppDataMigrationRecordRepository(fixture.prisma),
    );
    const compactor = new TokenUsageMigrationAuditCompactionV1AppDataMigration(
      new TokenUsageMigrationAuditCompactionRepository(fixture.prisma),
      new TokenUsageMigrationAuditLogCompactor(fixture.logsDir),
    );
    const runner = new AppDataMigrationRunner(
      registryFor(compactor),
      recordRepository,
      { logsDir: fixture.logsDir },
    );

    const before = await runner.listStatuses();
    for (const source of before.filter(({ migrationId }) => sourceIds.includes(migrationId as never))) {
      expect(source.summary).toMatchObject({
        scannedCount: large.summary.scannedCount,
        migratedCount: large.summary.migratedCount,
        skippedCount: large.summary.skippedCount,
        failedCount: large.summary.failedCount,
      });
      expect(source.summary?.details).toHaveLength(1);
      expect(source.summaryJson && Buffer.byteLength(source.summaryJson, "utf8"))
        .toBeLessThanOrEqual(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);
    }

    recordRepository.selectedSummaryBytes.length = 0;
    const results = await runner.runPending();
    const compactorResult = results.find(
      ({ migrationId }) => migrationId === TOKEN_USAGE_MIGRATION_AUDIT_COMPACTION_V1_MIGRATION_ID,
    )!;
    expect(compactorResult)
      .toMatchObject({ status: "SUCCEEDED", attempts: 1, summary: { migratedCount: 2, failedCount: 0 } });
    expect(Buffer.byteLength(compactorResult.summaryJson!, "utf8"))
      .toBeLessThanOrEqual(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);
    expect((await fs.stat(compactorResult.logPath!)).size)
      .toBeLessThanOrEqual(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);
    expect(recordRepository.selectedSummaryBytes.length).toBeGreaterThan(0);
    expect(recordRepository.selectedSummaryBytes.every((size) => size <= MAX_APP_DATA_MIGRATION_SUMMARY_BYTES)).toBe(true);

    for (const migrationId of sourceIds) {
      const raw = readRawAuditRecord(fixture.databasePath, migrationId)!;
      expect(sourceTuple(raw)).toEqual(tuples.get(migrationId));
      const summaryJson = raw["summary_json"] as string;
      expect(Buffer.byteLength(summaryJson, "utf8")).toBeLessThanOrEqual(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);
      expect(JSON.parse(summaryJson)).toMatchObject({
        scannedCount: large.summary.scannedCount,
        migratedCount: large.summary.migratedCount,
        skippedCount: large.summary.skippedCount,
        failedCount: large.summary.failedCount,
        details: [{ itemId: STORED_AUDIT_DETAILS_COMPACTED_ITEM_ID, status: "SKIPPED" }],
      });
      expect((await fs.stat(raw["log_path"] as string)).size).toBeLessThanOrEqual(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);
      await expect(fs.readFile(raw["log_path"] as string, "utf8")).resolves.toBe(expectedCanonicalLog({
        tuple: tuples.get(migrationId) as Record<string, unknown>,
        counts: {
          scannedCount: large.summary.scannedCount,
          migratedCount: large.summary.migratedCount,
          skippedCount: large.summary.skippedCount,
          failedCount: large.summary.failedCount,
        },
        detailCount: 100_001,
      }));
    }
    expect(readTokenSentinels(fixture.databasePath)).toEqual(tokenBefore);
  });

  it("retries after the log compacted but the database summary update failed", async () => {
    const fixture = await createAuditFixture("database-retry");
    fixtures.push(fixture);
    const large = makeSummary(3_000, 32);
    const migrationId = TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID;
    const logPath = path.join(fixture.logsDir, "source.log");
    await fs.writeFile(logPath, large.json.repeat(2), "utf8");
    insertAuditRecord({ databasePath: fixture.databasePath, migrationId, summaryJson: large.json, logPath });
    const actual = new TokenUsageMigrationAuditCompactionRepository(fixture.prisma);
    let failDatabase = true;
    const failing: TokenUsageMigrationAuditCompactionRepositoryLike = {
      inspect: (id) => actual.inspect(id),
      replaceOversizedSummary: async (record, json) => {
        if (failDatabase) {
          failDatabase = false;
          throw new Error("injected database summary failure");
        }
        await actual.replaceOversizedSummary(record, json);
      },
    };
    const recordRepository = new AppDataMigrationRecordRepository(fixture.prisma);
    const firstRunner = new AppDataMigrationRunner(
      registryFor(new TokenUsageMigrationAuditCompactionV1AppDataMigration(
        failing,
        new TokenUsageMigrationAuditLogCompactor(fixture.logsDir),
      )),
      recordRepository,
      { logsDir: fixture.logsDir },
    );

    const first = await firstRunner.runPending();
    expect(first.at(-1)).toMatchObject({ status: "FAILED", attempts: 1, errorMessage: "injected database summary failure" });
    expect((await fs.stat(logPath)).size).toBeLessThanOrEqual(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);
    expect(Buffer.byteLength(readRawAuditRecord(fixture.databasePath, migrationId)!["summary_json"] as string, "utf8"))
      .toBeGreaterThan(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);

    const secondRunner = new AppDataMigrationRunner(
      registryFor(new TokenUsageMigrationAuditCompactionV1AppDataMigration(
        actual,
        new TokenUsageMigrationAuditLogCompactor(fixture.logsDir),
      )),
      recordRepository,
      { logsDir: fixture.logsDir },
    );
    const second = await secondRunner.runPending();
    expect(second.at(-1)).toMatchObject({ status: "SUCCEEDED", attempts: 2 });
    expect(Buffer.byteLength(readRawAuditRecord(fixture.databasePath, migrationId)!["summary_json"] as string, "utf8"))
      .toBeLessThanOrEqual(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);
  });

  it("retries an already-compacted source after terminal compactor-status persistence fails", async () => {
    const fixture = await createAuditFixture("terminal-status-retry");
    fixtures.push(fixture);
    const large = makeSummary(3_000, 32);
    const migrationId = TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID;
    insertAuditRecord({ databasePath: fixture.databasePath, migrationId, summaryJson: large.json });
    const actualRecords = new AppDataMigrationRecordRepository(fixture.prisma);
    let failCompletion = true;
    class TerminalFailureRepository extends ObservedRecordRepository {
      override async complete(input: Parameters<AppDataMigrationRecordRepository["complete"]>[0]) {
        if (failCompletion && input.migrationId === TOKEN_USAGE_MIGRATION_AUDIT_COMPACTION_V1_MIGRATION_ID &&
            input.status !== "FAILED") {
          failCompletion = false;
          throw new Error("injected terminal status persistence failure");
        }
        return super.complete(input);
      }
    }
    const firstRunner = new AppDataMigrationRunner(
      registryFor(new TokenUsageMigrationAuditCompactionV1AppDataMigration(
        new TokenUsageMigrationAuditCompactionRepository(fixture.prisma),
        new TokenUsageMigrationAuditLogCompactor(fixture.logsDir),
      )),
      new TerminalFailureRepository(actualRecords),
      { logsDir: fixture.logsDir },
    );
    const first = await firstRunner.runPending();
    expect(first.at(-1)).toMatchObject({ status: "FAILED", attempts: 1 });
    expect(Buffer.byteLength(readRawAuditRecord(fixture.databasePath, migrationId)!["summary_json"] as string, "utf8"))
      .toBeLessThanOrEqual(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);

    const second = await new AppDataMigrationRunner(
      registryFor(new TokenUsageMigrationAuditCompactionV1AppDataMigration(
        new TokenUsageMigrationAuditCompactionRepository(fixture.prisma),
        new TokenUsageMigrationAuditLogCompactor(fixture.logsDir),
      )),
      actualRecords,
      { logsDir: fixture.logsDir },
    ).runPending();
    expect(second.at(-1)).toMatchObject({ status: "SUCCEEDED", attempts: 2, summary: { migratedCount: 0 } });
  });

  it("preserves unsupported summaries as bounded terminal warnings and skips them later", async () => {
    const fixture = await createAuditFixture("terminal-warning");
    fixtures.push(fixture);
    const migrationId = TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID;
    const malformed = `{${"x".repeat(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES + 100)}`;
    insertAuditRecord({ databasePath: fixture.databasePath, migrationId, summaryJson: malformed });
    const actual = new TokenUsageMigrationAuditCompactionRepository(fixture.prisma);
    const inspect = vi.fn((id: string) => actual.inspect(id));
    const compactorRepository: TokenUsageMigrationAuditCompactionRepositoryLike = {
      inspect,
      replaceOversizedSummary: (record, json) => actual.replaceOversizedSummary(record, json),
    };
    const runner = new AppDataMigrationRunner(
      registryFor(new TokenUsageMigrationAuditCompactionV1AppDataMigration(
        compactorRepository,
        new TokenUsageMigrationAuditLogCompactor(fixture.logsDir),
      )),
      new AppDataMigrationRecordRepository(fixture.prisma),
      { logsDir: fixture.logsDir },
    );

    const first = await runner.runPending();
    expect(first.at(-1)).toMatchObject({
      status: "SUCCEEDED_WITH_WARNINGS",
      attempts: 1,
      canRetry: false,
    });
    expect(readRawAuditRecord(fixture.databasePath, migrationId)!["summary_json"]).toBe(malformed);
    const inspectionsAfterFirst = inspect.mock.calls.length;
    const second = await runner.runPending();
    expect(second.at(-1)).toMatchObject({
      status: "SUCCEEDED_WITH_WARNINGS",
      attempts: 1,
      canRetry: false,
    });
    expect(inspect).toHaveBeenCalledTimes(inspectionsAfterFirst);
  });

  it.each([
    ["wrong count shape", JSON.stringify({ scannedCount: "1", migratedCount: 0, skippedCount: 0, failedCount: 0, details: [] })],
    ["wrong details shape", JSON.stringify({ scannedCount: 1, migratedCount: 0, skippedCount: 0, failedCount: 0, details: {} })],
  ])("preserves %s with a warning", async (_name, summaryJson) => {
    const fixture = await createAuditFixture("wrong-shape");
    fixtures.push(fixture);
    const migrationId = TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID;
    insertAuditRecord({ databasePath: fixture.databasePath, migrationId, summaryJson });
    const result = await new TokenUsageMigrationAuditCompactionV1AppDataMigration(
      new TokenUsageMigrationAuditCompactionRepository(fixture.prisma),
      new TokenUsageMigrationAuditLogCompactor(fixture.logsDir),
    ).execute();
    expect(result).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", summary: { migratedCount: 0 } });
    expect(readRawAuditRecord(fixture.databasePath, migrationId)!["summary_json"]).toBe(summaryJson);
  });

  it("treats a missing owned log as a no-op and an outside log as a preserved warning", async () => {
    const fixture = await createAuditFixture("log-dispositions");
    fixtures.push(fixture);
    const summary = makeSummary(1).json;
    const missingPath = path.join(fixture.logsDir, "missing.log");
    insertAuditRecord({
      databasePath: fixture.databasePath,
      migrationId: TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID,
      summaryJson: summary,
      logPath: missingPath,
    });
    const outsidePath = path.join(fixture.directory, "outside.log");
    await fs.writeFile(outsidePath, "outside evidence", "utf8");
    insertAuditRecord({
      databasePath: fixture.databasePath,
      migrationId: TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID,
      summaryJson: summary,
      logPath: outsidePath,
    });
    const result = await new TokenUsageMigrationAuditCompactionV1AppDataMigration(
      new TokenUsageMigrationAuditCompactionRepository(fixture.prisma),
      new TokenUsageMigrationAuditLogCompactor(fixture.logsDir),
    ).execute();
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID, message: expect.stringContaining("missing") }),
      expect.objectContaining({ itemId: TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID, message: "log_unowned_path" }),
    ]));
    await expect(fs.readFile(outsidePath, "utf8")).resolves.toBe("outside evidence");
  });

  it("returns bounded warnings for non-regular and unwritable owned logs without replacing them", async () => {
    const fixture = await createAuditFixture("unwritable-log");
    fixtures.push(fixture);
    const record = {
      migrationId: "source",
      displayName: "Source",
      status: "SUCCEEDED" as const,
      attempts: 1,
      startedAt: new Date("2026-07-30T10:00:00Z"),
      completedAt: new Date("2026-07-30T10:30:00Z"),
      errorMessage: null,
      logPath: path.join(fixture.logsDir, "large.log"),
      summaryBytes: 100,
      summary: { counts: emptySummary, detailCount: 100_001 },
    };
    await fs.writeFile(record.logPath, "x".repeat(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES + 1), "utf8");
    const fileSystem = {
      lstat: fs.lstat,
      realpath: fs.realpath,
      writeFile: async () => { throw new Error("read-only fixture"); },
      rename: fs.rename,
      rm: fs.rm,
    };
    await expect(new TokenUsageMigrationAuditLogCompactor(fixture.logsDir, fileSystem).compact(record))
      .resolves.toEqual({ kind: "WARNING", reason: "UNREWRITABLE" });
    expect((await fs.stat(record.logPath)).size).toBeGreaterThan(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);

    const directoryPath = path.join(fixture.logsDir, "not-a-file");
    await fs.mkdir(directoryPath);
    await expect(new TokenUsageMigrationAuditLogCompactor(fixture.logsDir).compact({ ...record, logPath: directoryPath }))
      .resolves.toEqual({ kind: "WARNING", reason: "NOT_REGULAR" });
  });

  it("is registered between source shaping and consolidation without becoming a prerequisite or fatal gate", async () => {
    const definitions = new AppDataMigrationRegistry().listDefinitions();
    const ids = definitions.map(({ id }) => id);
    const compactorIndex = ids.indexOf(TOKEN_USAGE_MIGRATION_AUDIT_COMPACTION_V1_MIGRATION_ID);
    expect(compactorIndex).toBeGreaterThan(ids.indexOf(TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID));
    expect(compactorIndex).toBeLessThan(ids.indexOf(TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID));
    expect(definitions[compactorIndex]).toMatchObject({ requiredOnStartup: true, executionPolicy: "STARTUP_ONLY" });
    expect(definitions.find(({ id }) => id === TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID)?.prerequisiteMigrationIds)
      .not.toContain(TOKEN_USAGE_MIGRATION_AUDIT_COMPACTION_V1_MIGRATION_ID);
    const serverRuntime = await fs.readFile(path.resolve("src", "server-runtime.ts"), "utf8");
    expect(serverRuntime).not.toContain(TOKEN_USAGE_MIGRATION_AUDIT_COMPACTION_V1_MIGRATION_ID);
  });
});
