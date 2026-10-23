import {
  type CacheState,
  type InputTokenSemantic,
} from "../../token-usage/domain/token-usage-component-basis.js";
import type { TokenUsageUnitPrices } from "../../token-usage/domain/token-usage-unit-price-summary.js";
import {  type ModelCallThroughput } from "./model-call-throughput.js";
import {   type ClaudeSdkModelUsage, type ClaudeSdkSelectedMatchState, type ClaudeSdkQueryKind } from "./claude-sdk-usage.js";

export type TokenUsageScope = "per_call" | "per_turn" | "cumulative_snapshot";
export type TokenUsageRuntimeKind = "autobyteus" | "codex_app_server" | "claude_agent_sdk" | "grok_build" | string;
export type TokenUsageIngestionKind =
  | "autobyteus_llm_phase"
  | "codex_thread_token_usage"
  | "claude_sdk_result"
  | "claude_sdk_call"
  | "grok_acp_call"
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
  unit_prices: TokenUsageUnitPrices;
  latest_prompt_tokens: number | null;
  effective_context_window_tokens: number | null;
  context_window_usage_percent: number | null;
  context_compaction_threshold_tokens: number | null;
  latest_model_provider: string | null;
  latest_model_identifier: string | null;
  latest_runtime_kind: string | null;
  latest_selected_raw_model_id?: string | null;
  has_cache_write_rate_assumption?: boolean;
  /** Model calls only (D-4); Claude SDK rows written before token-meter-accuracy counted turns. */
  usage_report_count: number;
  /** Sum of the summarized records' revisions; the live freshness key (D-9). */
  revision: number;
  updated_at: string | null;
}

export interface TokenUsageUpdatedPayload {
  usage_event_id: string;
  idempotency_key: string;
  observed_at: string;
  run_id: string;
  root_team_run_id: string | null;
  turn_id: string | null;
  llm_call_id: string | null;
  call_sequence: number | null;
  agent_definition_id: string | null;
  workspace_id: string | null;
  task_id: string | null;
  team_name: string | null;
  agent_name: string | null;
  run_summary: string | null;
  run_created_at: string | null;
  member_display_name: string | null;
  runtime_kind: TokenUsageRuntimeKind;
  model_provider: string | null;
  provider_name: string | null;
  model_identifier: string | null;
  model_value: string | null;
  selected_match_state?: ClaudeSdkSelectedMatchState | null;
  selected_model_value?: string | null;
  selected_resolved_raw_model_id?: string | null;
  claude_sdk_model_usage?: ClaudeSdkModelUsage[];
  claude_sdk_session_id?: string | null;
  claude_sdk_query_kind?: ClaudeSdkQueryKind | null;
  /** First emitted observation of a Claude process generation opened with `resume` (SR-012). */
  claude_sdk_series_restart?: true;
  ingestion_kind: TokenUsageIngestionKind;
  usage_scope: TokenUsageScope;
  /** True when this observation reports exactly one provider model call (D-4). */
  reports_model_call: boolean;
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
  context_compaction_threshold_tokens: number | null;
  /** This model call's TPS as its adapter measured it, or null (not a model call, none reported, too small). */
  output_throughput: ModelCallThroughput | null;
  raw_usage_json: Record<string, unknown> | null;
  raw_event_json: Record<string, unknown> | null;
  quality_flags: string[];
}
