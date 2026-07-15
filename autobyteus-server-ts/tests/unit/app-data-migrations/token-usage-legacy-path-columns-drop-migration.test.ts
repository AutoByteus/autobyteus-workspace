import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import type {
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationRecordSnapshot,
  AppDataMigrationStatus,
} from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import {
  PrismaTokenUsageExecutionAddressBackfillDatabase,
  TokenUsageExecutionAddressBackfillMigration,
} from "../../../src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.js";
import {
  PrismaTokenUsageLegacyPathColumnsDropDatabase,
  TOKEN_USAGE_EXECUTION_ADDRESS_BACKFILL_MIGRATION_ID,
  TOKEN_USAGE_LEGACY_PATH_COLUMNS_DROP_MIGRATION_ID,
  TokenUsageLegacyPathColumnsDropMigration,
} from "../../../src/app-data-migrations/migrations/token-usage-legacy-path-columns-drop-migration.js";

const TOKEN_USAGE_MIGRATION_SQL_FILES = [
  "20260517090000_add_app_data_migration_records/migration.sql",
  "20260624090000_add_token_usage_ledger_events/migration.sql",
  "20260625193000_token_usage_component_pricing_explainability/migration.sql",
  "20260629120000_add_token_usage_display_fields/migration.sql",
  "20260702093000_token_usage_execution_address/migration.sql",
];

type RawMigrationRecord = {
  migration_id: string;
  display_name: string;
  status: string;
  attempts: number;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  summary_json: string | null;
  error_message: string | null;
  log_path: string | null;
};

type TempDatabase = {
  tempDir: string;
  prisma: PrismaClient;
};

const tempDatabases: TempDatabase[] = [];

const toDate = (value: Date | string | null): Date | null => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

const toRecord = (row: RawMigrationRecord): AppDataMigrationRecordSnapshot => ({
  migrationId: row.migration_id,
  displayName: row.display_name,
  status: row.status as AppDataMigrationStatus,
  attempts: Number(row.attempts ?? 0),
  startedAt: toDate(row.started_at),
  completedAt: toDate(row.completed_at),
  summaryJson: row.summary_json,
  errorMessage: row.error_message,
  logPath: row.log_path,
});

class TempMigrationRecordRepository implements AppDataMigrationRecordRepositoryLike {
  constructor(private readonly prisma: PrismaClient) {}

  async getRecord(migrationId: string): Promise<AppDataMigrationRecordSnapshot | null> {
    const rows = await this.prisma.$queryRaw<RawMigrationRecord[]>`
      SELECT migration_id, display_name, status, attempts, started_at, completed_at, summary_json, error_message, log_path
      FROM app_data_migration_records
      WHERE migration_id = ${migrationId}
      LIMIT 1
    `;
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async listRecords(): Promise<AppDataMigrationRecordSnapshot[]> {
    const rows = await this.prisma.$queryRaw<RawMigrationRecord[]>`
      SELECT migration_id, display_name, status, attempts, started_at, completed_at, summary_json, error_message, log_path
      FROM app_data_migration_records
      ORDER BY migration_id ASC
    `;
    return rows.map(toRecord);
  }

  async markRunning(input: {
    migrationId: string;
    displayName: string;
    startedAt: Date;
  }): Promise<AppDataMigrationRecordSnapshot> {
    await this.prisma.$executeRaw`
      INSERT INTO app_data_migration_records
        (migration_id, display_name, status, attempts, started_at, completed_at, summary_json, error_message, log_path, updated_at)
      VALUES (${input.migrationId}, ${input.displayName}, 'RUNNING', 1, ${input.startedAt}, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP)
      ON CONFLICT(migration_id) DO UPDATE SET
        display_name = excluded.display_name,
        status = 'RUNNING',
        attempts = attempts + 1,
        started_at = excluded.started_at,
        completed_at = NULL,
        error_message = NULL,
        updated_at = CURRENT_TIMESTAMP
    `;
    const record = await this.getRecord(input.migrationId);
    if (!record) throw new Error(`Missing migration record ${input.migrationId}`);
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
    await this.prisma.$executeRaw`
      UPDATE app_data_migration_records
      SET display_name = ${input.displayName},
          status = ${input.status},
          completed_at = ${input.completedAt},
          summary_json = ${input.summaryJson},
          error_message = ${input.errorMessage},
          log_path = ${input.logPath},
          updated_at = CURRENT_TIMESTAMP
      WHERE migration_id = ${input.migrationId}
    `;
    const record = await this.getRecord(input.migrationId);
    if (!record) throw new Error(`Missing migration record ${input.migrationId}`);
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

afterEach(async () => {
  while (tempDatabases.length > 0) {
    const database = tempDatabases.pop()!;
    await database.prisma.$disconnect();
    await fs.rm(database.tempDir, { recursive: true, force: true });
  }
});

const executeSqlScript = async (prisma: PrismaClient, sql: string): Promise<void> => {
  for (const statement of sql.split(";").map((entry) => entry.trim()).filter(Boolean)) {
    await prisma.$executeRawUnsafe(statement);
  }
};

const createTempDatabase = async (): Promise<TempDatabase> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "token-usage-legacy-column-drop-"));
  const prisma = new PrismaClient({
    datasources: {
      db: { url: `file:${path.join(tempDir, "test.db")}` },
    },
  });
  for (const relativePath of TOKEN_USAGE_MIGRATION_SQL_FILES) {
    const sql = await fs.readFile(path.join(process.cwd(), "prisma", "migrations", relativePath), "utf-8");
    await executeSqlScript(prisma, sql);
  }
  const database = { tempDir, prisma };
  tempDatabases.push(database);
  return database;
};

