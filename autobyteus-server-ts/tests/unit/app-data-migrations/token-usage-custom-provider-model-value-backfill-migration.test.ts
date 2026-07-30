import { describe, expect, it } from "vitest";
import {
  TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID,
  TokenUsageCustomProviderModelValueBackfillMigration,
  type RawTokenUsageCustomProviderModelValueRow,
  type TokenUsageCustomProviderModelValueBackfillDatabase,
} from "../../../src/app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.js";

const row = (input: Partial<RawTokenUsageCustomProviderModelValueRow> = {}): RawTokenUsageCustomProviderModelValueRow => ({
  id: input.id ?? 1,
  usage_event_id: input.usage_event_id ?? `event-${input.id ?? 1}`,
  runtime_kind: input.runtime_kind ?? "autobyteus",
  model_provider: input.model_provider ?? "OPENAI_COMPATIBLE",
  model_identifier: input.model_identifier ?? "openai-compatible:provider_A:org/model:tag",
  model_value: input.model_value ?? "openai-compatible:provider_A:org/model:tag",
});

class FakeDatabase implements TokenUsageCustomProviderModelValueBackfillDatabase {
  rows: RawTokenUsageCustomProviderModelValueRow[];
  failures = new Set<number>();

  constructor(rows: RawTokenUsageCustomProviderModelValueRow[]) {
    this.rows = rows.map((value) => ({ ...value }));
  }

  async listTokenUsageLedgerRows(): Promise<RawTokenUsageCustomProviderModelValueRow[]> {
    return this.rows.map((value) => ({ ...value }));
  }

  async countTokenUsageLedgerRows(): Promise<number> {
    return this.rows.length;
  }

  async updateTokenUsageModelValue(input: {
    id: number;
    expectedModelValue: string;
    nextModelValue: string;
  }): Promise<number> {
    if (this.failures.has(input.id)) throw new Error("synthetic update failure");
    const target = this.rows.find((value) => value.id === input.id);
    if (!target || target.model_value !== input.expectedModelValue) return 0;
    target.model_value = input.nextModelValue;
    return 1;
  }
}

describe("token usage custom-provider model value backfill migration", () => {
  it("uses the fixed ID, preserves raw identity, and is idempotent", async () => {
    const database = new FakeDatabase([row()]);
    const migration = new TokenUsageCustomProviderModelValueBackfillMigration(database);

    expect(migration.id).toBe(TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID);
    await expect(migration.execute()).resolves.toMatchObject({ status: "SUCCEEDED" });
    expect(database.rows[0]).toMatchObject({
      model_identifier: "openai-compatible:provider_A:org/model:tag",
      model_value: "org/model:tag",
    });
    await expect(migration.execute()).resolves.toMatchObject({ status: "SUCCEEDED" });
  });

  it("returns warnings for unsafe rows and keeps valid non-composites safe", async () => {
    const database = new FakeDatabase([
      row({ id: 1 }),
      row({ id: 2, model_value: "openai-compatible:provider_A" }),
      row({ id: 3, model_value: "org/model:tag" }),
      row({ id: 4, model_identifier: "short-model" }),
      row({ id: 5, runtime_kind: "codex_app_server" }),
    ]);
    const result = await new TokenUsageCustomProviderModelValueBackfillMigration(database).execute();

    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.migratedCount).toBe(1);
    expect(result.summary.scannedCount).toBe(5);
    expect(result.summary.details.some((detail) => detail.message.includes("SKIPPED_INVALID_COMPOSITE_MODEL_VALUE"))).toBe(true);
    expect(result.summary.details.some((detail) => detail.message.includes("SKIPPED_SCOPE_MISMATCH"))).toBe(true);
  });

  it("continues after an independent row failure and retries only unresolved rows", async () => {
    const database = new FakeDatabase([row({ id: 1 }), row({ id: 2 }), row({ id: 3 })]);
    database.failures.add(2);
    const migration = new TokenUsageCustomProviderModelValueBackfillMigration(database);

    const failed = await migration.execute();
    expect(failed.status).toBe("FAILED");
    expect(failed.summary.migratedCount).toBe(2);
    expect(database.rows.map((value) => value.model_value)).toEqual([
      "org/model:tag",
      "openai-compatible:provider_A:org/model:tag",
      "org/model:tag",
    ]);

    database.failures.clear();
    const retried = await migration.execute();
    expect(retried.status).toBe("SUCCEEDED");
    expect(retried.summary.migratedCount).toBe(1);
  });
});
