import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  LegacyTokenUsageConsolidationRepository,
  type LegacyTokenUsageConsolidationTransaction,
} from "../../../src/app-data-migrations/migrations/token-usage-run-records-v1/legacy-token-usage-consolidation-repository.js";
import {
  TokenUsageRunRecordsV1AppDataMigration,
} from "../../../src/app-data-migrations/migrations/token-usage-run-records-v1/token-usage-run-records-v1-app-data-migration.js";
import {
  buildTokenUsageRunSummaryFromRecords,
} from "../../../src/token-usage/projections/token-usage-run-aggregate.js";
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

const readMigration = (migrationId: string): Promise<string> => fs.readFile(
  path.resolve("prisma", "migrations", migrationId, "migration.sql"),
  "utf8",
);

const seedPreComponentUnknownRow = (database: DatabaseSync): void => database.exec(`
  INSERT INTO "token_usage_ledger_events" (
    "usage_event_id", "idempotency_key", "observed_at", "run_id", "runtime_kind",
    "model_provider", "model_identifier", "model_value", "ingestion_kind", "usage_scope",
    "reported_input_tokens", "reported_output_tokens", "reported_total_tokens",
    "accounting_input_tokens", "accounting_output_tokens", "accounting_total_tokens",
    "cache_read_input_tokens", "cache_creation_input_tokens", "reasoning_output_tokens",
    "billable_input_tokens", "billable_output_tokens", "cost_basis", "currency",
    "input_price_per_million", "output_price_per_million",
    "cached_input_read_price_per_million", "cached_input_write_price_per_million",
    "pricing_status", "estimated_api_input_cost", "estimated_api_standard_input_cost",
    "estimated_api_cache_read_input_cost", "estimated_api_cache_creation_input_cost",
    "estimated_api_output_cost", "estimated_api_reasoning_output_cost",
    "estimated_api_total_cost", "api_cost_status"
  ) VALUES (
    'pre-component-unknown', 'idem-pre-component-unknown', '2026-06-24T10:00:00.000Z',
    'unknown-input-run', 'autobyteus', 'OPENAI', 'gpt-released', 'gpt-released',
    'autobyteus_llm_phase', 'per_call', 100, 20, 120, 100, 20, 120, 40, 10, 5, 100, 20,
    'api_price_estimate', 'USD', 10, 20, 5, 8, 'trusted', 0.0007, 0.0005, 0.0001,
    0.0001, 0.0004, 0.0001, 0.0011, 'estimated'
  );
`);

