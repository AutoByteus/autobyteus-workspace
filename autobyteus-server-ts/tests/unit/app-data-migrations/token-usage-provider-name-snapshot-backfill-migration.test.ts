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
  idempotency_key: input.idempotency_key ?? `idempotency-${input.id ?? 1}`,
  observed_at: input.observed_at ?? "2026-07-30T10:00:00.000Z",
  persisted_at: input.persisted_at ?? "2026-07-30T10:00:01.000Z",
  run_id: input.run_id ?? `run-${input.id ?? 1}`,
  turn_id: input.turn_id ?? `turn-${input.id ?? 1}`,
  llm_call_id: input.llm_call_id ?? `llm-call-${input.id ?? 1}`,
  call_sequence: input.call_sequence ?? 1,
  root_team_run_id: input.root_team_run_id ?? `root-run-${input.id ?? 1}`,
  execution_address_json: input.execution_address_json ?? '{"team":"synthetic"}',
  member_agent_run_id: input.member_agent_run_id ?? `member-run-${input.id ?? 1}`,
  member_route_key: input.member_route_key ?? "synthetic-route",
  agent_definition_id: input.agent_definition_id ?? "synthetic-agent",
  workspace_id: input.workspace_id ?? "synthetic-workspace",
  task_agent_instance_id: input.task_agent_instance_id ?? `task-instance-${input.id ?? 1}`,
  task_agent_run_id: input.task_agent_run_id ?? `task-run-${input.id ?? 1}`,
  task_id: input.task_id ?? `task-${input.id ?? 1}`,
  team_name: input.team_name ?? "synthetic-team",
  agent_name: input.agent_name ?? "synthetic-agent",
  run_summary: input.run_summary ?? "synthetic run",
  run_created_at: input.run_created_at ?? "2026-07-30T09:59:00.000Z",
  member_name: input.member_name ?? "synthetic-member",
  runtime_kind: input.runtime_kind ?? "autobyteus",
  model_provider: input.model_provider ?? "OPENAI_COMPATIBLE",
  provider_name: input.provider_name ?? null,
  model_identifier: input.model_identifier ?? "openai-compatible:provider_A:org/model:tag",
  model_value: input.model_value ?? "org/model:tag",
  ingestion_kind: input.ingestion_kind ?? "autobyteus_llm_phase",
  usage_scope: input.usage_scope ?? "per_call",
  snapshot_series_key: input.snapshot_series_key ?? `snapshot-series-${input.id ?? 1}`,
  previous_snapshot_event_id: input.previous_snapshot_event_id ?? `previous-event-${input.id ?? 1}`,
  input_token_semantic: input.input_token_semantic ?? "standard",
  reported_input_tokens: input.reported_input_tokens ?? 100,
  reported_output_tokens: input.reported_output_tokens ?? 20,
  reported_total_tokens: input.reported_total_tokens ?? 120,
  accounting_input_tokens: input.accounting_input_tokens ?? 100,
  accounting_output_tokens: input.accounting_output_tokens ?? 20,
  accounting_total_tokens: input.accounting_total_tokens ?? 120,
  standard_input_tokens: input.standard_input_tokens ?? 100,
  cache_miss_input_tokens: input.cache_miss_input_tokens ?? 80,
  cache_read_input_tokens: input.cache_read_input_tokens ?? 20,
  cache_creation_input_tokens: input.cache_creation_input_tokens ?? 0,
  cache_creation_5m_input_tokens: input.cache_creation_5m_input_tokens ?? 0,
  cache_creation_1h_input_tokens: input.cache_creation_1h_input_tokens ?? 0,
  cache_state: input.cache_state ?? "positive",
  reasoning_output_tokens: input.reasoning_output_tokens ?? 5,
  billable_input_tokens: input.billable_input_tokens ?? 100,
  billable_output_tokens: input.billable_output_tokens ?? 20,
  raw_usage_json: input.raw_usage_json ?? '{"prompt_tokens":100,"completion_tokens":20}',
  raw_event_json: input.raw_event_json ?? '{"source":"synthetic-migration-fixture"}',
  quality_flags_json: input.quality_flags_json ?? '["synthetic_fixture"]',
  cost_basis: input.cost_basis ?? "api_price_estimate",
  currency: input.currency ?? "USD",
  input_price_per_million: input.input_price_per_million ?? 5,
  output_price_per_million: input.output_price_per_million ?? 30,
  cached_input_read_price_per_million: input.cached_input_read_price_per_million ?? 1,
  cached_input_write_price_per_million: input.cached_input_write_price_per_million ?? 2,
  cached_input_write_5m_price_per_million: input.cached_input_write_5m_price_per_million ?? 2,
  cached_input_write_1h_price_per_million: input.cached_input_write_1h_price_per_million ?? 2,
  pricing_missing_reason: input.pricing_missing_reason ?? null,
  pricing_snapshot_json: input.pricing_snapshot_json ?? '{"catalog":"synthetic"}',
  selected_pricing_tier_id: input.selected_pricing_tier_id ?? "synthetic-tier",
  missing_price_dimensions_json: input.missing_price_dimensions_json ?? null,
  estimated_api_input_cost: input.estimated_api_input_cost ?? 0.0005,
  estimated_api_standard_input_cost: input.estimated_api_standard_input_cost ?? 0.0005,
  estimated_api_cache_read_input_cost: input.estimated_api_cache_read_input_cost ?? 0.00002,
  estimated_api_cache_creation_input_cost: input.estimated_api_cache_creation_input_cost ?? 0,
  estimated_api_cache_creation_5m_input_cost: input.estimated_api_cache_creation_5m_input_cost ?? 0,
  estimated_api_cache_creation_1h_input_cost: input.estimated_api_cache_creation_1h_input_cost ?? 0,
  estimated_api_output_cost: input.estimated_api_output_cost ?? 0.0006,
  estimated_api_reasoning_output_cost: input.estimated_api_reasoning_output_cost ?? 0.00015,
  estimated_api_total_cost: input.estimated_api_total_cost ?? 0.0011,
  pricing_source: input.pricing_source ?? "synthetic_catalog",
  pricing_status: input.pricing_status ?? "trusted",
  pricing_policy_key: input.pricing_policy_key ?? "synthetic:provider:model",
  api_cost_status: input.api_cost_status ?? "estimated",
  latest_prompt_tokens: input.latest_prompt_tokens ?? 100,
  effective_context_window_tokens: input.effective_context_window_tokens ?? 128000,
  context_window_usage_percent: input.context_window_usage_percent ?? 0.078125,
});

