import "reflect-metadata";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { PrismaClient } from "@prisma/client";
import type { TokenUsageExecutionAddress } from "../../../src/token-usage/domain/execution-address.js";

const TOKEN_USAGE_MIGRATION_SQL_FILES = [
  "20260517090000_add_app_data_migration_records/migration.sql",
  "20260624090000_add_token_usage_ledger_events/migration.sql",
  "20260625193000_token_usage_component_pricing_explainability/migration.sql",
  "20260629120000_add_token_usage_display_fields/migration.sql",
  "20260702093000_token_usage_execution_address/migration.sql",
];

const TOKEN_USAGE_EXECUTION_ADDRESS_BACKFILL_MIGRATION_ID =
  "20260703_token_usage_execution_address_backfill";
const TOKEN_USAGE_LEGACY_PATH_COLUMNS_DROP_MIGRATION_ID =
  "20260703_drop_token_usage_legacy_path_columns";

type MigrationStatusResult = {
  getAppDataMigrations: Array<{
    migrationId: string;
    status: string;
    attempts: number;
    summary: {
      scannedCount: number;
      migratedCount: number;
      skippedCount: number;
      failedCount: number;
      details: Array<{ itemId: string; status: string; message: string; filePath?: string | null }>;
    } | null;
    errorMessage: string | null;
    logPath: string | null;
  }>;
};

type TaskRow = {
  rowKind: string;
  rootTeamRunId: string | null;
  memberRouteKey: string | null;
  executionAddress: TokenUsageExecutionAddress | null;
  aggregate: {
    totalTokens: number;
    estimatedApiTotalCost: number | null;
  };
  children: TaskRow[];
};

type TaskStatsResult = {
  totalCostInPeriod: number | null;
  tokenUsageTaskStatisticsInPeriod: { rows: TaskRow[] };
};

type RuntimeModules = {
  AppDataMigrationRegistry: typeof import("../../../src/app-data-migrations/app-data-migration-registry.js").AppDataMigrationRegistry;
  AppDataMigrationRunner: typeof import("../../../src/app-data-migrations/app-data-migration-runner.js").AppDataMigrationRunner;
  AppDataMigrationRecordRepository: typeof import("../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js").AppDataMigrationRecordRepository;
  PrismaTokenUsageExecutionAddressBackfillDatabase: typeof import("../../../src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.js").PrismaTokenUsageExecutionAddressBackfillDatabase;
  TokenUsageExecutionAddressBackfillMigration: typeof import("../../../src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.js").TokenUsageExecutionAddressBackfillMigration;
  PrismaTokenUsageLegacyPathColumnsDropDatabase: typeof import("../../../src/app-data-migrations/migrations/token-usage-legacy-path-columns-drop-migration.js").PrismaTokenUsageLegacyPathColumnsDropDatabase;
  TokenUsageLegacyPathColumnsDropMigration: typeof import("../../../src/app-data-migrations/migrations/token-usage-legacy-path-columns-drop-migration.js").TokenUsageLegacyPathColumnsDropMigration;
  buildGraphqlSchema: typeof import("../../../src/api/graphql/schema.js").buildGraphqlSchema;
};

const migrationStatusQuery = `
  query AppDataMigrationStatusForLegacyDrop {
    getAppDataMigrations {
      migrationId
      status
      attempts
      summary
      errorMessage
      logPath
    }
  }
`;

const taskStatsQuery = `
  query TokenUsageStatsAfterLegacyDrop($start: DateTime!, $end: DateTime!) {
    totalCostInPeriod(startTime: $start, endTime: $end)
    tokenUsageTaskStatisticsInPeriod(startTime: $start, endTime: $end) {
      rows {
        rowKind
        rootTeamRunId
        memberRouteKey
        executionAddress
        aggregate {
          totalTokens
          estimatedApiTotalCost
        }
        children {
          rowKind
          rootTeamRunId
          memberRouteKey
          executionAddress
          aggregate {
            totalTokens
            estimatedApiTotalCost
          }
          children {
            rowKind
            rootTeamRunId
            memberRouteKey
            executionAddress
            aggregate {
              totalTokens
              estimatedApiTotalCost
            }
          }
        }
      }
    }
  }
`;

