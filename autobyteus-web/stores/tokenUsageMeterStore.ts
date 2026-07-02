import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import { getApolloClient } from '~/utils/apolloClient';
import {
  GET_AGENT_RUN_TOKEN_USAGE_SUMMARY,
  GET_TEAM_MEMBER_TOKEN_USAGE_SUMMARY,
  GET_TEAM_RUN_TOKEN_USAGE_SUMMARY,
} from '~/graphql/queries/token_usage_meter_queries';
import type {
  TokenUsageApiCostStatus,
  TokenUsageCacheState,
  TokenUsageRunSummary,
  TokenUsageUpdatedPayload,
} from '~/types/tokenUsageMeter';
import {
  emptyUnitPrices,
  forceMixedUnitPrices,
  mergeUnitPrices,
  unitPricesOrEmpty,
} from '~/stores/tokenUsageUnitPriceSummary';

const emptySummary = (runId: string): TokenUsageRunSummary => ({
  runId,
  rootTeamRunId: null,
  executionAddress: null,
  memberAgentRunId: null,
  memberRouteKey: null,
  agentDefinitionId: null,
  workspaceId: null,
  grossInputTokens: 0,
  standardInputTokens: 0,
  cacheMissInputTokens: 0,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheCreation5mInputTokens: 0,
  cacheCreation1hInputTokens: 0,
  outputTokens: 0,
  reasoningOutputTokens: 0,
  billableOutputTokens: 0,
  totalTokens: 0,
  cacheReadInputTokenRate: null,
  standardInputTokenRate: null,
  cacheCreationInputTokenRate: null,
  cacheState: 'unknown',
  estimatedApiInputCost: null,
  estimatedApiStandardInputCost: null,
  estimatedApiCacheReadInputCost: null,
  estimatedApiCacheCreationInputCost: null,
  estimatedApiCacheCreation5mInputCost: null,
  estimatedApiCacheCreation1hInputCost: null,
  estimatedApiOutputCost: null,
  estimatedApiReasoningOutputCost: null,
  estimatedApiTotalCost: null,
  currency: null,
  apiCostStatus: 'price_missing',
  missingPriceDimensions: [],
  pricingPolicyKey: null,
  selectedPricingTierId: null,
  unitPrices: emptyUnitPrices(),
  latestPromptTokens: null,
  effectiveContextWindowTokens: null,
  contextWindowUsagePercent: null,
  latestModelProvider: null,
  latestModelIdentifier: null,
  latestRuntimeKind: null,
  usageReportCount: 0,
  updatedAt: null,
});

const addCost = (current: number | null, delta: number | null | undefined): number | null => {
  if (current === null && (delta === null || delta === undefined)) return null;
  return (current ?? 0) + (delta ?? 0);
};

const normalizedStatus = (status?: string | null): TokenUsageApiCostStatus => {
  if (status === 'estimated' || status === 'price_missing' || status === 'partial_price_missing' || status === 'mixed' || status === 'local_no_api_bill') {
    return status;
  }
  return 'price_missing';
};

const normalizedCacheState = (state?: string | null): TokenUsageCacheState => {
  if (state === 'positive' || state === 'zero_reported' || state === 'not_reported' || state === 'unsupported_or_local' || state === 'unknown') {
    return state;
  }
  return 'unknown';
};

const mergeStatus = (current: TokenUsageApiCostStatus, next?: string | null, priorReportCount = 0): TokenUsageApiCostStatus => {
  const normalized = normalizedStatus(next);
  if (priorReportCount === 0) return normalized;
  if (current === normalized) return current;
  return 'mixed';
};

const mergeCurrency = (current: string | null, next?: string | null): { currency: string | null; mixed: boolean } => {
  if (!next || next === current) return { currency: current, mixed: false };
  if (!current) return { currency: next, mixed: false };
  return { currency: null, mixed: true };
};

const mergeCacheState = (current: TokenUsageCacheState, next?: string | null): TokenUsageCacheState => {
  const incoming = normalizedCacheState(next);
  if (current === 'positive' || incoming === 'positive') return 'positive';
  if (current === 'zero_reported' || incoming === 'zero_reported') return 'zero_reported';
  if (current === 'unsupported_or_local' && incoming === 'unsupported_or_local') return 'unsupported_or_local';
  if (current === 'not_reported' || incoming === 'not_reported') return 'not_reported';
  return 'unknown';
};

const rate = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? numerator / denominator : null;

const mergeUniqueStrings = (current: string[], next?: string[] | null): string[] =>
  Array.from(new Set([...current, ...(next ?? [])].filter(Boolean))).sort();

