import type { TokenUsageUpdatedPayload } from "../../../agent-execution/domain/agent-run-token-usage.js";
import {
  cumulativeSnapshotTokenFields,
  type CumulativeSnapshotTokenField,
} from "../../../token-usage/projections/cumulative-snapshot-reconciliation-metadata.js";
import type { CumulativeSnapshotBigIntRecord } from "../../../token-usage/domain/token-usage-snapshot-checkpoint.js";

export type LegacyInteger = number | bigint;

export const MAX_LEGACY_MISSING_PRICE_DIMENSIONS = 32;
const MAX_MISSING_PRICE_DIMENSION_LENGTH = 96;
const MAX_MISSING_PRICE_DIMENSIONS_JSON_BYTES = 4 * 1024;

export type LegacyTokenUsageLedgerRow = {
  id: LegacyInteger;
  usage_event_id: string;
  idempotency_key: string;
  observed_at: Date | string;
  persisted_at: Date | string;
  run_id: string;
  root_team_run_id: string | null;
  turn_id: string | null;
  llm_call_id: string | null;
  call_sequence: LegacyInteger | null;
  agent_definition_id: string | null;
  workspace_id: string | null;
  task_id: string | null;
  team_name: string | null;
  agent_name: string | null;
  run_summary: string | null;
  run_created_at: Date | string | null;
  member_display_name: string | null;
  runtime_kind: string;
  model_provider: string | null;
  provider_name: string | null;
  model_identifier: string | null;
  model_value: string | null;
  ingestion_kind: string;
  usage_scope: string;
  snapshot_series_key: string | null;
  previous_snapshot_event_id: string | null;
  input_token_semantic: string;
  reported_input_tokens: LegacyInteger | null;
  reported_output_tokens: LegacyInteger | null;
  reported_total_tokens: LegacyInteger | null;
  accounting_input_tokens: LegacyInteger | null;
  accounting_output_tokens: LegacyInteger | null;
  accounting_total_tokens: LegacyInteger | null;
  standard_input_tokens: LegacyInteger | null;
  cache_miss_input_tokens: LegacyInteger | null;
  cache_read_input_tokens: LegacyInteger | null;
  cache_creation_input_tokens: LegacyInteger | null;
  cache_creation_5m_input_tokens: LegacyInteger | null;
  cache_creation_1h_input_tokens: LegacyInteger | null;
  cache_state: string;
  reasoning_output_tokens: LegacyInteger | null;
  billable_input_tokens: LegacyInteger | null;
  billable_output_tokens: LegacyInteger | null;
  quality_flags_json: string | null;
  cost_basis: string | null;
  currency: string | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  cached_input_read_price_per_million: number | null;
  cached_input_write_price_per_million: number | null;
  cached_input_write_5m_price_per_million: number | null;
  cached_input_write_1h_price_per_million: number | null;
  pricing_source: string | null;
  pricing_status: string;
  pricing_missing_reason: string | null;
  pricing_policy_key: string | null;
  selected_pricing_tier_id: string | null;
  missing_price_dimensions_json: string | null;
  estimated_api_input_cost: number | null;
  estimated_api_standard_input_cost: number | null;
  estimated_api_cache_read_input_cost: number | null;
  estimated_api_cache_creation_input_cost: number | null;
  estimated_api_cache_creation_5m_input_cost: number | null;
  estimated_api_cache_creation_1h_input_cost: number | null;
  estimated_api_output_cost: number | null;
  estimated_api_reasoning_output_cost: number | null;
  estimated_api_total_cost: number | null;
  api_cost_status: string;
  latest_prompt_tokens: LegacyInteger | null;
  effective_context_window_tokens: LegacyInteger | null;
  context_window_usage_percent: number | null;
} & Record<`source_${CumulativeSnapshotTokenField}`, LegacyInteger | null>;

const asSafeInt = (value: LegacyInteger | null, field: string): number | null => {
  if (value === null) return null;
  const converted = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isSafeInteger(converted) || converted < 0) {
    throw new Error(`Legacy token usage field '${field}' is outside JavaScript SafeInt.`);
  }
  return converted;
};

