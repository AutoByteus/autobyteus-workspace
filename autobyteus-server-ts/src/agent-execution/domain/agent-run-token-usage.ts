import { randomUUID } from "node:crypto";
import {
  isCacheState,
  isInputTokenSemantic,
  type CacheState,
  type InputTokenSemantic,
} from "../../token-usage/domain/token-usage-component-basis.js";

export type TokenUsageScope = "per_call" | "per_turn" | "cumulative_snapshot";
export type TokenUsageRuntimeKind = "autobyteus" | "codex_app_server" | "claude_agent_sdk" | string;
export type TokenUsageIngestionKind =
  | "autobyteus_llm_phase"
  | "codex_thread_token_usage"
  | "claude_sdk_result"
  | string;
export type TokenUsagePricingStatus = "trusted" | "missing" | "placeholder" | "local_no_api_bill";
export type TokenUsageApiCostStatus =
  | "estimated"
  | "price_missing"
  | "partial_price_missing"
  | "mixed"
  | "local_no_api_bill";

export interface TokenUsageRunSummaryPayload {
  run_id: string;
  root_team_run_id: string | null;
  team_run_path: string[] | null;
  member_agent_run_id: string | null;
  member_path: string[] | null;
  member_route_key: string | null;
  agent_definition_id: string | null;
  workspace_id: string | null;
  gross_input_tokens: number;
  standard_input_tokens: number;
  cache_miss_input_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  cache_creation_5m_input_tokens: number;
  cache_creation_1h_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
  billable_output_tokens: number;
  total_tokens: number;
  cache_read_input_token_rate: number | null;
  standard_input_token_rate: number | null;
  cache_creation_input_token_rate: number | null;
  cache_state: CacheState;
  estimated_api_input_cost: number | null;
  estimated_api_standard_input_cost: number | null;
  estimated_api_cache_read_input_cost: number | null;
  estimated_api_cache_creation_input_cost: number | null;
  estimated_api_cache_creation_5m_input_cost: number | null;
  estimated_api_cache_creation_1h_input_cost: number | null;
  estimated_api_output_cost: number | null;
  estimated_api_reasoning_output_cost: number | null;
  estimated_api_total_cost: number | null;
  currency: string | null;
  api_cost_status: TokenUsageApiCostStatus;
  missing_price_dimensions: string[];
  pricing_policy_key: string | null;
  selected_pricing_tier_id: string | null;
  latest_prompt_tokens: number | null;
  effective_context_window_tokens: number | null;
  context_window_usage_percent: number | null;
  latest_model_provider: string | null;
  latest_model_identifier: string | null;
  latest_runtime_kind: string | null;
  usage_report_count: number;
  updated_at: string | null;
}