let prisma: PrismaClient;
let tempRoot: string | null = null;
let runtime: RuntimeModules;
let schema: GraphQLSchema;
let graphql: typeof graphqlFn;
const createdUsageEventIds = new Set<string>();
const originalEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_TEST: process.env.DATABASE_URL_TEST,
  APP_ENV: process.env.APP_ENV,
  DB_TYPE: process.env.DB_TYPE,
  AUTOBYTEUS_MEMORY_DIR: process.env.AUTOBYTEUS_MEMORY_DIR,
  AUTOBYTEUS_LOG_DIR: process.env.AUTOBYTEUS_LOG_DIR,
  AUTOBYTEUS_SERVER_HOST: process.env.AUTOBYTEUS_SERVER_HOST,
};

const restoreOriginalEnv = (): void => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};

const executeSqlScript = async (client: PrismaClient, sql: string): Promise<void> => {
  for (const statement of sql.split(";").map((entry) => entry.trim()).filter(Boolean)) {
    await client.$executeRawUnsafe(statement);
  }
};

const initializeIsolatedRuntime = async (): Promise<void> => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "token-usage-legacy-drop-e2e-"));
  const dbPath = path.join(tempRoot, "db", "test.db");
  const memoryDir = path.join(tempRoot, "memory");
  const logsDir = path.join(tempRoot, "logs");
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.mkdir(memoryDir, { recursive: true });
  await fs.mkdir(logsDir, { recursive: true });
  const databaseUrl = `file:${dbPath.replace(/\\/g, "/")}`;

  process.env.DATABASE_URL = databaseUrl;
  process.env.DATABASE_URL_TEST = databaseUrl;
  process.env.APP_ENV = "test";
  process.env.DB_TYPE = "sqlite";
  process.env.AUTOBYTEUS_MEMORY_DIR = memoryDir;
  process.env.AUTOBYTEUS_LOG_DIR = logsDir;
  process.env.AUTOBYTEUS_SERVER_HOST = "http://localhost:8000";
  await fs.writeFile(
    path.join(tempRoot, ".env"),
    [
      "APP_ENV=test",
      "DB_TYPE=sqlite",
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000",
      `DATABASE_URL=${databaseUrl}`,
      `AUTOBYTEUS_MEMORY_DIR=${memoryDir}`,
      `AUTOBYTEUS_LOG_DIR=${logsDir}`,
      "",
    ].join("\n"),
    "utf-8",
  );

  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  for (const relativePath of TOKEN_USAGE_MIGRATION_SQL_FILES) {
    const sql = await fs.readFile(path.join(process.cwd(), "prisma", "migrations", relativePath), "utf-8");
    await executeSqlScript(prisma, sql);
  }

  vi.resetModules();
  const { appConfigProvider } = await import("../../../src/config/app-config-provider.js");
  appConfigProvider.resetForTests();
  appConfigProvider.initialize({ appDataDir: tempRoot }).initialize();
  const [
    registryModule,
    runnerModule,
    repositoryModule,
    backfillModule,
    dropModule,
    schemaModule,
  ] = await Promise.all([
    import("../../../src/app-data-migrations/app-data-migration-registry.js"),
    import("../../../src/app-data-migrations/app-data-migration-runner.js"),
    import("../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js"),
    import("../../../src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.js"),
    import("../../../src/app-data-migrations/migrations/token-usage-legacy-path-columns-drop-migration.js"),
    import("../../../src/api/graphql/schema.js"),
  ]);
  runtime = {
    AppDataMigrationRegistry: registryModule.AppDataMigrationRegistry,
    AppDataMigrationRunner: runnerModule.AppDataMigrationRunner,
    AppDataMigrationRecordRepository: repositoryModule.AppDataMigrationRecordRepository,
    PrismaTokenUsageExecutionAddressBackfillDatabase: backfillModule.PrismaTokenUsageExecutionAddressBackfillDatabase,
    TokenUsageExecutionAddressBackfillMigration: backfillModule.TokenUsageExecutionAddressBackfillMigration,
    PrismaTokenUsageLegacyPathColumnsDropDatabase: dropModule.PrismaTokenUsageLegacyPathColumnsDropDatabase,
    TokenUsageLegacyPathColumnsDropMigration: dropModule.TokenUsageLegacyPathColumnsDropMigration,
    buildGraphqlSchema: schemaModule.buildGraphqlSchema,
  };

  schema = await runtime.buildGraphqlSchema();
  const require = createRequire(import.meta.url);
  const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
  const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
  const graphqlModule = await import(graphqlPath);
  graphql = graphqlModule.graphql as typeof graphqlFn;
};

