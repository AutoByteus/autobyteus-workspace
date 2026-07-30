export type RawTokenUsageProviderNameBackfillRow = {
  id: number;
  usage_event_id: string;
  idempotency_key: string;
  observed_at: string | Date;
  persisted_at: string | Date;
  run_id: string;
  runtime_kind: string;
  model_provider: string | null;
  provider_name: string | null;
  model_identifier: string | null;
  model_value: string | null;
  [field: string]: unknown;
};

const PRESERVED_ROW_FIELDS = [
  "id",
  "usage_event_id",
  "idempotency_key",
  "observed_at",
  "persisted_at",
  "run_id",
  "turn_id",
  "llm_call_id",
  "call_sequence",
  "root_team_run_id",
  "execution_address_json",
  "member_agent_run_id",
  "member_route_key",
  "agent_definition_id",
  "workspace_id",
  "task_agent_instance_id",
  "task_agent_run_id",
  "task_id",
  "team_name",
  "agent_name",
  "run_summary",
  "run_created_at",
  "member_name",
  "runtime_kind",
  "model_provider",
  "model_identifier",
  "model_value",
  "ingestion_kind",
  "usage_scope",
  "snapshot_series_key",
  "previous_snapshot_event_id",
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
  "cache_creation_5m_input_tokens",
  "cache_creation_1h_input_tokens",
  "cache_state",
  "reasoning_output_tokens",
  "billable_input_tokens",
  "billable_output_tokens",
  "raw_usage_json",
  "raw_event_json",
  "quality_flags_json",
  "cost_basis",
  "currency",
  "input_price_per_million",
  "output_price_per_million",
  "cached_input_read_price_per_million",
  "cached_input_write_price_per_million",
  "cached_input_write_5m_price_per_million",
  "cached_input_write_1h_price_per_million",
  "pricing_source",
  "pricing_status",
  "pricing_missing_reason",
  "pricing_snapshot_json",
  "pricing_policy_key",
  "selected_pricing_tier_id",
  "missing_price_dimensions_json",
  "estimated_api_input_cost",
  "estimated_api_standard_input_cost",
  "estimated_api_cache_read_input_cost",
  "estimated_api_cache_creation_input_cost",
  "estimated_api_cache_creation_5m_input_cost",
  "estimated_api_cache_creation_1h_input_cost",
  "estimated_api_output_cost",
  "estimated_api_reasoning_output_cost",
  "estimated_api_total_cost",
  "api_cost_status",
  "latest_prompt_tokens",
  "effective_context_window_tokens",
  "context_window_usage_percent",
] as const;

export const preservedRowSnapshot = (row: RawTokenUsageProviderNameBackfillRow): string => JSON.stringify(
  Object.fromEntries(PRESERVED_ROW_FIELDS.map((field) => [field, row[field]])),
);

export interface TokenUsageProviderNameSnapshotBackfillDatabase {
  listTokenUsageLedgerRows(): Promise<RawTokenUsageProviderNameBackfillRow[]>;
  listTokenUsageProviderNameBackfillCandidates(): Promise<RawTokenUsageProviderNameBackfillRow[]>;
  countTokenUsageLedgerRows(): Promise<number>;
  updateTokenUsageProviderName(input: {
    id: number;
    expectedProviderName: string | null;
    nextProviderName: string;
  }): Promise<number | void>;
}

type SkipReason =
  | "SKIPPED_ALREADY_POPULATED"
  | "SKIPPED_SCOPE_MISMATCH"
  | "SKIPPED_PROVIDER_NAME_UNRECOVERABLE"
  | "SKIPPED_SOURCE_CHANGED";

export type Classification =
  | { kind: "MIGRATE"; providerName: string }
  | { kind: "SKIP"; reason: SkipReason };
