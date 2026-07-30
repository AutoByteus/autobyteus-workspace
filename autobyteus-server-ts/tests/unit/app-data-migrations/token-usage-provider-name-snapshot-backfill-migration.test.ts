import { describe, expect, it } from "vitest";
import {
  TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID,
  TokenUsageProviderNameSnapshotBackfillMigration,
  type RawTokenUsageProviderNameBackfillRow,
  type TokenUsageProviderNameSnapshotBackfillDatabase,
} from "../../../src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.js";

const row = (input: Partial<RawTokenUsageProviderNameBackfillRow> = {}): RawTokenUsageProviderNameBackfillRow => ({
  id: input.id ?? 1,
  usage_event_id: input.usage_event_id ?? `event-${input.id ?? 1}`,
  runtime_kind: input.runtime_kind ?? "autobyteus",
  model_provider: input.model_provider ?? "OPENAI_COMPATIBLE",
  provider_name: input.provider_name ?? null,
  model_identifier: input.model_identifier ?? "openai-compatible:provider_A:org/model:tag",
  model_value: input.model_value ?? "org/model:tag",
});

class FakeDatabase implements TokenUsageProviderNameSnapshotBackfillDatabase {
  rows: RawTokenUsageProviderNameBackfillRow[];
  failures = new Set<number>();
  casZero = new Set<number>();

  constructor(rows: RawTokenUsageProviderNameBackfillRow[]) {
    this.rows = rows.map((value) => ({ ...value }));
  }

  async listTokenUsageLedgerRows(): Promise<RawTokenUsageProviderNameBackfillRow[]> {
    return this.rows.map((value) => ({ ...value }));
  }

  async listTokenUsageProviderNameBackfillCandidates(): Promise<RawTokenUsageProviderNameBackfillRow[]> {
    return this.rows
      .filter((value) => !value.provider_name?.trim())
      .map((value) => ({ ...value }));
  }

  async countTokenUsageLedgerRows(): Promise<number> {
    return this.rows.length;
  }

  async updateTokenUsageProviderName(input: {
    id: number;
    expectedProviderName: string | null;
    nextProviderName: string;
  }): Promise<number> {
    if (this.failures.has(input.id)) throw new Error("synthetic update failure");
    if (this.casZero.has(input.id)) return 0;
    const target = this.rows.find((value) => value.id === input.id);
    if (!target || target.provider_name !== input.expectedProviderName || target.provider_name?.trim()) return 0;
    target.provider_name = input.nextProviderName;
    return 1;
  }
}

const providerStore = (providers: Array<{ id: string; name: string }> = [{ id: "provider_A", name: "Alibaba Cloud" }]) => ({
  listProviders: async () => providers.map((provider) => ({
    ...provider,
    providerType: "OPENAI_COMPATIBLE" as const,
    baseUrl: "https://example.test",
  })),
});

describe("token usage provider-name snapshot backfill migration", () => {
  it("uses the fixed ID, updates only recoverable AutoByteus rows, and preserves other facts", async () => {
    const database = new FakeDatabase([
      row({ id: 1, model_provider: "DEEPSEEK", model_identifier: "deepseek-chat", model_value: "deepseek-chat" }),
      row({ id: 2 }),
      row({ id: 3, runtime_kind: "codex_app_server", model_provider: "OPENAI", model_identifier: "gpt-5.4-mini", model_value: "gpt-5.4-mini" }),
      row({ id: 4, model_identifier: "malformed-composite" }),
      row({ id: 5, provider_name: "Historical Provider" }),
    ]);
    const beforeFacts = database.rows.map(({ id, model_provider, model_identifier, model_value }) => ({
      id,
      model_provider,
      model_identifier,
      model_value,
    }));

    const migration = new TokenUsageProviderNameSnapshotBackfillMigration(database, providerStore());
    expect(migration.id).toBe(TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID);

    const result = await migration.execute();

    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.migratedCount).toBe(2);
    expect(database.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 1, provider_name: "DeepSeek" }),
      expect.objectContaining({ id: 2, provider_name: "Alibaba Cloud" }),
      expect.objectContaining({ id: 3, provider_name: null }),
      expect.objectContaining({ id: 4, provider_name: null }),
      expect.objectContaining({ id: 5, provider_name: "Historical Provider" }),
    ]));
    expect(database.rows.map(({ id, model_provider, model_identifier, model_value }) => ({
      id,
      model_provider,
      model_identifier,
      model_value,
    }))).toEqual(beforeFacts);
    expect(result.summary.details.some((detail) => detail.message.includes("SKIPPED_SCOPE_MISMATCH"))).toBe(true);
    expect(result.summary.details.some((detail) => detail.message.includes("SKIPPED_PROVIDER_NAME_UNRECOVERABLE"))).toBe(true);
  });

  it("continues after independent failures and retries only unresolved rows", async () => {
    const database = new FakeDatabase([row({ id: 1 }), row({ id: 2 }), row({ id: 3 })]);
    database.failures.add(2);
    const migration = new TokenUsageProviderNameSnapshotBackfillMigration(database, providerStore());

    const failed = await migration.execute();
    expect(failed.status).toBe("FAILED");
    expect(failed.summary.migratedCount).toBe(2);
    expect(database.rows.map((value) => value.provider_name)).toEqual([
      "Alibaba Cloud",
      null,
      "Alibaba Cloud",
    ]);

    database.failures.clear();
    const retried = await migration.execute();
    expect(retried.status).toBe("SUCCEEDED");
    expect(retried.summary.migratedCount).toBe(1);
    expect(database.rows.every((value) => value.provider_name === "Alibaba Cloud")).toBe(true);
  });

  it("fails before scanning when the provider map cannot be loaded", async () => {
    const database = new FakeDatabase([row()]);
    const result = await new TokenUsageProviderNameSnapshotBackfillMigration(
      database,
      { listProviders: async () => { throw new Error("provider map unavailable"); } },
    ).execute();

    expect(result.status).toBe("FAILED");
    expect(result.summary.scannedCount).toBe(0);
    expect(result.errorMessage).toBe("provider map unavailable");
    expect(database.rows[0]?.provider_name).toBeNull();
  });

  it("reports compare-and-set source changes without overwriting a concurrent snapshot", async () => {
    const database = new FakeDatabase([row()]);
    database.casZero.add(1);
    const result = await new TokenUsageProviderNameSnapshotBackfillMigration(database, providerStore()).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.migratedCount).toBe(0);
    expect(result.summary.details.some((detail) => detail.message.includes("SKIPPED_SOURCE_CHANGED"))).toBe(true);
    expect(database.rows[0]?.provider_name).toBeNull();
  });
});