export const useTokenUsageMeterStore = defineStore('tokenUsageMeter', () => {
  const runSummaries = reactive<Record<string, TokenUsageRunSummary>>({});
  const teamSummaries = reactive<Record<string, TokenUsageRunSummary>>({});
  const seenUsageKeys = reactive<Record<string, true>>({});

  function getRunSummary(runId: string | null | undefined): TokenUsageRunSummary | null {
    if (!runId) return null;
    return runSummaries[runId] ?? null;
  }

  function getTeamSummary(teamRunId: string | null | undefined): TokenUsageRunSummary | null {
    if (!teamRunId) return null;
    return teamSummaries[teamRunId] ?? null;
  }

  function upsertSummary(summary: TokenUsageRunSummary): void {
    const normalizedSummary = { ...summary, unitPrices: unitPricesOrEmpty(summary.unitPrices) };
    runSummaries[normalizedSummary.runId] = normalizedSummary;
    if (normalizedSummary.rootTeamRunId) {
      teamSummaries[normalizedSummary.rootTeamRunId] = normalizedSummary.rootTeamRunId === normalizedSummary.runId
        ? normalizedSummary
        : (teamSummaries[normalizedSummary.rootTeamRunId] ?? normalizedSummary);
    }
  }

  function applyToSummary(summary: TokenUsageRunSummary, payload: TokenUsageUpdatedPayload): TokenUsageRunSummary {
    const grossInputDelta = payload.meter_delta_input_tokens ?? 0;
    const outputDelta = payload.meter_delta_output_tokens ?? 0;
    const totalDelta = payload.meter_delta_total_tokens ?? (grossInputDelta + outputDelta);
    const standardDelta = payload.standard_input_tokens ?? 0;
    const cacheMissDelta = payload.cache_miss_input_tokens ?? standardDelta;
    const cacheReadDelta = payload.cache_read_input_tokens ?? 0;
    const cacheCreationDelta = payload.cache_creation_input_tokens ?? 0;
    const cacheCreation5mDelta = payload.cache_creation_5m_input_tokens ?? 0;
    const cacheCreation1hDelta = payload.cache_creation_1h_input_tokens ?? 0;
    const reasoningDelta = payload.reasoning_output_tokens ?? 0;
    const billableOutputDelta = payload.billable_output_tokens ?? outputDelta;
    const currencyMerge = summary.apiCostStatus === 'mixed' && summary.currency === null && summary.usageReportCount > 0
      ? { currency: null, mixed: true }
      : mergeCurrency(summary.currency, payload.currency);
    const status = currencyMerge.mixed
      ? 'mixed'
      : mergeStatus(summary.apiCostStatus, payload.api_cost_status, summary.usageReportCount);
    const grossInputTokens = summary.grossInputTokens + grossInputDelta;
    const standardInputTokens = summary.standardInputTokens + standardDelta;
    const cacheReadInputTokens = summary.cacheReadInputTokens + cacheReadDelta;
    const cacheCreationInputTokens = summary.cacheCreationInputTokens + cacheCreationDelta;
    const cacheCreation5mInputTokens = summary.cacheCreation5mInputTokens + cacheCreation5mDelta;
    const cacheCreation1hInputTokens = summary.cacheCreation1hInputTokens + cacheCreation1hDelta;
    const outputTokens = summary.outputTokens + outputDelta;
    const reasoningOutputTokens = summary.reasoningOutputTokens + reasoningDelta;
    const mergedUnitPrices = mergeUnitPrices(unitPricesOrEmpty(summary.unitPrices), payload);
    const unitPrices = currencyMerge.mixed
      ? forceMixedUnitPrices({
        standardInputTokens,
        cacheReadInputTokens,
        cacheCreationInputTokens,
        cacheCreation5mInputTokens,
        cacheCreation1hInputTokens,
        outputTokens,
        reasoningOutputTokens,
      })
      : mergedUnitPrices;

    return {
      ...summary,
      rootTeamRunId: payload.root_team_run_id ?? summary.rootTeamRunId,
      executionAddress: payload.execution_address ?? summary.executionAddress,
      memberAgentRunId: payload.member_agent_run_id ?? summary.memberAgentRunId,
      memberRouteKey: payload.member_route_key ?? summary.memberRouteKey,
      agentDefinitionId: payload.agent_definition_id ?? summary.agentDefinitionId,
      workspaceId: payload.workspace_id ?? summary.workspaceId,
      grossInputTokens,
      standardInputTokens,
      cacheMissInputTokens: summary.cacheMissInputTokens + cacheMissDelta,
      cacheReadInputTokens,
      cacheCreationInputTokens,
      cacheCreation5mInputTokens,
      cacheCreation1hInputTokens,
      outputTokens,
      reasoningOutputTokens,
      billableOutputTokens: summary.billableOutputTokens + billableOutputDelta,
      totalTokens: summary.totalTokens + totalDelta,
      cacheReadInputTokenRate: rate(cacheReadInputTokens, grossInputTokens),
      standardInputTokenRate: rate(standardInputTokens, grossInputTokens),
      cacheCreationInputTokenRate: rate(cacheCreationInputTokens, grossInputTokens),
      cacheState: mergeCacheState(summary.cacheState, payload.cache_state),
      estimatedApiInputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiInputCost, payload.estimated_api_input_cost),
      estimatedApiStandardInputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiStandardInputCost, payload.estimated_api_standard_input_cost),
      estimatedApiCacheReadInputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiCacheReadInputCost, payload.estimated_api_cache_read_input_cost),
      estimatedApiCacheCreationInputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiCacheCreationInputCost, payload.estimated_api_cache_creation_input_cost),
      estimatedApiCacheCreation5mInputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiCacheCreation5mInputCost, payload.estimated_api_cache_creation_5m_input_cost),
      estimatedApiCacheCreation1hInputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiCacheCreation1hInputCost, payload.estimated_api_cache_creation_1h_input_cost),
      estimatedApiOutputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiOutputCost, payload.estimated_api_output_cost),
      estimatedApiReasoningOutputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiReasoningOutputCost, payload.estimated_api_reasoning_output_cost),
      estimatedApiTotalCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiTotalCost, payload.estimated_api_total_cost),
      currency: currencyMerge.currency,
      apiCostStatus: status,
      missingPriceDimensions: mergeUniqueStrings(summary.missingPriceDimensions, payload.missing_price_dimensions),
      pricingPolicyKey: payload.pricing_policy_key ?? summary.pricingPolicyKey,
      selectedPricingTierId: payload.selected_pricing_tier_id ?? summary.selectedPricingTierId,
      unitPrices,
      latestPromptTokens: payload.latest_prompt_tokens ?? summary.latestPromptTokens,
      effectiveContextWindowTokens: payload.effective_context_window_tokens ?? summary.effectiveContextWindowTokens,
      contextWindowUsagePercent: payload.context_window_usage_percent ?? summary.contextWindowUsagePercent,
      latestModelProvider: payload.model_provider ?? summary.latestModelProvider,
      latestModelIdentifier: payload.model_identifier ?? payload.model_value ?? summary.latestModelIdentifier,
      latestRuntimeKind: payload.runtime_kind ?? summary.latestRuntimeKind,
      usageReportCount: summary.usageReportCount + 1,
      updatedAt: payload.observed_at ?? new Date().toISOString(),
    };
  }

  function applyTokenUsageUpdated(payload: TokenUsageUpdatedPayload): void {
    const runId = payload.run_id || payload.member_agent_run_id;
    if (!runId) return;
    const seenKey = payload.usage_event_id || payload.idempotency_key;
    if (seenKey && seenUsageKeys[seenKey]) return;
    if (seenKey) seenUsageKeys[seenKey] = true;

    runSummaries[runId] = applyToSummary(runSummaries[runId] ?? emptySummary(runId), payload);
    const teamRunId = payload.root_team_run_id;
    if (teamRunId) {
      teamSummaries[teamRunId] = applyToSummary(teamSummaries[teamRunId] ?? emptySummary(teamRunId), payload);
    }
  }

  async function fetchAgentRunSummary(runId: string): Promise<TokenUsageRunSummary | null> {
    const client = getApolloClient();
    const { data } = await client.query({ query: GET_AGENT_RUN_TOKEN_USAGE_SUMMARY, variables: { runId }, fetchPolicy: 'network-only' });
    const summary = data?.getAgentRunTokenUsageSummary as TokenUsageRunSummary | undefined;
    if (!summary) return null;
    const normalizedSummary = { ...summary, unitPrices: unitPricesOrEmpty(summary.unitPrices) };
    runSummaries[normalizedSummary.runId] = normalizedSummary;
    return normalizedSummary;
  }

  async function fetchTeamRunSummary(teamRunId: string): Promise<TokenUsageRunSummary | null> {
    const client = getApolloClient();
    const { data } = await client.query({ query: GET_TEAM_RUN_TOKEN_USAGE_SUMMARY, variables: { teamRunId }, fetchPolicy: 'network-only' });
    const summary = data?.getTeamRunTokenUsageSummary as TokenUsageRunSummary | undefined;
    if (!summary) return null;
    const normalizedSummary = { ...summary, unitPrices: unitPricesOrEmpty(summary.unitPrices) };
    teamSummaries[teamRunId] = normalizedSummary;
    return normalizedSummary;
  }

  async function fetchTeamMemberSummary(input: { teamRunId: string; memberAgentRunId?: string | null; memberRouteKey?: string | null }): Promise<TokenUsageRunSummary | null> {
    const client = getApolloClient();
    const { data } = await client.query({ query: GET_TEAM_MEMBER_TOKEN_USAGE_SUMMARY, variables: input, fetchPolicy: 'network-only' });
    const summary = data?.getTeamMemberTokenUsageSummary as TokenUsageRunSummary | undefined;
    if (!summary) return null;
    const normalizedSummary = { ...summary, unitPrices: unitPricesOrEmpty(summary.unitPrices) };
    runSummaries[normalizedSummary.runId] = normalizedSummary;
    return normalizedSummary;
  }

  const hasAnyUsage = computed(() => Object.keys(runSummaries).length > 0 || Object.keys(teamSummaries).length > 0);

  return {
    runSummaries,
    teamSummaries,
    hasAnyUsage,
    getRunSummary,
    getTeamSummary,
    upsertSummary,
    applyTokenUsageUpdated,
    fetchAgentRunSummary,
    fetchTeamRunSummary,
    fetchTeamMemberSummary,
  };
});