export interface TokenUsageUpdatedPayload {
  usage_event_id: string;
  idempotency_key: string;
  observed_at: string;
  run_id: string;
  turn_id: string | null;
  llm_call_id: string | null;
  call_sequence: number | null;
  root_team_run_id: string | null;
  team_run_path: string[] | null;
  member_agent_run_id: string | null;
  member_path: string[] | null;
  member_route_key: string | null;
  agent_definition_id: string | null;
  workspace_id: string | null;
  task_agent_instance_id: string | null;
  task_agent_run_id: string | null;
  task_id: string | null;
  runtime_kind: TokenUsageRuntimeKind;
  model_provider: string | null;
  model_identifier: string | null;
  model_value: string | null;
  ingestion_kind: TokenUsageIngestionKind;
  usage_scope: TokenUsageScope;
  snapshot_series_key: string | null;
  previous_snapshot_event_id: string | null;
  input_token_semantic: InputTokenSemantic;
  reported_input_tokens: number | null;
  reported_output_tokens: number | null;
  reported_total_tokens: number | null;
  accounting_input_tokens: number | null;
  accounting_output_tokens: number | null;
  accounting_total_tokens: number | null;
  standard_input_tokens: number | null;
  cache_miss_input_tokens: number | null;
  cache_read_input_tokens: number | null;
  cache_creation_input_tokens: number | null;
  cache_creation_5m_input_tokens: number | null;
  cache_creation_1h_input_tokens: number | null;
  cache_state: CacheState;
  reasoning_output_tokens: number | null;
  billable_input_tokens: number | null;
  billable_output_tokens: number | null;
  cost_basis: "api_price_estimate" | null;
  currency: string | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  cached_input_read_price_per_million: number | null;
  cached_input_write_price_per_million: number | null;
  cached_input_write_5m_price_per_million: number | null;
  cached_input_write_1h_price_per_million: number | null;
  pricing_source: string | null;
  pricing_status: TokenUsagePricingStatus;
  pricing_missing_reason: string | null;
  pricing_snapshot_json: Record<string, unknown> | null;
  pricing_policy_key: string | null;
  selected_pricing_tier_id: string | null;
  missing_price_dimensions: string[];
  estimated_api_input_cost: number | null;
  estimated_api_standard_input_cost: number | null;
  estimated_api_cache_read_input_cost: number | null;
  estimated_api_cache_creation_input_cost: number | null;
  estimated_api_cache_creation_5m_input_cost: number | null;
  estimated_api_cache_creation_1h_input_cost: number | null;
  estimated_api_output_cost: number | null;
  estimated_api_reasoning_output_cost: number | null;
  estimated_api_total_cost: number | null;
  api_cost_status: TokenUsageApiCostStatus;
  meter_delta_input_tokens: number | null;
  meter_delta_output_tokens: number | null;
  meter_delta_total_tokens: number | null;
  run_summary_after_event: TokenUsageRunSummaryPayload | null;
  latest_prompt_tokens: number | null;
  effective_context_window_tokens: number | null;
  context_window_usage_percent: number | null;
  raw_usage_json: Record<string, unknown> | null;
  raw_event_json: Record<string, unknown> | null;
  quality_flags: string[];
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNonNegativeInt = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;

const asFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const parts = value.map((part) => String(part).trim()).filter(Boolean);
  return parts.length > 0 ? parts : null;
};

const asJsonRecord = (value: unknown): Record<string, unknown> | null => {
  const record = asRecord(value);
  if (!record) return null;
  return JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
};

const asQualityFlags = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(new Set(value.map((entry) => String(entry).trim()).filter(Boolean)))
    : [];

const asScope = (value: unknown): TokenUsageScope | null => {
  const scope = asString(value);
  return scope === "per_call" || scope === "per_turn" || scope === "cumulative_snapshot" ? scope : null;
};

const asPricingStatus = (value: unknown): TokenUsagePricingStatus => {
  const status = asString(value);
  return status === "trusted" || status === "missing" || status === "placeholder" || status === "local_no_api_bill"
    ? status
    : "missing";
};

const asApiCostStatus = (value: unknown): TokenUsageApiCostStatus => {
  const status = asString(value);
  return status === "estimated" ||
    status === "price_missing" ||
    status === "partial_price_missing" ||
    status === "mixed" ||
    status === "local_no_api_bill"
    ? status
    : "price_missing";
};

export const addTokenUsageQualityFlag = (
  payload: TokenUsageUpdatedPayload,
  flag: string,
): TokenUsageUpdatedPayload => {
  if (payload.quality_flags.includes(flag)) return payload;
  return { ...payload, quality_flags: [...payload.quality_flags, flag] };
};

export const isTokenUsageUpdatedPayload = (value: unknown): value is TokenUsageUpdatedPayload => {
  const record = asRecord(value);
  return Boolean(
    record &&
    asString(record.usage_event_id) &&
    asString(record.idempotency_key) &&
    asString(record.run_id) &&
    asString(record.runtime_kind) &&
    asString(record.ingestion_kind) &&
    asScope(record.usage_scope),
  );
};

