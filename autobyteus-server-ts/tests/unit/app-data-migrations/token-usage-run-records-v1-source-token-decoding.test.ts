import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  LegacyTokenUsageConsolidationRepository,
} from "../../../src/app-data-migrations/migrations/token-usage-run-records-v1/legacy-token-usage-consolidation-repository.js";
import {
  TokenUsageRunRecordsV1AppDataMigration,
} from "../../../src/app-data-migrations/migrations/token-usage-run-records-v1/token-usage-run-records-v1-app-data-migration.js";
import {
  cumulativeSnapshotTokenFields,
} from "../../../src/token-usage/projections/cumulative-snapshot-reconciliation-metadata.js";
import { SqlTokenUsageRunRepository } from "../../../src/token-usage/repositories/sql/token-usage-run-repository.js";

const schemaMigrations = [
  "20260624090000_add_token_usage_ledger_events",
  "20260625193000_token_usage_component_pricing_explainability",
  "20260629120000_add_token_usage_display_fields",
  "20260702093000_token_usage_execution_address",
  "20260730090000_add_token_usage_provider_name",
  "20260801090000_token_usage_member_display_name",
  "20260819090000_add_token_usage_run_records",
] as const;

type JsonSourceValue = null | number | string | boolean | readonly unknown[] | Readonly<Record<string, unknown>>;

const createDatabase = async (databasePath: string): Promise<void> => {
  const database = new DatabaseSync(databasePath);
  try {
    for (const migrationId of schemaMigrations) {
      database.exec(await fs.readFile(
        path.resolve("prisma", "migrations", migrationId, "migration.sql"),
        "utf8",
      ));
    }
  } finally {
    database.close();
  }
};

const sourceTokens = (reportedInputTokens: JsonSourceValue): Record<string, JsonSourceValue> =>
  Object.fromEntries(cumulativeSnapshotTokenFields.map((field) => [
    field,
    field === "reported_input_tokens" ? reportedInputTokens : null,
  ]));

const seedProductionShapedRows = (
  databasePath: string,
  values: readonly JsonSourceValue[],
): void => {
  const database = new DatabaseSync(databasePath);
  try {
    const insert = database.prepare(`
      INSERT INTO token_usage_ledger_events (
        usage_event_id, idempotency_key, observed_at, run_id, runtime_kind,
        model_provider, model_identifier, model_value, ingestion_kind, usage_scope,
        snapshot_series_key, input_token_semantic, reported_input_tokens,
        reported_output_tokens, reported_total_tokens, accounting_input_tokens,
        accounting_output_tokens, accounting_total_tokens, standard_input_tokens,
        cache_miss_input_tokens, cache_read_input_tokens, cache_creation_input_tokens,
        cache_creation_5m_input_tokens, cache_creation_1h_input_tokens, cache_state,
        reasoning_output_tokens, billable_input_tokens, billable_output_tokens,
        raw_event_json, pricing_status, api_cost_status
      ) VALUES (
        ?, ?, ?, 'production-shape-run', 'autobyteus', 'OPENAI',
        'gpt-production-shape', 'gpt-production-shape', 'autobyteus_llm_phase',
        'cumulative_snapshot', 'production-shape-series', 'gross_includes_cache',
        100, 20, 120, 100, 20, 120, 100, 100, 0, 0, 0, 0, 'zero_reported',
        0, 100, 20, ?, 'missing', 'price_missing'
      )
    `);
    database.exec("BEGIN");
    values.forEach((value, index) => insert.run(
      `production-shape-event-${index}`,
      `production-shape-idempotency-${index}`,
      `2026-08-18T10:00:${String(index).padStart(2, "0")}.000Z`,
      JSON.stringify({
        autobyteus_cumulative_snapshot_source_tokens: sourceTokens(value),
      }),
    ));
    database.exec("COMMIT");
  } catch (error) {
    try { database.exec("ROLLBACK"); } catch { /* transaction did not start */ }
    throw error;
  } finally {
    database.close();
  }
};

const sqliteSourceTypes = (databasePath: string): string[] => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return database.prepare(`
      SELECT typeof(json_extract(
        raw_event_json,
        '$.autobyteus_cumulative_snapshot_source_tokens.reported_input_tokens'
      )) AS source_type
      FROM token_usage_ledger_events
      ORDER BY id
    `).all().map((row) => (row as { source_type: string }).source_type);
  } finally {
    database.close();
  }
};

