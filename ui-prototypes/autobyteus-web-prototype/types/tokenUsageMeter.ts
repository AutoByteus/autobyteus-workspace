import type {
  TeamStreamServerMessage,
  TokenUsageRunSummaryDto,
} from '@autobyteus/team-stream-contracts';

export type TokenUsageApiCostStatus = 'estimated' | 'price_missing' | 'partial_price_missing' | 'mixed' | 'local_no_api_bill';
export type TokenUsageCacheState = 'positive' | 'zero_reported' | 'not_reported' | 'unsupported_or_local' | 'unknown';
export type TokenUsageUnitPriceSummaryStatus = 'single' | 'mixed' | 'missing' | 'partial_missing' | 'not_applicable' | 'local_no_api_bill';

export interface TokenUsageUnitPriceSummary {
  status: TokenUsageUnitPriceSummaryStatus;
  pricePerMillion: number | null;
}

export interface TokenUsageUnitPrices {
  standardInput: TokenUsageUnitPriceSummary;
  cacheReadInput: TokenUsageUnitPriceSummary;
  cacheCreationInput: TokenUsageUnitPriceSummary;
  cacheCreation5mInput: TokenUsageUnitPriceSummary;
  cacheCreation1hInput: TokenUsageUnitPriceSummary;
  output: TokenUsageUnitPriceSummary;
  reasoningOutput: TokenUsageUnitPriceSummary;
}

export interface TokenUsageUpdatedPayload {
  usage_event_id: string;
  idempotency_key: string;
  observed_at?: string;
  run_id: string;
  turn_id?: string | null;
  llm_call_id?: string | null;
  root_team_run_id?: string | null;
  agent_definition_id?: string | null;
  workspace_id?: string | null;
  runtime_kind?: string | null;
  model_provider?: string | null;
  model_identifier?: string | null;
  model_value?: string | null;
  usage_scope?: 'per_call' | 'per_turn' | 'cumulative_snapshot' | string;
  input_token_semantic?: 'gross_includes_cache' | 'base_excludes_cache' | 'unknown' | string;
  standard_input_tokens?: number | null;
  cache_miss_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_creation_5m_input_tokens?: number | null;
  cache_creation_1h_input_tokens?: number | null;
  cache_state?: TokenUsageCacheState | string;
  reasoning_output_tokens?: number | null;
  billable_output_tokens?: number | null;
  meter_delta_input_tokens?: number | null;
  meter_delta_output_tokens?: number | null;
  meter_delta_total_tokens?: number | null;
  input_price_per_million?: number | null;
  output_price_per_million?: number | null;
  cached_input_read_price_per_million?: number | null;
  cached_input_write_price_per_million?: number | null;
  cached_input_write_5m_price_per_million?: number | null;
  cached_input_write_1h_price_per_million?: number | null;
  estimated_api_input_cost?: number | null;
  estimated_api_standard_input_cost?: number | null;
  estimated_api_cache_read_input_cost?: number | null;
  estimated_api_cache_creation_input_cost?: number | null;
  estimated_api_cache_creation_5m_input_cost?: number | null;
  estimated_api_cache_creation_1h_input_cost?: number | null;
  estimated_api_output_cost?: number | null;
  estimated_api_reasoning_output_cost?: number | null;
  estimated_api_total_cost?: number | null;
  currency?: string | null;
  api_cost_status?: TokenUsageApiCostStatus | string;
  missing_price_dimensions?: string[];
  pricing_policy_key?: string | null;
  selected_pricing_tier_id?: string | null;
  latest_prompt_tokens?: number | null;
  effective_context_window_tokens?: number | null;
  context_window_usage_percent?: number | null;
  run_summary_after_event: TokenUsageRunSummaryDto | null;
  quality_flags?: string[];
}

export interface TokenUsageRunSummary {
  runId: string | null;
  rootTeamRunId: string | null;
  agentDefinitionId: string | null;
  workspaceId: string | null;
  grossInputTokens: number;
  standardInputTokens: number;
  cacheMissInputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  cacheCreation5mInputTokens: number;
  cacheCreation1hInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  billableOutputTokens: number;
  totalTokens: number;
  cacheReadInputTokenRate: number | null;
  standardInputTokenRate: number | null;
  cacheCreationInputTokenRate: number | null;
  cacheState: TokenUsageCacheState;
  estimatedApiInputCost: number | null;
  estimatedApiStandardInputCost: number | null;
  estimatedApiCacheReadInputCost: number | null;
  estimatedApiCacheCreationInputCost: number | null;
  estimatedApiCacheCreation5mInputCost: number | null;
  estimatedApiCacheCreation1hInputCost: number | null;
  estimatedApiOutputCost: number | null;
  estimatedApiReasoningOutputCost: number | null;
  estimatedApiTotalCost: number | null;
  currency: string | null;
  apiCostStatus: TokenUsageApiCostStatus;
  missingPriceDimensions: string[];
  pricingPolicyKey: string | null;
  selectedPricingTierId: string | null;
  unitPrices: TokenUsageUnitPrices;
  latestPromptTokens: number | null;
  effectiveContextWindowTokens: number | null;
  contextWindowUsagePercent: number | null;
  latestModelProvider: string | null;
  latestModelIdentifier: string | null;
  latestRuntimeKind: string | null;
  usageReportCount: number;
  updatedAt: string | null;
}

type TeamTokenUsageMessage = Extract<TeamStreamServerMessage, { type: 'TOKEN_USAGE_UPDATED' }>;
export type TeamTokenUsageDetails = TeamTokenUsageMessage['payload'];