const seedLaterRows = (database: DatabaseSync): void => database.exec(`
  INSERT INTO "token_usage_ledger_events" (
    "usage_event_id", "idempotency_key", "observed_at", "run_id", "runtime_kind",
    "model_provider", "model_identifier", "model_value", "ingestion_kind", "usage_scope",
    "input_token_semantic", "reported_input_tokens", "reported_output_tokens", "reported_total_tokens",
    "accounting_input_tokens", "accounting_output_tokens", "accounting_total_tokens",
    "standard_input_tokens", "cache_miss_input_tokens", "cache_read_input_tokens",
    "cache_creation_input_tokens", "cache_creation_5m_input_tokens", "cache_creation_1h_input_tokens",
    "cache_state", "reasoning_output_tokens", "billable_input_tokens", "billable_output_tokens",
    "cost_basis", "currency", "input_price_per_million", "output_price_per_million",
    "cached_input_read_price_per_million", "cached_input_write_price_per_million",
    "cached_input_write_5m_price_per_million", "cached_input_write_1h_price_per_million",
    "pricing_status", "missing_price_dimensions_json", "estimated_api_input_cost",
    "estimated_api_standard_input_cost", "estimated_api_cache_read_input_cost",
    "estimated_api_cache_creation_input_cost", "estimated_api_cache_creation_5m_input_cost",
    "estimated_api_cache_creation_1h_input_cost", "estimated_api_output_cost",
    "estimated_api_reasoning_output_cost", "estimated_api_total_cost", "api_cost_status"
  ) VALUES (
    'later-unknown', 'idem-later-unknown', '2026-06-26T10:00:00.000Z', 'unknown-input-run',
    'autobyteus', 'OPENAI', 'gpt-released', 'gpt-released', 'autobyteus_llm_phase', 'per_call',
    'unknown', 50, 5, 55, 50, 5, 55, 30, 30, 15, 5, 3, 2, 'positive', 2, 50, 5,
    'api_price_estimate', 'USD', 10, 20, 5, 8, 7, 6, 'trusted',
    '["provider_price","input_token_semantic"]', 0.0004, 0.0003, 0.00005, 0.00005,
    0.00003, 0.00002, 0.0002, 0.00005, 0.0008, 'estimated'
  );

  INSERT INTO "token_usage_ledger_events" (
    "usage_event_id", "idempotency_key", "observed_at", "run_id", "runtime_kind",
    "model_provider", "model_identifier", "model_value", "ingestion_kind", "usage_scope",
    "input_token_semantic", "reported_input_tokens", "reported_output_tokens", "reported_total_tokens",
    "accounting_input_tokens", "accounting_output_tokens", "accounting_total_tokens",
    "standard_input_tokens", "cache_miss_input_tokens", "cache_read_input_tokens",
    "cache_creation_input_tokens", "cache_creation_5m_input_tokens", "cache_creation_1h_input_tokens",
    "cache_state", "reasoning_output_tokens", "billable_input_tokens", "billable_output_tokens",
    "pricing_status", "missing_price_dimensions_json", "estimated_api_input_cost",
    "estimated_api_standard_input_cost", "estimated_api_output_cost", "estimated_api_total_cost",
    "api_cost_status"
  ) VALUES (
    'later-local', 'idem-later-local', '2026-06-26T11:00:00.000Z', 'local-unknown-input-run',
    'OLLAMA', 'OLLAMA', 'local-model', 'local-model', 'autobyteus_llm_phase', 'per_call',
    'unknown', 30, 4, 34, 30, 4, 34, 30, 30, 0, 0, 0, 0, 'unsupported_or_local', 0, 30, 4,
    'local_no_api_bill', '["local_existing"]', 0, 0, 0, 0, 'local_no_api_bill'
  );
`);

const createReleasedUpgradeDatabase = async (databasePath: string): Promise<void> => {
  const database = new DatabaseSync(databasePath);
  try {
    database.exec(await readMigration(schemaMigrations[0]));
    seedPreComponentUnknownRow(database);
    for (const migrationId of schemaMigrations.slice(1)) {
      database.exec(await readMigration(migrationId));
    }
    seedLaterRows(database);
  } finally {
    database.close();
  }
};

const seedWideFreelistRows = (databasePath: string, count: number): void => {
  const database = new DatabaseSync(databasePath);
  try {
    const insert = database.prepare(`
      INSERT INTO token_usage_ledger_events (
        usage_event_id, idempotency_key, observed_at, run_id, runtime_kind,
        model_provider, model_identifier, model_value, ingestion_kind, usage_scope,
        input_token_semantic, reported_input_tokens, reported_output_tokens,
        reported_total_tokens, accounting_input_tokens, accounting_output_tokens,
        accounting_total_tokens, standard_input_tokens, cache_miss_input_tokens,
        billable_input_tokens, billable_output_tokens, raw_event_json,
        pricing_status, api_cost_status
      ) VALUES (?, ?, ?, ?, 'autobyteus', 'OPENAI', 'gpt-freelist', 'gpt-freelist',
        'freelist-e2e', 'per_turn', 'gross_includes_cache', 1, 1, 2, 1, 1, 2, 1, 1, 1, 1,
        ?, 'missing', 'price_missing')
    `);
    const padding = "x".repeat(8 * 1024);
    database.exec("BEGIN");
    for (let index = 0; index < count; index += 1) {
      insert.run(
        `freelist-${index}`,
        `freelist-idem-${index}`,
        `2026-07-01T10:${String(index % 60).padStart(2, "0")}:00.000Z`,
        `freelist-run-${index % 4}`,
        JSON.stringify({ padding, index }),
      );
    }
    database.exec("COMMIT");
  } catch (error) {
    try { database.exec("ROLLBACK"); } catch { /* transaction did not start */ }
    throw error;
  } finally {
    database.close();
  }
};

