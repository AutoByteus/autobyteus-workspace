import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it } from "vitest";
import { MAX_APP_DATA_MIGRATION_SUMMARY_BYTES, STORED_SUMMARY_COUNTS_UNAVAILABLE_ITEM_ID, STORED_SUMMARY_DETAILS_OMITTED_ITEM_ID } from "../../../src/app-data-migrations/repositories/app-data-migration-summary-projection.js";
import { TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.js";
import { TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.js";
import {
  STORED_AUDIT_DETAILS_COMPACTED_ITEM_ID,
  TOKEN_USAGE_MIGRATION_AUDIT_COMPACTION_V1_MIGRATION_ID,
} from "../../../src/app-data-migrations/migrations/token-usage-migration-audit-compaction-v1/token-usage-migration-audit-compaction-v1-app-data-migration.js";
import { makeSummary } from "../../helpers/app-data-migration-audit-fixtures.js";
import {
  buildCurrentTokenUsagePayload,
  createCurrentTokenUsageTestHarness,
} from "../../helpers/token-usage-run-record-fixtures.js";
import {
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
  workspaceRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type DatabaseLocation = ReturnType<typeof resolveTestDatabaseLocation>;

type MigrationSummary = {
  scannedCount: number;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  details: Array<{ itemId: string; status: string; message: string | null }>;
};

type MigrationStatus = {
  migrationId: string;
  displayName: string;
  description: string;
  status: string;
  requiredOnStartup: boolean;
  canRetry: boolean;
  attempts: number;
  startedAt: string | null;
  completedAt: string | null;
  summary: MigrationSummary | null;
  errorMessage: string | null;
  logPath: string | null;
};

const sourceIds = [
  TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID,
  TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID,
] as const;
const frontendDocumentPath = path.join(
  workspaceRoot,
  "autobyteus-web",
  "graphql",
  "queries",
  "app_data_migrations_queries.ts",
);
const frontendDocumentSource = fs.readFileSync(frontendDocumentPath, "utf8");
const frontendQueryMatch = /export const GetAppDataMigrations = gql`([\s\S]*?)`/.exec(frontendDocumentSource);
if (!frontendQueryMatch) throw new Error("GET_APP_DATA_MIGRATIONS_FRONTEND_DOCUMENT_SOURCE_MISSING");
const frontendQuery = frontendQueryMatch[1];

const ownedServers = new Set<RunningTestServer>();
const ownedTargets: Array<{ runtimeRoot: string; database: DatabaseLocation }> = [];

const makeTarget = (label: string) => {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const runtimeRoot = path.join(testRuntimeRoot, `${label}-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/${label}-${suffix}.db`);
  ownedTargets.push({ runtimeRoot, database });
  return { runtimeRoot, database };
};

const stopOwned = async (server: RunningTestServer): Promise<void> => {
  if (!ownedServers.delete(server)) return;
  await server.stop();
};

const statusFor = (statuses: MigrationStatus[], migrationId: string): MigrationStatus => {
  const status = statuses.find((candidate) => candidate.migrationId === migrationId);
  if (!status) throw new Error(`MIGRATION_STATUS_MISSING:${migrationId}`);
  return status;
};

const queryFrontendMigrationDocument = async (serverUrl: string): Promise<MigrationStatus[]> => {
  const result = await executeGraphql<{ getAppDataMigrations: MigrationStatus[] }>(
    serverUrl,
    frontendQuery,
  );
  const statuses = result.getAppDataMigrations;
  for (const status of statuses) {
    if (status.summary !== null) {
      expect(Buffer.byteLength(JSON.stringify(status.summary), "utf8"))
        .toBeLessThanOrEqual(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);
    }
  }
  const fixedMetadataAllowance = 4 * 1024;
  expect(Buffer.byteLength(JSON.stringify({ data: result }), "utf8"))
    .toBeLessThanOrEqual(statuses.length * (MAX_APP_DATA_MIGRATION_SUMMARY_BYTES + fixedMetadataAllowance));
  return statuses;
};

const readRawRecord = (databasePath: string, migrationId: string): Record<string, unknown> => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const record = database.prepare(`
      SELECT migration_id, display_name, status, attempts, started_at, completed_at,
             summary_json, error_message, log_path
        FROM app_data_migration_records
       WHERE migration_id = ?
    `).get(migrationId) as Record<string, unknown> | undefined;
    if (!record) throw new Error(`RAW_MIGRATION_RECORD_MISSING:${migrationId}`);
    return record;
  } finally {
    database.close();
  }
};

const outcomeTuple = (record: Record<string, unknown>) => ({
  migrationId: record.migration_id,
  displayName: record.display_name,
  status: record.status,
  attempts: record.attempts,
  startedAt: record.started_at,
  completedAt: record.completed_at,
  errorMessage: record.error_message,
  logPath: record.log_path,
});

type OutcomeTuple = ReturnType<typeof outcomeTuple>;

const expectedCanonicalLog = (input: {
  tuple: OutcomeTuple;
  counts: Pick<MigrationSummary, "scannedCount" | "migratedCount" | "skippedCount" | "failedCount">;
  detailCount: number;
}): string => [
  `migrationId=${input.tuple.migrationId}`,
  `displayName=${input.tuple.displayName}`,
  `status=${input.tuple.status}`,
  `attempts=${input.tuple.attempts}`,
  `startedAt=${input.tuple.startedAt}`,
  `completedAt=${input.tuple.completedAt}`,
  `errorState=${input.tuple.errorMessage === null ? "absent" : "present"}`,
  `statusSummary=${JSON.stringify(input.counts)}`,
  `detailsOmitted=${input.detailCount}`,
  "reason=historical audit detail exceeded 65,536 bytes",
  "",
].join("\n");

const readTokenTables = (databasePath: string) => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return {
      legacy: database.prepare("SELECT * FROM token_usage_ledger_events ORDER BY id").all(),
      current: database.prepare("SELECT * FROM token_usage_run_records ORDER BY run_id").all(),
    };
  } finally {
    database.close();
  }
};

