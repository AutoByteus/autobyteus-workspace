import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildTokenUsageRunSummaryFromRecords } from "../../../src/token-usage/projections/token-usage-run-aggregate.js";
import { SqlTokenUsageRunRepository } from "../../../src/token-usage/repositories/sql/token-usage-run-repository.js";
import { emptyTokenUsageIdentitySummary } from "../../../src/token-usage/projections/token-usage-run-record-state.js";
import { emptyTokenUsagePricingSummary } from "../../../src/token-usage/projections/token-usage-pricing-summary.js";

const MIGRATION = "20261009120000_token_meter_context_readings";
const migrationsDir = path.resolve("prisma", "migrations");

const releasedMigrations = async (): Promise<string[]> =>
  (await fs.readdir(migrationsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name < MIGRATION)
    .map((entry) => entry.name)
    .sort();

const seedRun = (database: DatabaseSync, input: {
  runId: string; runtime: string; prompt: number; window: number; percent: number; tokens: number;
}): void => {
  database.prepare(`INSERT INTO "token_usage_run_records" (
    "run_id", "revision", "first_observed_at", "latest_observed_at", "latest_observation_generation",
    "latest_observation_ordinal", "usage_report_count", "accounting_input_tokens", "accounting_total_tokens",
    "standard_input_tokens", "pricing_summary_json", "quality_flags_json", "latest_runtime_kind",
    "identity_summary_json", "latest_prompt_tokens", "effective_context_window_tokens",
    "context_window_usage_percent", "snapshot_series_state_json", "recent_idempotency_digests_json"
  ) VALUES (?, 7, '2026-10-01T10:00:00.000Z', '2026-10-01T10:05:00.000Z', 1, 7, 7, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, '[]', '[]')`)
    .run(input.runId, input.tokens, input.tokens, input.tokens, JSON.stringify(emptyTokenUsagePricingSummary()),
      input.runtime, JSON.stringify(emptyTokenUsageIdentitySummary()), input.prompt, input.window, input.percent);
};

describe("token meter context readings migration (D-7, DEC-005)", () => {
  it("adds the threshold column and clears only pre-fix Claude SDK readings, leaving totals untouched", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "token-meter-context-readings-"));
    const databasePath = path.join(root, "released.sqlite");
    const database = new DatabaseSync(databasePath);
    try {
      for (const name of await releasedMigrations()) {
        database.exec(await fs.readFile(path.join(migrationsDir, name, "migration.sql"), "utf8"));
      }
      // Released shape: a multi-call Claude sum (402.5 %) and a healthy Codex reading.
      seedRun(database, { runId: "claude-run", runtime: "claude_agent_sdk", prompt: 4_025_193, window: 1_000_000, percent: 402.5193, tokens: 4_025_193 });
      seedRun(database, { runId: "codex-run", runtime: "codex_app_server", prompt: 92_942, window: 258_400, percent: 35.97, tokens: 144_357 });

      database.exec(await fs.readFile(path.join(migrationsDir, MIGRATION, "migration.sql"), "utf8"));

      expect(database.prepare('PRAGMA table_info("token_usage_run_records")').all())
        .toEqual(expect.arrayContaining([expect.objectContaining({ name: "context_compaction_threshold_tokens", notnull: 0 })]));
      const remaining = database.prepare(`SELECT COUNT(*) AS count FROM "token_usage_run_records"
        WHERE "latest_runtime_kind" = 'claude_agent_sdk' AND "latest_prompt_tokens" IS NOT NULL`).get() as { count: number };
      expect(remaining.count).toBe(0);
      const rows = database.prepare(`SELECT "run_id", "latest_prompt_tokens", "effective_context_window_tokens",
        "context_window_usage_percent", "context_compaction_threshold_tokens", "accounting_total_tokens", "usage_report_count", "revision"
        FROM "token_usage_run_records" ORDER BY "run_id"`).all();
      expect(rows).toEqual([
        { run_id: "claude-run", latest_prompt_tokens: null, effective_context_window_tokens: null,
          context_window_usage_percent: null, context_compaction_threshold_tokens: null,
          accounting_total_tokens: 4_025_193, usage_report_count: 7, revision: 7 },
        { run_id: "codex-run", latest_prompt_tokens: 92_942, effective_context_window_tokens: 258_400,
          context_window_usage_percent: 35.97, context_compaction_threshold_tokens: null,
          accounting_total_tokens: 144_357, usage_report_count: 7, revision: 7 },
      ]);
    } finally {
      database.close();
    }

    // The current reader projects the migrated rows without any old-shape branch.
    const client = new PrismaClient({ datasources: { db: { url: `file:${databasePath}` } } });
    try {
      const repository = new SqlTokenUsageRunRepository(client);
      const claude = await repository.getByRunId("claude-run");
      const summary = buildTokenUsageRunSummaryFromRecords({ runId: "claude-run", records: [claude!] });
      expect(summary).toMatchObject({ latest_prompt_tokens: null, context_window_usage_percent: null,
        context_compaction_threshold_tokens: null, revision: 7, total_tokens: 4_025_193 });
    } finally {
      await client.$disconnect();
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
