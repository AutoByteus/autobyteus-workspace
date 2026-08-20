import {
  tokenUsageRunSummaryDtoSchema,
  type TokenUsageRunSummaryDto,
} from '@autobyteus/team-stream-contracts';
import type { TokenUsageRunSummary } from '~/types/tokenUsageMeter';

export interface TokenUsageRunSummaryExpectedIdentity {
  runId: string;
  rootTeamRunId?: string;
}

const mapUnitPrice = (unitPrice: TokenUsageRunSummaryDto['unit_prices']['standard_input']) => ({
  status: unitPrice.status,
  pricePerMillion: unitPrice.price_per_million,
});

export const mapTokenUsageRunSummaryDto = (
  value: unknown,
  expectedIdentity: TokenUsageRunSummaryExpectedIdentity,
): TokenUsageRunSummary => {
  const expectedRunId = expectedIdentity.runId.trim();
  const expectedRootTeamRunId = expectedIdentity.rootTeamRunId?.trim();
  if (!expectedRunId) throw new Error('Token usage summary requires an expected AgentRun ID.');
  if (expectedIdentity.rootTeamRunId !== undefined && !expectedRootTeamRunId) {
    throw new Error('Team member token usage summary requires an expected TeamRun ID.');
  }

  const summary = tokenUsageRunSummaryDtoSchema.parse(value);
  if (summary.run_id !== expectedRunId) {
    throw new Error('Token usage summary returned a different AgentRun ID.');
  }
  if (expectedRootTeamRunId !== undefined && summary.root_team_run_id !== expectedRootTeamRunId) {
    throw new Error('Token usage summary returned a different TeamRun ID.');
  }

  return {
    runId: summary.run_id,
    rootTeamRunId: summary.root_team_run_id,
    agentDefinitionId: summary.agent_definition_id,
    workspaceId: summary.workspace_id,
    grossInputTokens: summary.gross_input_tokens,
    standardInputTokens: summary.standard_input_tokens,
    cacheMissInputTokens: summary.cache_miss_input_tokens,
    cacheReadInputTokens: summary.cache_read_input_tokens,
    cacheCreationInputTokens: summary.cache_creation_input_tokens,
    cacheCreation5mInputTokens: summary.cache_creation_5m_input_tokens,
    cacheCreation1hInputTokens: summary.cache_creation_1h_input_tokens,
    outputTokens: summary.output_tokens,
    reasoningOutputTokens: summary.reasoning_output_tokens,
    billableOutputTokens: summary.billable_output_tokens,
    totalTokens: summary.total_tokens,
    cacheReadInputTokenRate: summary.cache_read_input_token_rate,
    standardInputTokenRate: summary.standard_input_token_rate,
    cacheCreationInputTokenRate: summary.cache_creation_input_token_rate,
    cacheState: summary.cache_state,
    estimatedApiInputCost: summary.estimated_api_input_cost,
    estimatedApiStandardInputCost: summary.estimated_api_standard_input_cost,
    estimatedApiCacheReadInputCost: summary.estimated_api_cache_read_input_cost,
    estimatedApiCacheCreationInputCost: summary.estimated_api_cache_creation_input_cost,
    estimatedApiCacheCreation5mInputCost: summary.estimated_api_cache_creation_5m_input_cost,
    estimatedApiCacheCreation1hInputCost: summary.estimated_api_cache_creation_1h_input_cost,
    estimatedApiOutputCost: summary.estimated_api_output_cost,
    estimatedApiReasoningOutputCost: summary.estimated_api_reasoning_output_cost,
    estimatedApiTotalCost: summary.estimated_api_total_cost,
    currency: summary.currency,
    apiCostStatus: summary.api_cost_status,
    missingPriceDimensions: [...summary.missing_price_dimensions],
    pricingPolicyKey: summary.pricing_policy_key,
    selectedPricingTierId: summary.selected_pricing_tier_id,
    unitPrices: {
      standardInput: mapUnitPrice(summary.unit_prices.standard_input),
      cacheReadInput: mapUnitPrice(summary.unit_prices.cache_read_input),
      cacheCreationInput: mapUnitPrice(summary.unit_prices.cache_creation_input),
      cacheCreation5mInput: mapUnitPrice(summary.unit_prices.cache_creation_5m_input),
      cacheCreation1hInput: mapUnitPrice(summary.unit_prices.cache_creation_1h_input),
      output: mapUnitPrice(summary.unit_prices.output),
      reasoningOutput: mapUnitPrice(summary.unit_prices.reasoning_output),
    },
    latestPromptTokens: summary.latest_prompt_tokens,
    effectiveContextWindowTokens: summary.effective_context_window_tokens,
    contextWindowUsagePercent: summary.context_window_usage_percent,
    latestModelProvider: summary.latest_model_provider,
    latestModelIdentifier: summary.latest_model_identifier,
    latestRuntimeKind: summary.latest_runtime_kind,
    usageReportCount: summary.usage_report_count,
    updatedAt: summary.updated_at,
  };
};
