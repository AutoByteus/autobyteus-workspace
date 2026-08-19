import { describe, expect, it } from "vitest";
import {
  TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID,
  TokenUsageCustomProviderModelValueBackfillMigration,
  type TokenUsageCustomProviderModelValueBackfillDatabase,
} from "../../../src/app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.js";

type Row = Awaited<ReturnType<TokenUsageCustomProviderModelValueBackfillDatabase["listCandidateBatch"]>>[number];
const row = (id: number, value = "openai-compatible:provider_A:org/model:tag"): Row => ({
  id,
  usage_event_id: `event-${id}`,
  runtime_kind: "autobyteus",
  model_provider: "OPENAI_COMPATIBLE",
  model_identifier: "openai-compatible:provider_A:org/model:tag",
  model_value: value,
});

class FakeDatabase implements TokenUsageCustomProviderModelValueBackfillDatabase {
  readonly batchSizes: number[] = [];
  failNextBatch = false;
  constructor(readonly rows: Row[]) {}
  async listCandidateBatch(afterId: number, limit: number): Promise<Row[]> {
    this.batchSizes.push(limit);
    return this.rows.filter((item) => item.id > afterId && item.model_value?.trim().startsWith("openai-compatible:"))
      .slice(0, limit).map((item) => ({ ...item }));
  }
  async countRows(): Promise<bigint> { return BigInt(this.rows.length); }
  async applyBatch(updates: readonly { id: number; expectedModelValue: string; nextModelValue: string }[]): Promise<number[]> {
    if (this.failNextBatch) { this.failNextBatch = false; throw new Error("synthetic batch failure"); }
    return updates.map((update) => {
      const target = this.rows.find((item) => item.id === update.id);
      if (!target || target.model_value !== update.expectedModelValue) return 0;
      target.model_value = update.nextModelValue;
      return 1;
    });
  }
}

describe("token usage custom-provider model value backfill", () => {
  it("keeps the released ID, uses bounded candidates, and retries idempotently", async () => {
    const database = new FakeDatabase([row(1), row(2, "ordinary-model")]);
    const migration = new TokenUsageCustomProviderModelValueBackfillMigration(database);
    expect(migration.id).toBe(TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID);
    await expect(migration.execute()).resolves.toMatchObject({ status: "SUCCEEDED" });
    expect(database.rows[0]?.model_value).toBe("org/model:tag");
    expect(database.batchSizes.every((size) => size <= 250)).toBe(true);
    await expect(migration.execute()).resolves.toMatchObject({ status: "SUCCEEDED" });
  });

  it("caps malformed-candidate evidence and keeps scalar skip counts", async () => {
    const database = new FakeDatabase(Array.from({ length: 70 }, (_, index) =>
      row(index + 1, "openai-compatible:malformed")));
    const result = await new TokenUsageCustomProviderModelValueBackfillMigration(database).execute();
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.skippedCount).toBe(70);
    expect(result.summary.details.length).toBeLessThanOrEqual(50);
  });

  it("returns failure after a transactional batch error and succeeds on normal retry", async () => {
    const database = new FakeDatabase([row(1), row(2)]);
    database.failNextBatch = true;
    const migration = new TokenUsageCustomProviderModelValueBackfillMigration(database);
    expect((await migration.execute()).status).toBe("FAILED");
    expect(database.rows.every((item) => item.model_value?.startsWith("openai-compatible:"))).toBe(true);
    expect((await migration.execute()).status).toBe("SUCCEEDED");
    expect(database.rows.every((item) => item.model_value === "org/model:tag")).toBe(true);
  });
});