const dateString = (value: Date | string | null, field: string): string | null => {
  if (value === null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Legacy token usage field '${field}' is invalid.`);
  return parsed.toISOString();
};

const stringArray = (json: string | null): string[] => {
  if (!json) return [];
  const parsed = JSON.parse(json) as unknown;
  return Array.isArray(parsed)
    ? [...new Set(parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean))]
    : [];
};

const boundedMissingPriceDimensions = (
  json: string | null,
  semanticDimensions: readonly string[],
): string[] => {
  if (json && Buffer.byteLength(json, "utf8") > MAX_MISSING_PRICE_DIMENSIONS_JSON_BYTES) {
    throw new Error("Legacy token usage missing-price dimensions exceed 4 KiB.");
  }
  const dimensions = [...new Set([...stringArray(json), ...semanticDimensions])].sort();
  if (
    dimensions.length > MAX_LEGACY_MISSING_PRICE_DIMENSIONS ||
    dimensions.some((dimension) => dimension.length > MAX_MISSING_PRICE_DIMENSION_LENGTH)
  ) {
    throw new Error("Legacy token usage missing-price dimensions exceed the target bound.");
  }
  return dimensions;
};

const oneOf = <T extends string>(value: string, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? value as T : fallback;

export const legacyRowId = (row: LegacyTokenUsageLedgerRow): bigint =>
  BigInt(asSafeInt(row.id, "id")!);

export const legacySourceTokens = (
  row: LegacyTokenUsageLedgerRow,
): CumulativeSnapshotBigIntRecord | null => {
  let present = false;
  const record = Object.fromEntries(cumulativeSnapshotTokenFields.map((field) => {
    const value = row[`source_${field}`];
    const normalized = value === null ? null : BigInt(asSafeInt(value, `source_${field}`)!);
    present ||= normalized !== null;
    return [field, normalized];
  })) as CumulativeSnapshotBigIntRecord;
  return present ? record : null;
};

export const legacyRowToCurrentPayload = (
  row: LegacyTokenUsageLedgerRow,
): TokenUsageUpdatedPayload => {
  const inputTokenSemantic = oneOf(
    row.input_token_semantic,
    ["gross_includes_cache", "base_excludes_cache", "unknown"] as const,
    "unknown",
  );
  const pricingStatus = oneOf(
    row.pricing_status,
    ["trusted", "missing", "placeholder", "local_no_api_bill"] as const,
    "missing",
  );
  const sourceApiCostStatus = oneOf(
    row.api_cost_status,
    ["estimated", "price_missing", "partial_price_missing", "mixed", "local_no_api_bill"] as const,
    "price_missing",
  );
  const isLocalNoApiBill = pricingStatus === "local_no_api_bill" || sourceApiCostStatus === "local_no_api_bill";
  const semanticUnknown = inputTokenSemantic === "unknown" && !isLocalNoApiBill;
  const accountingInputTokens = asSafeInt(row.accounting_input_tokens, "accounting_input_tokens");
  const semanticDimensions = semanticUnknown
    ? accountingInputTokens !== null && accountingInputTokens > 0
      ? ["input_token_semantic", "standard_input_tokens"]
      : ["input_token_semantic"]
    : [];
  const outputOnlyPartialCost = semanticUnknown ? row.estimated_api_output_cost : row.estimated_api_total_cost;

  return {
    usage_event_id: row.usage_event_id,
    idempotency_key: row.idempotency_key,
    observed_at: dateString(row.observed_at, "observed_at")!,
    run_id: row.run_id,
    root_team_run_id: row.root_team_run_id,
    turn_id: row.turn_id,
    llm_call_id: row.llm_call_id,
    call_sequence: asSafeInt(row.call_sequence, "call_sequence"),
    agent_definition_id: row.agent_definition_id,
    workspace_id: row.workspace_id,
    task_id: row.task_id,
    team_name: row.team_name,
    agent_name: row.agent_name,
    run_summary: row.run_summary,
    run_created_at: dateString(row.run_created_at, "run_created_at"),
    member_display_name: row.member_display_name,
    runtime_kind: row.runtime_kind,
    model_provider: row.model_provider,
    provider_name: row.provider_name,
    model_identifier: row.model_identifier,
    model_value: row.model_value,
    ingestion_kind: row.ingestion_kind,
    usage_scope: oneOf(row.usage_scope, ["per_call", "per_turn", "cumulative_snapshot"] as const, "per_call"),
    snapshot_series_key: row.snapshot_series_key,
    previous_snapshot_event_id: row.previous_snapshot_event_id,
    input_token_semantic: inputTokenSemantic,
    reported_input_tokens: asSafeInt(row.reported_input_tokens, "reported_input_tokens"),
    reported_output_tokens: asSafeInt(row.reported_output_tokens, "reported_output_tokens"),
    reported_total_tokens: asSafeInt(row.reported_total_tokens, "reported_total_tokens"),
    accounting_input_tokens: accountingInputTokens,
    accounting_output_tokens: asSafeInt(row.accounting_output_tokens, "accounting_output_tokens"),
    accounting_total_tokens: asSafeInt(row.accounting_total_tokens, "accounting_total_tokens"),
    standard_input_tokens: semanticUnknown ? null : asSafeInt(row.standard_input_tokens, "standard_input_tokens"),
    cache_miss_input_tokens: semanticUnknown ? null : asSafeInt(row.cache_miss_input_tokens, "cache_miss_input_tokens"),
    cache_read_input_tokens: semanticUnknown ? null : asSafeInt(row.cache_read_input_tokens, "cache_read_input_tokens"),
    cache_creation_input_tokens: semanticUnknown
      ? null : asSafeInt(row.cache_creation_input_tokens, "cache_creation_input_tokens"),
    cache_creation_5m_input_tokens: semanticUnknown
      ? null : asSafeInt(row.cache_creation_5m_input_tokens, "cache_creation_5m_input_tokens"),
    cache_creation_1h_input_tokens: semanticUnknown
      ? null : asSafeInt(row.cache_creation_1h_input_tokens, "cache_creation_1h_input_tokens"),
    cache_state: semanticUnknown
      ? "unknown"
      : oneOf(
          row.cache_state,
          ["positive", "zero_reported", "not_reported", "unsupported_or_local", "unknown"] as const,
          "unknown",
        ),
    reasoning_output_tokens: asSafeInt(row.reasoning_output_tokens, "reasoning_output_tokens"),
    billable_input_tokens: asSafeInt(row.billable_input_tokens, "billable_input_tokens"),
    billable_output_tokens: asSafeInt(row.billable_output_tokens, "billable_output_tokens"),
    cost_basis: outputOnlyPartialCost !== null ? "api_price_estimate" : null,
    currency: row.currency,
    input_price_per_million: row.input_price_per_million,
    output_price_per_million: row.output_price_per_million,
    cached_input_read_price_per_million: row.cached_input_read_price_per_million,
    cached_input_write_price_per_million: row.cached_input_write_price_per_million,
    cached_input_write_5m_price_per_million: row.cached_input_write_5m_price_per_million,
    cached_input_write_1h_price_per_million: row.cached_input_write_1h_price_per_million,
    pricing_source: row.pricing_source,
    pricing_status: pricingStatus,
    pricing_missing_reason: semanticUnknown ? "input_token_semantic_unknown" : row.pricing_missing_reason,
    pricing_snapshot_json: null,
    pricing_policy_key: row.pricing_policy_key,
    selected_pricing_tier_id: row.selected_pricing_tier_id,
    missing_price_dimensions: boundedMissingPriceDimensions(row.missing_price_dimensions_json, semanticDimensions),
    estimated_api_input_cost: semanticUnknown ? null : row.estimated_api_input_cost,
    estimated_api_standard_input_cost: semanticUnknown ? null : row.estimated_api_standard_input_cost,
    estimated_api_cache_read_input_cost: semanticUnknown ? null : row.estimated_api_cache_read_input_cost,
    estimated_api_cache_creation_input_cost: semanticUnknown ? null : row.estimated_api_cache_creation_input_cost,
    estimated_api_cache_creation_5m_input_cost: semanticUnknown ? null : row.estimated_api_cache_creation_5m_input_cost,
    estimated_api_cache_creation_1h_input_cost: semanticUnknown ? null : row.estimated_api_cache_creation_1h_input_cost,
    estimated_api_output_cost: row.estimated_api_output_cost,
    estimated_api_reasoning_output_cost: row.estimated_api_reasoning_output_cost,
    estimated_api_total_cost: outputOnlyPartialCost,
    api_cost_status: semanticUnknown ? "partial_price_missing" : sourceApiCostStatus,
    meter_delta_input_tokens: accountingInputTokens,
    meter_delta_output_tokens: asSafeInt(row.accounting_output_tokens, "accounting_output_tokens"),
    meter_delta_total_tokens: asSafeInt(row.accounting_total_tokens, "accounting_total_tokens"),
    run_summary_after_event: null,
    latest_prompt_tokens: asSafeInt(row.latest_prompt_tokens, "latest_prompt_tokens"),
    effective_context_window_tokens: asSafeInt(row.effective_context_window_tokens, "effective_context_window_tokens"),
    context_window_usage_percent: row.context_window_usage_percent,
    raw_usage_json: null,
    raw_event_json: null,
    quality_flags: stringArray(row.quality_flags_json),
  };
};