const storageFacts = (databasePath: string): { pageCount: number; freelistCount: number; bytes: number } => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const pageCount = Number((database.prepare("PRAGMA page_count").get() as { page_count: number }).page_count);
    const freelistCount = Number((database.prepare("PRAGMA freelist_count").get() as { freelist_count: number }).freelist_count);
    return { pageCount, freelistCount, bytes: Number((database.prepare("PRAGMA page_size").get() as { page_size: number }).page_size) * pageCount };
  } finally {
    database.close();
  }
};

describe("TokenUsageRunRecordsV1AppDataMigration released unknown-input semantics", () => {
  it("normalizes direct-upgrade rows before validation, current persistence, and atomic cleanup", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "token-usage-run-records-v1-"));
    const databasePath = path.join(directory, "upgrade.sqlite");
    await createReleasedUpgradeDatabase(databasePath);
    const prisma = new PrismaClient({ datasourceUrl: `file:${databasePath}` });
    try {
      const migration = new TokenUsageRunRecordsV1AppDataMigration(
        new LegacyTokenUsageConsolidationRepository(prisma),
      );

      const result = await migration.execute();
      expect(result.errorMessage).toBeNull();
      expect(result).toMatchObject({
        status: "SUCCEEDED",
        summary: { scannedCount: 3, migratedCount: 2, failedCount: 0 },
      });
      await expect(prisma.tokenUsageLedgerEvent.count()).resolves.toBe(0);

      const repository = new SqlTokenUsageRunRepository(prisma);
      const unknownRecord = await repository.getByRunId("unknown-input-run");
      expect(unknownRecord).not.toBeNull();
      expect(unknownRecord!.tokenTotals).toMatchObject({
        accounting_input_tokens: 150n,
        accounting_output_tokens: 25n,
        accounting_total_tokens: 175n,
        standard_input_tokens: 0n,
        cache_miss_input_tokens: 0n,
        cache_read_input_tokens: 0n,
        cache_creation_input_tokens: 0n,
        cache_creation_5m_input_tokens: 0n,
        cache_creation_1h_input_tokens: 0n,
      });
      expect(unknownRecord!.costTotals).toMatchObject({
        estimated_api_input_cost: null,
        estimated_api_standard_input_cost: null,
        estimated_api_cache_read_input_cost: null,
        estimated_api_cache_creation_input_cost: null,
        estimated_api_cache_creation_5m_input_cost: null,
        estimated_api_cache_creation_1h_input_cost: null,
      });
      expect(unknownRecord!.costTotals.estimated_api_output_cost).toBeCloseTo(0.0006, 12);
      expect(unknownRecord!.costTotals.estimated_api_total_cost).toBeCloseTo(0.0006, 12);
      expect(unknownRecord).toMatchObject({
        usageReportCount: 2n,
        cacheState: "unknown",
        apiCostStatus: "partial_price_missing",
      });
      expect(unknownRecord!.pricingSummary.missingPriceDimensions).toEqual([
        "input_token_semantic",
        "provider_price",
        "standard_input_tokens",
      ]);

      const unknownSummary = buildTokenUsageRunSummaryFromRecords({
        runId: unknownRecord!.runId,
        records: [unknownRecord!],
      });
      expect(unknownSummary).toMatchObject({
        standard_input_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_state: "unknown",
        estimated_api_input_cost: null,
        api_cost_status: "partial_price_missing",
      });
      expect(unknownSummary.estimated_api_total_cost).toBeCloseTo(0.0006, 12);
      expect(unknownSummary.unit_prices.standard_input.status).toBe("not_applicable");
      expect(unknownSummary.unit_prices.output).toEqual({
        status: "single",
        price_per_million: 20,
      });

      const localRecord = await repository.getByRunId("local-unknown-input-run");
      expect(localRecord).not.toBeNull();
      expect(localRecord).toMatchObject({
        usageReportCount: 1n,
        cacheState: "unsupported_or_local",
        apiCostStatus: "local_no_api_bill",
      });
      expect(localRecord!.tokenTotals.standard_input_tokens).toBe(30n);
      expect(localRecord!.costTotals.estimated_api_input_cost).toBe(0);
      expect(localRecord!.pricingSummary.missingPriceDimensions).toEqual(["local_existing"]);

      const relaunched = await migration.execute();
      expect(relaunched).toMatchObject({
        status: "SUCCEEDED",
        summary: { scannedCount: 0, migratedCount: 0, failedCount: 0 },
      });
      await expect(prisma.tokenUsageRunRecord.count()).resolves.toBe(2);
    } finally {
      await prisma.$disconnect();
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it("rolls back an injected cleanup failure and succeeds through the same ordinary retry", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "token-usage-run-records-rollback-"));
    const databasePath = path.join(directory, "rollback.sqlite");
    await createReleasedUpgradeDatabase(databasePath);
    const prisma = new PrismaClient({ datasourceUrl: `file:${databasePath}` });
    try {
      const repository = new LegacyTokenUsageConsolidationRepository(prisma);
      const failingRepository = {
        runTransaction: <T>(work: (transaction: LegacyTokenUsageConsolidationTransaction) => Promise<T>): Promise<T> =>
          repository.runTransaction((transaction) => work(new Proxy(transaction, {
            get(target, property, receiver) {
              if (property === "deleteLegacyRows") {
                return async () => { throw new Error("injected cleanup failure"); };
              }
              const value = Reflect.get(target, property, receiver) as unknown;
              return typeof value === "function" ? value.bind(target) : value;
            },
          }))),
      };
      const failed = await new TokenUsageRunRecordsV1AppDataMigration(failingRepository as never).execute();
      expect(failed).toMatchObject({
        status: "FAILED",
        errorMessage: "injected cleanup failure",
        summary: { migratedCount: 0, failedCount: 1 },
      });
      await expect(prisma.tokenUsageLedgerEvent.count()).resolves.toBe(3);
      await expect(prisma.tokenUsageRunRecord.count()).resolves.toBe(0);

      const retried = await new TokenUsageRunRecordsV1AppDataMigration(repository).execute();
      expect(retried).toMatchObject({
        status: "SUCCEEDED",
        summary: { scannedCount: 3, migratedCount: 2, failedCount: 0 },
      });
      await expect(prisma.tokenUsageLedgerEvent.count()).resolves.toBe(0);
      await expect(prisma.tokenUsageRunRecord.count()).resolves.toBe(2);
    } finally {
      await prisma.$disconnect();
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it("returns deleted source pages to SQLite's freelist without shrinking or vacuuming the file", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "token-usage-run-records-freelist-"));
    const databasePath = path.join(directory, "freelist.sqlite");
    await createReleasedUpgradeDatabase(databasePath);
    seedWideFreelistRows(databasePath, 400);
    const before = storageFacts(databasePath);
    const prisma = new PrismaClient({ datasourceUrl: `file:${databasePath}` });
    try {
      const result = await new TokenUsageRunRecordsV1AppDataMigration(
        new LegacyTokenUsageConsolidationRepository(prisma),
      ).execute();
      expect(result).toMatchObject({
        status: "SUCCEEDED",
        summary: { scannedCount: 403, migratedCount: 6, failedCount: 0 },
      });
    } finally {
      await prisma.$disconnect();
    }
    try {
      const after = storageFacts(databasePath);
      expect(after.pageCount).toBeGreaterThanOrEqual(before.pageCount);
      expect(after.bytes).toBeGreaterThanOrEqual(before.bytes);
      expect(after.freelistCount).toBeGreaterThan(before.freelistCount);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});