const deleteMigrationRecords = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(
    `DELETE FROM "app_data_migration_records" WHERE "migration_id" IN (?, ?)`,
    TOKEN_USAGE_EXECUTION_ADDRESS_BACKFILL_MIGRATION_ID,
    TOKEN_USAGE_LEGACY_PATH_COLUMNS_DROP_MIGRATION_ID,
  );
};

const listTokenUsageColumns = async (): Promise<string[]> => {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info("token_usage_ledger_events")`,
  );
  return rows.map((row) => row.name);
};

const listTokenUsageIndexes = async (): Promise<string[]> => {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA index_list("token_usage_ledger_events")`,
  );
  return rows.map((row) => row.name);
};

const aggregateCreatedRows = async (): Promise<{ count: number; totalTokens: number; totalCost: number }> => {
  const ids = [...createdUsageEventIds];
  if (ids.length === 0) return { count: 0, totalTokens: 0, totalCost: 0 };
  const placeholders = ids.map(() => "?").join(", ");
  const rows = await prisma.$queryRawUnsafe<Array<{
    count: number | bigint;
    total_tokens: number | bigint | null;
    total_cost: number | null;
  }>>(
    `SELECT COUNT(*) AS count,
            SUM("accounting_total_tokens") AS total_tokens,
            SUM("estimated_api_total_cost") AS total_cost
       FROM "token_usage_ledger_events"
      WHERE "usage_event_id" IN (${placeholders})`,
    ...ids,
  );
  return {
    count: Number(rows[0]?.count ?? 0),
    totalTokens: Number(rows[0]?.total_tokens ?? 0),
    totalCost: Number(rows[0]?.total_cost ?? 0),
  };
};

