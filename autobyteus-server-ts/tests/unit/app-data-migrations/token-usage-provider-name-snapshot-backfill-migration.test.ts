import { describe, expect, it } from "vitest";
import {
  TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID,
  TokenUsageProviderNameSnapshotBackfillMigration,
  type RawTokenUsageProviderNameBackfillRow,
  type TokenUsageProviderNameSnapshotBackfillDatabase,
} from "../../../src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.js";

const row = (id: number, input: Partial<RawTokenUsageProviderNameBackfillRow> = {}): RawTokenUsageProviderNameBackfillRow => ({
  id,
  usage_event_id: `event-${id}`,
  runtime_kind: "autobyteus",
  model_provider: "OPENAI_COMPATIBLE",
  provider_name: null,
  model_identifier: "openai-compatible:provider_A:org/model:tag",
  ...input,
});

class FakeDatabase implements TokenUsageProviderNameSnapshotBackfillDatabase {
  readonly batchSizes: number[] = [];
  failNextBatch = false;
  constructor(readonly rows: RawTokenUsageProviderNameBackfillRow[]) {}
  async listCandidateBatch(afterId: number, limit: number): Promise<RawTokenUsageProviderNameBackfillRow[]> {
    this.batchSizes.push(limit);
    return this.rows.filter((item) => item.id > afterId && item.runtime_kind.toLowerCase() === "autobyteus" && !item.provider_name?.trim())
      .slice(0, limit).map((item) => ({ ...item }));
  }
  async countRows(): Promise<bigint> { return BigInt(this.rows.length); }
  async applyBatch(updates: readonly { id: number; expectedProviderName: string | null; nextProviderName: string }[]): Promise<number[]> {
    if (this.failNextBatch) { this.failNextBatch = false; throw new Error("synthetic batch failure"); }
    return updates.map((update) => {
      const target = this.rows.find((item) => item.id === update.id);
      if (!target || target.provider_name !== update.expectedProviderName || target.provider_name?.trim()) return 0;
      target.provider_name = update.nextProviderName;
      return 1;
    });
  }
}
const names = { read: async () => [{ id: "provider_A", name: "Alibaba Cloud" }] };

describe("token usage provider-name snapshot backfill", () => {
  it("keeps the released ID and changes only bounded SQL-scope candidates", async () => {
    const database = new FakeDatabase([
      row(1),
      row(2, { runtime_kind: "codex_app_server" }),
      row(3, { provider_name: "Existing" }),
    ]);
    const migration = new TokenUsageProviderNameSnapshotBackfillMigration(database, names);
    expect(migration.id).toBe(TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID);
    const result = await migration.execute();
    expect(result).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 1, migratedCount: 1 } });
    expect(database.rows.map((item) => item.provider_name)).toEqual(["Alibaba Cloud", null, "Existing"]);
    expect(database.batchSizes.every((size) => size <= 250)).toBe(true);
  });

  it("uses bounded evidence for unrecoverable candidates", async () => {
    const database = new FakeDatabase(Array.from({ length: 70 }, (_, index) =>
      row(index + 1, { model_identifier: "malformed" })));
    const result = await new TokenUsageProviderNameSnapshotBackfillMigration(database, names).execute();
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.skippedCount).toBe(70);
    expect(result.summary.details.length).toBeLessThanOrEqual(50);
  });

  it("fails if the provider snapshot is unavailable and retries a failed batch", async () => {
    const database = new FakeDatabase([row(1)]);
    const unavailable = await new TokenUsageProviderNameSnapshotBackfillMigration(database, {
      read: async () => { throw new Error("provider map unavailable"); },
    }).execute();
    expect(unavailable).toMatchObject({ status: "FAILED", summary: { scannedCount: 0 } });

    database.failNextBatch = true;
    const migration = new TokenUsageProviderNameSnapshotBackfillMigration(database, names);
    expect((await migration.execute()).status).toBe("FAILED");
    expect(database.rows[0]?.provider_name).toBeNull();
    expect((await migration.execute()).status).toBe("SUCCEEDED");
  });
});