export const createTokenUsageUpdatedPayload = (input: {
  runId: string;
  payload: Record<string, unknown>;
  observedAt?: Date | string | null;
}): TokenUsageUpdatedPayload => {
  const source = input.payload;
  const usage = asRecord(source.usage);
  const observedAt = asString(source.observed_at) ??
    (input.observedAt instanceof Date ? input.observedAt.toISOString() : asString(input.observedAt)) ??
    new Date().toISOString();
  const usageEventId = asString(source.usage_event_id) ?? randomUUID();
  const qualityFlags = new Set([
    ...asQualityFlags(usage?.quality_flags),
    ...asQualityFlags(source.quality_flags),
  ]);

  const reportedInput = asNonNegativeInt(source.reported_input_tokens) ?? asNonNegativeInt(usage?.input_tokens);
  const reportedOutput = asNonNegativeInt(source.reported_output_tokens) ?? asNonNegativeInt(usage?.output_tokens);
  const reportedTotal = asNonNegativeInt(source.reported_total_tokens) ?? asNonNegativeInt(usage?.total_tokens) ?? (
    reportedInput !== null && reportedOutput !== null ? reportedInput + reportedOutput : null
  );

  if (reportedInput === null) qualityFlags.add("reported_input_tokens_missing");
  if (reportedOutput === null) qualityFlags.add("reported_output_tokens_missing");
  if (reportedTotal === null) qualityFlags.add("reported_total_tokens_missing");

  const runtimeKind = asString(source.runtime_kind) ?? "autobyteus";
  const ingestionKind = asString(source.ingestion_kind) ?? "autobyteus_llm_phase";
  const usageScope = asScope(source.usage_scope) ?? asScope(usage?.usage_scope) ?? "per_call";
  const idempotencyKey = asString(source.idempotency_key) ?? [
    input.runId,
    runtimeKind,
    ingestionKind,
    asString(source.turn_id) ?? "turn",
    asString(source.llm_call_id) ?? usageEventId,
  ].join(":");
  const inputTokenSemanticSource = source.input_token_semantic ?? usage?.input_token_semantic;
  const inputTokenSemantic = isInputTokenSemantic(inputTokenSemanticSource) ? inputTokenSemanticSource : "unknown";
  if (inputTokenSemantic === "unknown") qualityFlags.add("input_token_semantic_unknown");
  const cacheStateSource = source.cache_state ?? usage?.cache_state;
  const cacheState = isCacheState(cacheStateSource) ? cacheStateSource : "unknown";

  return {
    usage_event_id: usageEventId,
    idempotency_key: idempotencyKey,
    observed_at: observedAt,
    run_id: asString(source.run_id) ?? input.runId,
    turn_id: asString(source.turn_id),
    llm_call_id: asString(source.llm_call_id),
    call_sequence: asNonNegativeInt(source.call_sequence),
    root_team_run_id: asString(source.root_team_run_id),
    team_run_path: asStringArray(source.team_run_path),
    member_agent_run_id: asString(source.member_agent_run_id),
    member_path: asStringArray(source.member_path),
    member_route_key: asString(source.member_route_key),
    agent_definition_id: asString(source.agent_definition_id),
    workspace_id: asString(source.workspace_id),
    task_agent_instance_id: asString(source.task_agent_instance_id),
    task_agent_run_id: asString(source.task_agent_run_id),
    task_id: asString(source.task_id),
    runtime_kind: runtimeKind,
    model_provider: asString(source.model_provider) ?? asString(usage?.model_provider),
    model_identifier: asString(source.model_identifier) ?? asString(usage?.model_identifier),
    model_value: asString(source.model_value) ?? asString(usage?.model_value),
    ingestion_kind: ingestionKind,
    usage_scope: usageScope,
    snapshot_series_key: asString(source.snapshot_series_key),
    previous_snapshot_event_id: asString(source.previous_snapshot_event_id),
    input_token_semantic: inputTokenSemantic,
    reported_input_tokens: reportedInput,
    reported_output_tokens: reportedOutput,
    reported_total_tokens: reportedTotal,
    accounting_input_tokens: asNonNegativeInt(source.accounting_input_tokens),
    accounting_output_tokens: asNonNegativeInt(source.accounting_output_tokens),
    accounting_total_tokens: asNonNegativeInt(source.accounting_total_tokens),
    standard_input_tokens: asNonNegativeInt(source.standard_input_tokens) ?? asNonNegativeInt(usage?.standard_input_tokens),
    cache_miss_input_tokens: asNonNegativeInt(source.cache_miss_input_tokens) ?? asNonNegativeInt(usage?.cache_miss_input_tokens),
    cache_read_input_tokens: asNonNegativeInt(source.cache_read_input_tokens) ?? asNonNegativeInt(usage?.cache_read_input_tokens),
    cache_creation_input_tokens: asNonNegativeInt(source.cache_creation_input_tokens) ?? asNonNegativeInt(usage?.cache_creation_input_tokens),
    cache_creation_5m_input_tokens: asNonNegativeInt(source.cache_creation_5m_input_tokens) ?? asNonNegativeInt(usage?.cache_creation_5m_input_tokens),
    cache_creation_1h_input_tokens: asNonNegativeInt(source.cache_creation_1h_input_tokens) ?? asNonNegativeInt(usage?.cache_creation_1h_input_tokens),
    cache_state: cacheState,
    reasoning_output_tokens: asNonNegativeInt(source.reasoning_output_tokens) ?? asNonNegativeInt(usage?.reasoning_output_tokens),
    billable_input_tokens: asNonNegativeInt(source.billable_input_tokens) ?? asNonNegativeInt(usage?.billable_input_tokens),
    billable_output_tokens: asNonNegativeInt(source.billable_output_tokens) ?? asNonNegativeInt(usage?.billable_output_tokens),
    cost_basis: null,
    currency: asString(source.currency),
    input_price_per_million: asFiniteNumber(source.input_price_per_million),
    output_price_per_million: asFiniteNumber(source.output_price_per_million),
    cached_input_read_price_per_million: asFiniteNumber(source.cached_input_read_price_per_million),
    cached_input_write_price_per_million: asFiniteNumber(source.cached_input_write_price_per_million),
    cached_input_write_5m_price_per_million: asFiniteNumber(source.cached_input_write_5m_price_per_million),
    cached_input_write_1h_price_per_million: asFiniteNumber(source.cached_input_write_1h_price_per_million),
    pricing_source: asString(source.pricing_source),
    pricing_status: asPricingStatus(source.pricing_status),
    pricing_missing_reason: asString(source.pricing_missing_reason),
    pricing_snapshot_json: asJsonRecord(source.pricing_snapshot_json),
    pricing_policy_key: asString(source.pricing_policy_key),
    selected_pricing_tier_id: asString(source.selected_pricing_tier_id),
    missing_price_dimensions: asStringArray(source.missing_price_dimensions) ?? [],
    estimated_api_input_cost: asFiniteNumber(source.estimated_api_input_cost),
    estimated_api_standard_input_cost: asFiniteNumber(source.estimated_api_standard_input_cost),
    estimated_api_cache_read_input_cost: asFiniteNumber(source.estimated_api_cache_read_input_cost),
    estimated_api_cache_creation_input_cost: asFiniteNumber(source.estimated_api_cache_creation_input_cost),
    estimated_api_cache_creation_5m_input_cost: asFiniteNumber(source.estimated_api_cache_creation_5m_input_cost),
    estimated_api_cache_creation_1h_input_cost: asFiniteNumber(source.estimated_api_cache_creation_1h_input_cost),
    estimated_api_output_cost: asFiniteNumber(source.estimated_api_output_cost),
    estimated_api_reasoning_output_cost: asFiniteNumber(source.estimated_api_reasoning_output_cost),
    estimated_api_total_cost: asFiniteNumber(source.estimated_api_total_cost),
    api_cost_status: asApiCostStatus(source.api_cost_status),
    meter_delta_input_tokens: asNonNegativeInt(source.meter_delta_input_tokens),
    meter_delta_output_tokens: asNonNegativeInt(source.meter_delta_output_tokens),
    meter_delta_total_tokens: asNonNegativeInt(source.meter_delta_total_tokens),
    run_summary_after_event: null,
    latest_prompt_tokens: asNonNegativeInt(source.latest_prompt_tokens),
    effective_context_window_tokens: asNonNegativeInt(source.effective_context_window_tokens),
    context_window_usage_percent: asFiniteNumber(source.context_window_usage_percent),
    raw_usage_json: asJsonRecord(source.raw_usage_json) ?? asJsonRecord(usage?.raw_usage_json),
    raw_event_json: asJsonRecord(source.raw_event_json) ?? asJsonRecord(source),
    quality_flags: Array.from(qualityFlags),
  };
};