class FakeDatabase implements TokenUsageProviderNameSnapshotBackfillDatabase {
  rows: RawTokenUsageProviderNameBackfillRow[];
  failures = new Set<number>();
  casZero = new Set<number>();
  mutateAfterInvariantRead: ((rows: RawTokenUsageProviderNameBackfillRow[]) => void) | null = null;
  private allRowsReadCount = 0;

  constructor(rows: RawTokenUsageProviderNameBackfillRow[]) {
    this.rows = rows.map((value) => ({ ...value }));
  }

  async listTokenUsageLedgerRows(): Promise<RawTokenUsageProviderNameBackfillRow[]> {
    this.allRowsReadCount += 1;
    const snapshot = this.rows.map((value) => ({ ...value }));
    if (this.allRowsReadCount === 2 && this.mutateAfterInvariantRead) {
      this.mutateAfterInvariantRead(snapshot);
    }
    return snapshot;
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

const preservedFacts = (value: RawTokenUsageProviderNameBackfillRow) => ({
  id: value.id,
  usage_event_id: value.usage_event_id,
  idempotency_key: value.idempotency_key,
  observed_at: value.observed_at,
  persisted_at: value.persisted_at,
  run_id: value.run_id,
  turn_id: value.turn_id,
  llm_call_id: value.llm_call_id,
  call_sequence: value.call_sequence,
  root_team_run_id: value.root_team_run_id,
  execution_address_json: value.execution_address_json,
  member_agent_run_id: value.member_agent_run_id,
  member_route_key: value.member_route_key,
  agent_definition_id: value.agent_definition_id,
  workspace_id: value.workspace_id,
  task_agent_instance_id: value.task_agent_instance_id,
  task_agent_run_id: value.task_agent_run_id,
  task_id: value.task_id,
  team_name: value.team_name,
  agent_name: value.agent_name,
  run_summary: value.run_summary,
  run_created_at: value.run_created_at,
  member_name: value.member_name,
  runtime_kind: value.runtime_kind,
  model_provider: value.model_provider,
  model_identifier: value.model_identifier,
  model_value: value.model_value,
  ingestion_kind: value.ingestion_kind,
  usage_scope: value.usage_scope,
  snapshot_series_key: value.snapshot_series_key,
  previous_snapshot_event_id: value.previous_snapshot_event_id,
  input_token_semantic: value.input_token_semantic,
  reported_input_tokens: value.reported_input_tokens,
  reported_output_tokens: value.reported_output_tokens,
  reported_total_tokens: value.reported_total_tokens,
  accounting_input_tokens: value.accounting_input_tokens,
  accounting_output_tokens: value.accounting_output_tokens,
  accounting_total_tokens: value.accounting_total_tokens,
  standard_input_tokens: value.standard_input_tokens,
  cache_miss_input_tokens: value.cache_miss_input_tokens,
  cache_read_input_tokens: value.cache_read_input_tokens,
  cache_creation_input_tokens: value.cache_creation_input_tokens,
  cache_creation_5m_input_tokens: value.cache_creation_5m_input_tokens,
  cache_creation_1h_input_tokens: value.cache_creation_1h_input_tokens,
  cache_state: value.cache_state,
  reasoning_output_tokens: value.reasoning_output_tokens,
  billable_input_tokens: value.billable_input_tokens,
  billable_output_tokens: value.billable_output_tokens,
  raw_usage_json: value.raw_usage_json,
  raw_event_json: value.raw_event_json,
  quality_flags_json: value.quality_flags_json,
  cost_basis: value.cost_basis,
  currency: value.currency,
  input_price_per_million: value.input_price_per_million,
  output_price_per_million: value.output_price_per_million,
  cached_input_read_price_per_million: value.cached_input_read_price_per_million,
  cached_input_write_price_per_million: value.cached_input_write_price_per_million,
  cached_input_write_5m_price_per_million: value.cached_input_write_5m_price_per_million,
  cached_input_write_1h_price_per_million: value.cached_input_write_1h_price_per_million,
  pricing_source: value.pricing_source,
  pricing_status: value.pricing_status,
  pricing_missing_reason: value.pricing_missing_reason,
  pricing_snapshot_json: value.pricing_snapshot_json,
  pricing_policy_key: value.pricing_policy_key,
  selected_pricing_tier_id: value.selected_pricing_tier_id,
  missing_price_dimensions_json: value.missing_price_dimensions_json,
  estimated_api_input_cost: value.estimated_api_input_cost,
  estimated_api_standard_input_cost: value.estimated_api_standard_input_cost,
  estimated_api_cache_read_input_cost: value.estimated_api_cache_read_input_cost,
  estimated_api_cache_creation_input_cost: value.estimated_api_cache_creation_input_cost,
  estimated_api_cache_creation_5m_input_cost: value.estimated_api_cache_creation_5m_input_cost,
  estimated_api_cache_creation_1h_input_cost: value.estimated_api_cache_creation_1h_input_cost,
  estimated_api_output_cost: value.estimated_api_output_cost,
  estimated_api_reasoning_output_cost: value.estimated_api_reasoning_output_cost,
  estimated_api_total_cost: value.estimated_api_total_cost,
  api_cost_status: value.api_cost_status,
  latest_prompt_tokens: value.latest_prompt_tokens,
  effective_context_window_tokens: value.effective_context_window_tokens,
  context_window_usage_percent: value.context_window_usage_percent,
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
    const beforeFacts = database.rows.map(preservedFacts);

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
    expect(database.rows.map(preservedFacts)).toEqual(beforeFacts);
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

  it("fails the invariant check when a preserved token field changes", async () => {
    const database = new FakeDatabase([row()]);
    database.mutateAfterInvariantRead = (rows) => {
      rows[0]!.accounting_total_tokens = 999;
    };

    const result = await new TokenUsageProviderNameSnapshotBackfillMigration(database, providerStore()).execute();

    expect(result.status).toBe("FAILED");
    expect(result.summary.details.some((detail) => detail.message.includes("preserved fields changed=true"))).toBe(true);
  });
});