const insertHistoricalTokenRow = async (input: {
  usageEventId: string;
  runId: string;
  rootTeamRunId: string | null;
  memberRouteKey: string | null;
  executionAddress?: TokenUsageExecutionAddress | null;
  observedAt: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  memberName?: string | null;
}): Promise<void> => {
  createdUsageEventIds.add(input.usageEventId);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "token_usage_ledger_events" (
      "usage_event_id",
      "idempotency_key",
      "observed_at",
      "run_id",
      "root_team_run_id",
      "team_run_path_json",
      "member_agent_run_id",
      "member_path_json",
      "member_route_key",
      "execution_address_json",
      "runtime_kind",
      "model_provider",
      "model_identifier",
      "ingestion_kind",
      "usage_scope",
      "input_token_semantic",
      "reported_input_tokens",
      "reported_output_tokens",
      "reported_total_tokens",
      "accounting_input_tokens",
      "accounting_output_tokens",
      "accounting_total_tokens",
      "standard_input_tokens",
      "cache_miss_input_tokens",
      "cache_read_input_tokens",
      "cache_creation_input_tokens",
      "cache_state",
      "reasoning_output_tokens",
      "billable_output_tokens",
      "pricing_status",
      "api_cost_status",
      "currency",
      "estimated_api_input_cost",
      "estimated_api_standard_input_cost",
      "estimated_api_output_cost",
      "estimated_api_total_cost",
      "missing_price_dimensions_json",
      "team_name",
      "member_name"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'codex_app_server', 'OPENAI', 'gpt-legacy-drop-e2e',
      'codex_thread_token_usage', 'per_turn', 'gross_includes_cache', ?, ?, ?, ?, ?, ?, ?, ?, 0, 0,
      'not_reported', 0, ?, 'trusted', 'estimated', 'USD', ?, ?, ?, ?, '[]', 'Contract Test Team', ?)`,
    input.usageEventId,
    input.usageEventId,
    new Date(input.observedAt),
    input.runId,
    input.rootTeamRunId,
    JSON.stringify(["legacy-root", input.rootTeamRunId ?? input.runId]),
    input.rootTeamRunId ? input.runId : null,
    input.memberRouteKey ? JSON.stringify([input.memberRouteKey]) : null,
    input.memberRouteKey,
    input.executionAddress ? JSON.stringify(input.executionAddress) : null,
    input.inputTokens,
    input.outputTokens,
    input.inputTokens + input.outputTokens,
    input.inputTokens,
    input.outputTokens,
    input.inputTokens + input.outputTokens,
    input.inputTokens,
    input.inputTokens,
    input.outputTokens,
    input.totalCost - input.outputTokens / 1_000,
    input.totalCost - input.outputTokens / 1_000,
    input.outputTokens / 1_000,
    input.totalCost,
    input.memberName ?? input.memberRouteKey,
  );
};

const findMigration = (
  result: MigrationStatusResult,
  migrationId: string,
): MigrationStatusResult["getAppDataMigrations"][number] => {
  const migration = result.getAppDataMigrations.find((entry) => entry.migrationId === migrationId);
  expect(migration).toBeDefined();
  return migration!;
};

const findTopRow = (rows: TaskRow[], predicate: (row: TaskRow) => boolean): TaskRow => {
  const row = rows.find(predicate);
  expect(row).toBeDefined();
  return row!;
};

describe("token usage legacy path column drop startup E2E", () => {
  beforeAll(async () => {
    await initializeIsolatedRuntime();
  });

  afterAll(async () => {
    try {
      await prisma?.$disconnect();
    } finally {
      restoreOriginalEnv();
      vi.resetModules();
      if (tempRoot) await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };

  const makeRunner = (memoryDir: string, logsDir: string, includeBackfill: boolean): InstanceType<RuntimeModules["AppDataMigrationRunner"]> => {
    const definitions = [
      ...(includeBackfill
        ? [new runtime.TokenUsageExecutionAddressBackfillMigration(
          memoryDir,
          new runtime.PrismaTokenUsageExecutionAddressBackfillDatabase(prisma),
        )]
        : []),
      new runtime.TokenUsageLegacyPathColumnsDropMigration(
        new runtime.PrismaTokenUsageLegacyPathColumnsDropDatabase(prisma),
      ),
    ];
    return new runtime.AppDataMigrationRunner(
      new runtime.AppDataMigrationRegistry(definitions),
      new runtime.AppDataMigrationRecordRepository(prisma),
      { logsDir },
    );
  };

  it("records a clear failure and leaves schema unchanged when the backfill prerequisite has not succeeded", async () => {
    await deleteMigrationRecords();
    const columnsBefore = await listTokenUsageColumns();
    expect(columnsBefore).toEqual(expect.arrayContaining(["team_run_path_json", "member_path_json"]));

    const runner = makeRunner(path.join(tempRoot!, "memory-failure"), path.join(tempRoot!, "logs-failure"), false);
    let statuses: Awaited<ReturnType<typeof runner.runPending>> = [];
    try {
      await runner.runPending();
      throw new Error("Expected required migration aggregation to reject.");
    } catch (error) {
      expect(error).toMatchObject({
        code: "REQUIRED_APP_DATA_MIGRATION_FAILED",
      });
      statuses = (error as { results: Awaited<ReturnType<typeof runner.runPending>> }).results;
    }

    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toMatchObject({
      migrationId: TOKEN_USAGE_LEGACY_PATH_COLUMNS_DROP_MIGRATION_ID,
      status: "FAILED",
      summary: { scannedCount: 0, migratedCount: 0, skippedCount: 0, failedCount: 1 },
    });
    expect(statuses[0]!.errorMessage).toContain("requires terminal-success execution-address backfill");
    expect(await listTokenUsageColumns()).toEqual(columnsBefore);

    const statusResult = await execGraphql<MigrationStatusResult>(migrationStatusQuery);
    const failedDrop = findMigration(statusResult, TOKEN_USAGE_LEGACY_PATH_COLUMNS_DROP_MIGRATION_ID);
    expect(failedDrop).toMatchObject({
      status: "FAILED",
      attempts: 1,
      summary: { scannedCount: 0, migratedCount: 0, skippedCount: 0, failedCount: 1 },
    });
    expect(failedDrop.errorMessage).toContain("requires terminal-success execution-address backfill");
    const failureDetailText = failedDrop.summary!.details.map((detail) => detail.message).join("\n");
    expect(failureDetailText).toContain("Execution-address backfill prerequisite status: NOT_RUN.");
    expect(failedDrop.logPath).toBeTruthy();
    const failureLog = await fs.readFile(failedDrop.logPath!, "utf-8");
    expect(failureLog).toContain("requires terminal-success execution-address backfill");
    expect(failureLog).toContain("NOT_RUN");
  });

  it("runs backfill before the guarded contract drop, preserves token data, and keeps GraphQL statistics working", async () => {
    await deleteMigrationRecords();
    const suffix = randomUUID();
    const rootTeamRunId = `legacy-drop-root-${suffix}`;
    const start = new Date("2045-07-03T10:00:00.000Z");
    const end = new Date("2045-07-03T10:10:00.000Z");
    const memoryDir = path.join(tempRoot!, "memory-success");
    const logsDir = path.join(tempRoot!, "logs-success");
    await fs.mkdir(memoryDir, { recursive: true });

    expect(await listTokenUsageColumns()).toEqual(expect.arrayContaining(["team_run_path_json", "member_path_json"]));
    await insertHistoricalTokenRow({
      usageEventId: `legacy-drop-teacher-${suffix}`,
      runId: `teacher-${suffix}`,
      rootTeamRunId,
      memberRouteKey: "Teacher",
      observedAt: "2045-07-03T10:01:00.000Z",
      inputTokens: 50,
      outputTokens: 5,
      totalCost: 0.55,
      memberName: "Teacher",
    });
    await insertHistoricalTokenRow({
      usageEventId: `legacy-drop-reviewer-${suffix}`,
      runId: `reviewer-${suffix}`,
      rootTeamRunId,
      memberRouteKey: "Reviewer",
      executionAddress: { segments: [{ kind: "member", memberRouteKey: "Reviewer" }] },
      observedAt: "2045-07-03T10:02:00.000Z",
      inputTokens: 20,
      outputTokens: 2,
      totalCost: 0.22,
      memberName: "Reviewer",
    });
    const beforeAggregate = await aggregateCreatedRows();

    const runner = makeRunner(memoryDir, logsDir, true);
    const statuses = await runner.runPending();

    expect(statuses.map((status) => [status.migrationId, status.status])).toEqual([
      [TOKEN_USAGE_EXECUTION_ADDRESS_BACKFILL_MIGRATION_ID, "SUCCEEDED"],
      [TOKEN_USAGE_LEGACY_PATH_COLUMNS_DROP_MIGRATION_ID, "SUCCEEDED"],
    ]);
    expect(statuses[0]).toMatchObject({
      summary: { scannedCount: 2, migratedCount: 1, skippedCount: 1, failedCount: 0 },
    });
    expect(statuses[1]).toMatchObject({
      summary: { scannedCount: 2, migratedCount: 2, skippedCount: 0, failedCount: 0 },
    });

    const columnsAfter = await listTokenUsageColumns();
    expect(columnsAfter).not.toContain("team_run_path_json");
    expect(columnsAfter).not.toContain("member_path_json");
    expect(columnsAfter).toEqual(expect.arrayContaining(["root_team_run_id", "execution_address_json"]));
    expect(await aggregateCreatedRows()).toEqual(beforeAggregate);
    expect(await listTokenUsageIndexes()).toEqual(expect.arrayContaining([
      "token_usage_ledger_events_usage_event_id_key",
      "token_usage_ledger_events_idempotency_key_key",
      "token_usage_ledger_events_root_team_run_id_observed_at_idx",
    ]));

    const migratedRows = await prisma.$queryRaw<Array<{
      usage_event_id: string;
      root_team_run_id: string | null;
      execution_address_json: string | null;
    }>>`
      SELECT "usage_event_id", "root_team_run_id", "execution_address_json"
      FROM "token_usage_ledger_events"
      WHERE "usage_event_id" IN (${`legacy-drop-teacher-${suffix}`}, ${`legacy-drop-reviewer-${suffix}`})
    `;
    const rowByUsageEventId = new Map(migratedRows.map((row) => [row.usage_event_id, row]));
    expect(rowByUsageEventId.get(`legacy-drop-teacher-${suffix}`)!.root_team_run_id).toBe(rootTeamRunId);
    expect(JSON.parse(rowByUsageEventId.get(`legacy-drop-teacher-${suffix}`)!.execution_address_json!)).toEqual({
      segments: [{ kind: "member", memberRouteKey: "Teacher" }],
    });
    expect(JSON.parse(rowByUsageEventId.get(`legacy-drop-reviewer-${suffix}`)!.execution_address_json!)).toEqual({
      segments: [{ kind: "member", memberRouteKey: "Reviewer" }],
    });

    const stats = await execGraphql<TaskStatsResult>(taskStatsQuery, { start, end });
    expect(stats.totalCostInPeriod).toBeCloseTo(beforeAggregate.totalCost, 10);
    const rootRow = findTopRow(
      stats.tokenUsageTaskStatisticsInPeriod.rows,
      (row) => row.rootTeamRunId === rootTeamRunId,
    );
    expect(rootRow).toMatchObject({
      rowKind: "TEAM_RUN",
      aggregate: { totalTokens: beforeAggregate.totalTokens, estimatedApiTotalCost: beforeAggregate.totalCost },
    });
    expect(rootRow.children).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rowKind: "MEMBER_RUN",
        memberRouteKey: "Teacher",
        executionAddress: { segments: [{ kind: "member", memberRouteKey: "Teacher" }] },
      }),
      expect.objectContaining({
        rowKind: "MEMBER_RUN",
        memberRouteKey: "Reviewer",
        executionAddress: { segments: [{ kind: "member", memberRouteKey: "Reviewer" }] },
      }),
    ]));

    const statusResult = await execGraphql<MigrationStatusResult>(migrationStatusQuery);
    const backfillStatus = findMigration(statusResult, TOKEN_USAGE_EXECUTION_ADDRESS_BACKFILL_MIGRATION_ID);
    const dropStatus = findMigration(statusResult, TOKEN_USAGE_LEGACY_PATH_COLUMNS_DROP_MIGRATION_ID);
    expect(backfillStatus).toMatchObject({
      status: "SUCCEEDED",
      attempts: 1,
      summary: { scannedCount: 2, migratedCount: 1, skippedCount: 1, failedCount: 0 },
    });
    expect(dropStatus).toMatchObject({
      status: "SUCCEEDED",
      attempts: 1,
      summary: { scannedCount: 2, migratedCount: 2, skippedCount: 0, failedCount: 0 },
    });
    const dropDetailText = dropStatus.summary!.details.map((detail) => detail.message).join("\n");
    expect(dropDetailText).toContain("Execution-address backfill prerequisite status: SUCCEEDED.");
    expect(dropDetailText).toContain("Dropped obsolete token usage ledger column 'team_run_path_json'.");
    expect(dropDetailText).toContain("Dropped obsolete token usage ledger column 'member_path_json'.");
    expect(dropDetailText).toContain("Token usage ledger row count preserved");
    expect(dropStatus.logPath).toBeTruthy();
    const dropLog = await fs.readFile(dropStatus.logPath!, "utf-8");
    expect(dropLog).toContain("team_run_path_json");
    expect(dropLog).toContain("member_path_json");
    expect(dropLog).toContain('"migratedCount":2');
  });
});