const seedCurrentTokenSentinel = async (database: DatabaseLocation, runId: string): Promise<void> => {
  const prisma = new PrismaClient({ datasources: { db: { url: database.databaseUrl } } });
  try {
    const { store } = createCurrentTokenUsageTestHarness(prisma);
    await store.recordObservation(buildCurrentTokenUsagePayload({
      runId,
      eventId: `${runId}-event`,
      inputTokens: 17,
      outputTokens: 5,
      totalCost: null,
      runCreatedAt: "2026-08-19T11:59:00.000Z",
    }));
  } finally {
    await prisma.$disconnect();
  }
};

const readTokenSummary = (serverUrl: string, runId: string) =>
  executeGraphql<{ getAgentRunTokenUsageSummary: Record<string, unknown> }>(serverUrl, `
    query AuditCompactionTokenHealth($runId: String!) {
      getAgentRunTokenUsageSummary(runId: $runId) {
        runId
        grossInputTokens
        outputTokens
        usageReportCount
      }
    }
  `, { runId });

const seedLargeTerminalSources = async (input: {
  databasePath: string;
  runtimeRoot: string;
}) => {
  const large = makeSummary(100_001, 48);
  expect(Buffer.byteLength(large.json, "utf8")).toBeGreaterThan(10 * 1024 * 1024);
  const logsDir = path.join(input.runtimeRoot, "logs", "app-data-migrations");
  fs.mkdirSync(logsDir, { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(input.databasePath);
  const logPaths = new Map<string, string>();
  try {
    for (const [index, migrationId] of sourceIds.entries()) {
      const logPath = path.join(logsDir, `${migrationId}-released.log`);
      fs.writeFileSync(logPath, `${large.json}\n`, { mode: 0o600 });
      expect(fs.statSync(logPath).size).toBeGreaterThan(10 * 1024 * 1024);
      const update = database.prepare(`
        UPDATE app_data_migration_records
           SET display_name = ?, status = ?, attempts = ?, started_at = ?, completed_at = ?,
               summary_json = ?, error_message = ?, log_path = ?
         WHERE migration_id = ?
      `).run(
        `Released terminal source ${index + 1}`,
        index === 0 ? "SUCCEEDED" : "SUCCEEDED_WITH_WARNINGS",
        index + 5,
        `2026-07-30T10:0${index}:00.000Z`,
        `2026-07-30T10:3${index}:00.000Z`,
        large.json,
        index === 0 ? null : "released bounded warning",
        logPath,
        migrationId,
      );
      expect(update.changes).toBe(1);
      logPaths.set(migrationId, logPath);
    }
    database.prepare("DELETE FROM app_data_migration_records WHERE migration_id = ?")
      .run(TOKEN_USAGE_MIGRATION_AUDIT_COMPACTION_V1_MIGRATION_ID);
  } finally {
    database.close();
  }
  return { large, logPaths };
};

afterEach(async () => {
  for (const server of [...ownedServers]) {
    if (server.child.exitCode === null) {
      await server.stop().catch(() => server.child.kill("SIGKILL"));
    }
    ownedServers.delete(server);
  }
  for (const target of ownedTargets.splice(0)) {
    await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }
});

describe("token usage migration audit compaction actual startup", () => {
  it("bounds the exact frontend document and compacts large terminal audits on built-server restart", async () => {
    const target = makeTarget("token-audit-compaction");
    const runId = "audit-compaction-current-token-sentinel";
    const first = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
    });
    ownedServers.add(first);

    await seedCurrentTokenSentinel(target.database, runId);
    const { large, logPaths } = await seedLargeTerminalSources({
      databasePath: target.database.databasePath,
      runtimeRoot: target.runtimeRoot,
    });
    const tuplesBefore = new Map(sourceIds.map((migrationId) => [
      migrationId,
      outcomeTuple(readRawRecord(target.database.databasePath, migrationId)),
    ]));
    const tokensBefore = readTokenTables(target.database.databasePath);
    expect(tokensBefore).toMatchObject({ legacy: [], current: [expect.objectContaining({ run_id: runId })] });

    const before = await queryFrontendMigrationDocument(first.serverUrl);
    for (const migrationId of sourceIds) {
      const source = statusFor(before, migrationId);
      expect(source.summary).toMatchObject({
        scannedCount: large.summary.scannedCount,
        migratedCount: large.summary.migratedCount,
        skippedCount: large.summary.skippedCount,
        failedCount: large.summary.failedCount,
        details: [{ itemId: STORED_SUMMARY_DETAILS_OMITTED_ITEM_ID, status: "SKIPPED" }],
      });
      expect(Buffer.byteLength(readRawRecord(target.database.databasePath, migrationId).summary_json as string, "utf8"))
        .toBeGreaterThan(10 * 1024 * 1024);
    }
    expect(await readTokenSummary(first.serverUrl, runId)).toMatchObject({
      getAgentRunTokenUsageSummary: {
        runId,
        grossInputTokens: 17,
        outputTokens: 5,
        usageReportCount: 1,
      },
    });
    await stopOwned(first);

    const second = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
    });
    ownedServers.add(second);
    const after = await queryFrontendMigrationDocument(second.serverUrl);
    expect(statusFor(after, TOKEN_USAGE_MIGRATION_AUDIT_COMPACTION_V1_MIGRATION_ID)).toMatchObject({
      status: "SUCCEEDED",
      attempts: 1,
      requiredOnStartup: true,
      canRetry: false,
      summary: { scannedCount: 2, migratedCount: 2, failedCount: 0 },
    });
    for (const migrationId of sourceIds) {
      const raw = readRawRecord(target.database.databasePath, migrationId);
      expect(outcomeTuple(raw)).toEqual(tuplesBefore.get(migrationId));
      expect(Buffer.byteLength(raw.summary_json as string, "utf8"))
        .toBeLessThanOrEqual(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);
      expect(JSON.parse(raw.summary_json as string)).toMatchObject({
        scannedCount: large.summary.scannedCount,
        migratedCount: large.summary.migratedCount,
        skippedCount: large.summary.skippedCount,
        failedCount: large.summary.failedCount,
        details: [{ itemId: STORED_AUDIT_DETAILS_COMPACTED_ITEM_ID, status: "SKIPPED" }],
      });
      expect(fs.statSync(logPaths.get(migrationId)!).size)
        .toBeLessThanOrEqual(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);
      expect(fs.readFileSync(logPaths.get(migrationId)!, "utf8")).toBe(expectedCanonicalLog({
        tuple: tuplesBefore.get(migrationId)!,
        counts: {
          scannedCount: large.summary.scannedCount,
          migratedCount: large.summary.migratedCount,
          skippedCount: large.summary.skippedCount,
          failedCount: large.summary.failedCount,
        },
        detailCount: 100_001,
      }));
    }
    expect(readTokenTables(target.database.databasePath)).toEqual(tokensBefore);
    expect(await readTokenSummary(second.serverUrl, runId)).toMatchObject({
      getAgentRunTokenUsageSummary: {
        runId,
        grossInputTokens: 17,
        outputTokens: 5,
        usageReportCount: 1,
      },
    });
    await stopOwned(second);

    const malformed = `{${"x".repeat(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES + 100)}`;
    const database = new DatabaseSync(target.database.databasePath);
    try {
      database.prepare("UPDATE app_data_migration_records SET summary_json = ? WHERE migration_id = ?")
        .run(malformed, sourceIds[0]);
      database.prepare("DELETE FROM app_data_migration_records WHERE migration_id = ?")
        .run(TOKEN_USAGE_MIGRATION_AUDIT_COMPACTION_V1_MIGRATION_ID);
    } finally {
      database.close();
    }

    const warningServer = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
    });
    ownedServers.add(warningServer);
    const warningStatuses = await queryFrontendMigrationDocument(warningServer.serverUrl);
    expect(statusFor(warningStatuses, sourceIds[0]).summary).toMatchObject({
      details: [{ itemId: STORED_SUMMARY_COUNTS_UNAVAILABLE_ITEM_ID, status: "SKIPPED" }],
    });
    expect(statusFor(warningStatuses, TOKEN_USAGE_MIGRATION_AUDIT_COMPACTION_V1_MIGRATION_ID)).toMatchObject({
      status: "SUCCEEDED_WITH_WARNINGS",
      attempts: 1,
      requiredOnStartup: true,
      canRetry: false,
    });
    expect(readRawRecord(target.database.databasePath, sourceIds[0]).summary_json).toBe(malformed);
    expect(readTokenTables(target.database.databasePath)).toEqual(tokensBefore);
    await expect(readTokenSummary(warningServer.serverUrl, runId)).resolves.toMatchObject({
      getAgentRunTokenUsageSummary: { runId, grossInputTokens: 17, outputTokens: 5 },
    });
  }, 420_000);
});