const seedBackfillRecord = async (
  prisma: PrismaClient,
  status: AppDataMigrationStatus = "SUCCEEDED",
): Promise<void> => {
  await prisma.$executeRaw`
    INSERT INTO app_data_migration_records
      (migration_id, display_name, status, attempts, started_at, completed_at, summary_json, error_message, log_path)
    VALUES (
      ${TOKEN_USAGE_EXECUTION_ADDRESS_BACKFILL_MIGRATION_ID},
      'Token usage execution address backfill',
      ${status},
      1,
      '2026-07-03T10:00:00.000Z',
      '2026-07-03T10:00:01.000Z',
      '{}',
      NULL,
      NULL
    )
  `;
};

const seedTokenRow = async (prisma: PrismaClient, input: {
  usageEventId?: string;
  rootTeamRunId?: string | null;
  executionAddressJson?: string | null;
  memberRouteKey?: string | null;
  accountingTotalTokens?: number;
  estimatedTotalCost?: number;
} = {}): Promise<void> => {
  await prisma.$executeRaw`
    INSERT INTO token_usage_ledger_events (
      usage_event_id,
      idempotency_key,
      observed_at,
      run_id,
      root_team_run_id,
      team_run_path_json,
      member_path_json,
      member_route_key,
      execution_address_json,
      runtime_kind,
      ingestion_kind,
      usage_scope,
      pricing_status,
      api_cost_status,
      accounting_total_tokens,
      estimated_api_total_cost,
      team_name,
      agent_name
    ) VALUES (
      ${input.usageEventId ?? "usage-1"},
      ${input.usageEventId ?? "usage-1"},
      '2026-07-03T10:00:00.000Z',
      ${`run-${input.usageEventId ?? "1"}`},
      ${input.rootTeamRunId ?? "rootA"},
      '["legacy-root"]',
      '["legacy-member"]',
      ${input.memberRouteKey ?? "Teacher"},
      ${input.executionAddressJson ?? JSON.stringify({ segments: [{ kind: "member", memberRouteKey: "Teacher" }] })},
      'autobyteus',
      'autobyteus_llm_phase',
      'per_turn',
      'missing',
      'missing',
      ${input.accountingTotalTokens ?? 42},
      ${input.estimatedTotalCost ?? 0.125},
      'Team A',
      'Teacher Agent'
    )
  `;
};