const withFixture = async (
  name: string,
  work: (databasePath: string, prisma: PrismaClient) => Promise<void>,
): Promise<void> => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), `token-usage-${name}-`));
  const databasePath = path.join(directory, "fixture.sqlite");
  await createDatabase(databasePath);
  const prisma = new PrismaClient({ datasourceUrl: `file:${databasePath}` });
  try {
    await work(databasePath, prisma);
  } finally {
    await prisma.$disconnect();
    await fs.rm(directory, { recursive: true, force: true });
  }
};

describe("token usage consolidation source-token decoding", () => {
  it("imports later JSON integers after four leading NULLs in the same real Prisma batch", async () => {
    await withFixture("source-json-leading-nulls", async (databasePath, prisma) => {
      const sourceValues = [null, null, null, null, 28_826_658, 28_987_545] as const;
      seedProductionShapedRows(databasePath, sourceValues);
      expect(sqliteSourceTypes(databasePath)).toEqual([
        "null", "null", "null", "null", "integer", "integer",
      ]);

      const repository = new LegacyTokenUsageConsolidationRepository(prisma);
      const projected = await repository.runTransaction((transaction) =>
        transaction.listLegacyRunBatch("production-shape-run", 0));
      expect(projected.map((row) => row.source_reported_input_tokens)).toEqual([
        null, null, null, null, "integer:28826658", "integer:28987545",
      ]);

      const result = await new TokenUsageRunRecordsV1AppDataMigration(repository).execute();
      expect(result).toMatchObject({
        status: "SUCCEEDED",
        errorMessage: null,
        summary: { scannedCount: 6, migratedCount: 1, failedCount: 0 },
      });
      await expect(prisma.tokenUsageLedgerEvent.count()).resolves.toBe(0);
      await expect(prisma.tokenUsageRunRecord.count()).resolves.toBe(1);

      const record = await new SqlTokenUsageRunRepository(prisma).getByRunId("production-shape-run");
      expect(record).toMatchObject({
        usageReportCount: 6n,
        tokenTotals: {
          accounting_input_tokens: 600n,
          accounting_output_tokens: 120n,
          accounting_total_tokens: 720n,
        },
      });
      expect(record?.snapshotSeriesState).toHaveLength(1);
      expect(record?.snapshotSeriesState[0]?.sourceTokens.reported_input_tokens).toBe(28_987_545n);
    });
  });

  it.each([
    { name: "JSON real", value: 1.5, transport: "real:1.5", reason: "has an unsupported JSON source type" },
    { name: "JSON text", value: "28826658", transport: "text:28826658", reason: "has an unsupported JSON source type" },
    { name: "JSON true", value: true, transport: "true:1", reason: "has an unsupported JSON source type" },
    { name: "JSON array", value: [1], transport: "array:[1]", reason: "has an unsupported JSON source type" },
    {
      name: "JSON object",
      value: { value: 1 },
      transport: "object:{\"value\":1}",
      reason: "has an unsupported JSON source type",
    },
    {
      name: "negative JSON integer",
      value: -1,
      transport: "integer:-1",
      reason: "is not a canonical nonnegative JSON integer",
    },
    {
      name: "integer above SafeInt",
      value: 9_007_199_254_740_992,
      transport: "integer:9007199254740992",
      reason: "exceeds JavaScript SafeInt",
    },
  ] as const)("rejects $name and rolls the real migration transaction back", async ({ value, transport, reason }) => {
    await withFixture("source-json-rejection", async (databasePath, prisma) => {
      seedProductionShapedRows(databasePath, [value]);
      const repository = new LegacyTokenUsageConsolidationRepository(prisma);
      const projected = await repository.runTransaction((transaction) =>
        transaction.listLegacyRunBatch("production-shape-run", 0));
      expect(projected[0]?.source_reported_input_tokens).toBe(transport);

      const migration = new TokenUsageRunRecordsV1AppDataMigration(repository);
      const expectedMessage = `Legacy token usage field 'source_reported_input_tokens' ${reason}.`;
      const failed = await migration.execute();
      expect(failed).toMatchObject({
        status: "FAILED",
        errorMessage: expectedMessage,
        summary: { scannedCount: 0, migratedCount: 0, failedCount: 1 },
      });
      await expect(prisma.tokenUsageLedgerEvent.count()).resolves.toBe(1);
      await expect(prisma.tokenUsageRunRecord.count()).resolves.toBe(0);

      const retried = await migration.execute();
      expect(retried).toMatchObject({ status: "FAILED", errorMessage: expectedMessage });
      await expect(prisma.tokenUsageLedgerEvent.count()).resolves.toBe(1);
      await expect(prisma.tokenUsageRunRecord.count()).resolves.toBe(0);
    });
  });
});