const listTokenUsageColumns = async (prisma: PrismaClient): Promise<string[]> => {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info("token_usage_ledger_events")`,
  );
  return rows.map((row) => row.name);
};

const listTokenUsageIndexes = async (prisma: PrismaClient): Promise<string[]> => {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA index_list("token_usage_ledger_events")`,
  );
  return rows.map((row) => row.name);
};

const aggregateTokenRows = async (prisma: PrismaClient): Promise<{
  count: number;
  totalTokens: number;
  totalCost: number;
}> => {
  const rows = await prisma.$queryRaw<Array<{
    count: number | bigint;
    total_tokens: number | bigint | null;
    total_cost: number | null;
  }>>`
    SELECT
      COUNT(*) AS count,
      SUM(accounting_total_tokens) AS total_tokens,
      SUM(estimated_api_total_cost) AS total_cost
    FROM token_usage_ledger_events
  `;
  return {
    count: Number(rows[0]?.count ?? 0),
    totalTokens: Number(rows[0]?.total_tokens ?? 0),
    totalCost: Number(rows[0]?.total_cost ?? 0),
  };
};

describe("TokenUsageLegacyPathColumnsDropMigration", () => {
  it("is registered as a startup migration after execution-address backfill", () => {
    const definitions = new AppDataMigrationRegistry().listDefinitions();
    const definitionIds = definitions.map((definition) => definition.id);

    expect(definitions.find((definition) => definition.id === TOKEN_USAGE_LEGACY_PATH_COLUMNS_DROP_MIGRATION_ID))
      .toBeInstanceOf(TokenUsageLegacyPathColumnsDropMigration);
    expect(definitionIds.indexOf(TOKEN_USAGE_EXECUTION_ADDRESS_BACKFILL_MIGRATION_ID)).toBeGreaterThanOrEqual(0);
    expect(definitionIds.indexOf(TOKEN_USAGE_LEGACY_PATH_COLUMNS_DROP_MIGRATION_ID))
      .toBeGreaterThan(definitionIds.indexOf(TOKEN_USAGE_EXECUTION_ADDRESS_BACKFILL_MIGRATION_ID));
  });

  it("drops present legacy columns while preserving canonical columns, rows, totals, and indexes", async () => {
    const { prisma } = await createTempDatabase();
    await seedBackfillRecord(prisma, "SUCCEEDED_WITH_WARNINGS");
    await seedTokenRow(prisma, { usageEventId: "usage-preserve-1" });
    const beforeAggregate = await aggregateTokenRows(prisma);

    const result = await new TokenUsageLegacyPathColumnsDropMigration(
      new PrismaTokenUsageLegacyPathColumnsDropDatabase(prisma),
    ).execute();

    const columns = await listTokenUsageColumns(prisma);
    const indexes = await listTokenUsageIndexes(prisma);
    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary).toMatchObject({ scannedCount: 2, migratedCount: 2, skippedCount: 0, failedCount: 0 });
    expect(columns).not.toContain("team_run_path_json");
    expect(columns).not.toContain("member_path_json");
    expect(columns).toEqual(expect.arrayContaining(["root_team_run_id", "execution_address_json"]));
    expect(await aggregateTokenRows(prisma)).toEqual(beforeAggregate);
    expect(indexes).toEqual(expect.arrayContaining([
      "token_usage_ledger_events_usage_event_id_key",
      "token_usage_ledger_events_idempotency_key_key",
      "token_usage_ledger_events_root_team_run_id_observed_at_idx",
    ]));
  });

  it("no-ops already-absent legacy columns and only drops columns still present", async () => {
    const { prisma } = await createTempDatabase();
    await seedBackfillRecord(prisma);
    await prisma.$executeRawUnsafe(`ALTER TABLE "token_usage_ledger_events" DROP COLUMN "team_run_path_json"`);

    const firstRun = await new TokenUsageLegacyPathColumnsDropMigration(
      new PrismaTokenUsageLegacyPathColumnsDropDatabase(prisma),
    ).execute();
    const secondRun = await new TokenUsageLegacyPathColumnsDropMigration(
      new PrismaTokenUsageLegacyPathColumnsDropDatabase(prisma),
    ).execute();

    expect(firstRun.status).toBe("SUCCEEDED");
    expect(firstRun.summary).toMatchObject({ migratedCount: 1, skippedCount: 1, failedCount: 0 });
    expect(secondRun.status).toBe("SUCCEEDED");
    expect(secondRun.summary).toMatchObject({ migratedCount: 0, skippedCount: 2, failedCount: 0 });
    expect(await listTokenUsageColumns(prisma)).not.toEqual(
      expect.arrayContaining(["team_run_path_json", "member_path_json"]),
    );
  });

  it("fails clearly without a terminal-success execution-address backfill record and leaves schema unchanged", async () => {
    const missingRecordDb = await createTempDatabase();
    const missingRecordResult = await new TokenUsageLegacyPathColumnsDropMigration(
      new PrismaTokenUsageLegacyPathColumnsDropDatabase(missingRecordDb.prisma),
    ).execute();
    expect(missingRecordResult.status).toBe("FAILED");
    expect(missingRecordResult.errorMessage).toContain("requires terminal-success execution-address backfill");
    expect(await listTokenUsageColumns(missingRecordDb.prisma)).toEqual(
      expect.arrayContaining(["team_run_path_json", "member_path_json"]),
    );

    const failedRecordDb = await createTempDatabase();
    await seedBackfillRecord(failedRecordDb.prisma, "FAILED");
    const failedRecordResult = await new TokenUsageLegacyPathColumnsDropMigration(
      new PrismaTokenUsageLegacyPathColumnsDropDatabase(failedRecordDb.prisma),
    ).execute();
    expect(failedRecordResult.status).toBe("FAILED");
    expect(failedRecordResult.summary.details.map((entry) => entry.message).join("\n")).toContain(
      "Execution-address backfill prerequisite status: FAILED.",
    );
    expect(await listTokenUsageColumns(failedRecordDb.prisma)).toEqual(
      expect.arrayContaining(["team_run_path_json", "member_path_json"]),
    );
  });

  it("runs after pending backfill in startup order for skipped-version upgrades", async () => {
    const { tempDir, prisma } = await createTempDatabase();
    await seedTokenRow(prisma, {
      usageEventId: "usage-needs-backfill",
      rootTeamRunId: "rootPending",
      executionAddressJson: null,
      memberRouteKey: "Teacher",
    });
    const memoryDir = path.join(tempDir, "memory");
    await fs.mkdir(memoryDir, { recursive: true });
    const repository = new TempMigrationRecordRepository(prisma);
    const registry = new AppDataMigrationRegistry([
      new TokenUsageExecutionAddressBackfillMigration(
        memoryDir,
        new PrismaTokenUsageExecutionAddressBackfillDatabase(prisma),
      ),
      new TokenUsageLegacyPathColumnsDropMigration(
        new PrismaTokenUsageLegacyPathColumnsDropDatabase(prisma),
      ),
    ]);
    const runner = new AppDataMigrationRunner(registry, repository, {
      logsDir: path.join(tempDir, "logs"),
    });

    const statuses = await runner.runPending();
    const rows = await prisma.$queryRaw<Array<{
      root_team_run_id: string | null;
      execution_address_json: string | null;
    }>>`
      SELECT root_team_run_id, execution_address_json
      FROM token_usage_ledger_events
      WHERE usage_event_id = 'usage-needs-backfill'
    `;

    expect(statuses.map((status) => [status.migrationId, status.status])).toEqual([
      [TOKEN_USAGE_EXECUTION_ADDRESS_BACKFILL_MIGRATION_ID, "SUCCEEDED"],
      [TOKEN_USAGE_LEGACY_PATH_COLUMNS_DROP_MIGRATION_ID, "SUCCEEDED"],
    ]);
    expect(rows[0]).toEqual({
      root_team_run_id: "rootPending",
      execution_address_json: JSON.stringify({ segments: [{ kind: "member", memberRouteKey: "Teacher" }] }),
    });
    expect(await listTokenUsageColumns(prisma)).not.toEqual(
      expect.arrayContaining(["team_run_path_json", "member_path_json"]),
    );
  });
});
