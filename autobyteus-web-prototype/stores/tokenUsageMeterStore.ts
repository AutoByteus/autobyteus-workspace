import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import { getApolloClient } from '~/utils/apolloClient';
import {
  GET_AGENT_RUN_TOKEN_USAGE_SUMMARY,
  GET_TEAM_MEMBER_TOKEN_USAGE_SUMMARY,
  GET_TEAM_RUN_TOKEN_USAGE_SUMMARY,
} from '~/graphql/queries/token_usage_meter_queries';
import { mapTokenUsageRunSummaryDto } from '~/services/agentStreaming/tokenUsageRunSummaryMapper';
import type {
  TeamTokenUsageDetails,
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

export interface TeamTokenUsageMemberIdentity {
  teamRunId: string;
  agentRunId: string;
}

export type TeamTokenUsageAggregateState = 'live_partial' | 'refresh_required' | 'record_backed';

type TeamTokenUsageAggregateEntry = {
  summary: TokenUsageRunSummary | null;
  state: TeamTokenUsageAggregateState;
  liveGeneration: number;
  fetchGeneration: number | null;
};

const emptyTeamAggregate = (teamRunId: string): TokenUsageRunSummary => ({
  runId: teamRunId,
  rootTeamRunId: teamRunId,
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

const normalizedId = (value: string | null | undefined): string => value?.trim() || '';
const memberCacheKey = (identity: TeamTokenUsageMemberIdentity): string =>
  `${identity.teamRunId}\u0000${identity.agentRunId}`;
const rate = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? numerator / denominator : null;
const addCost = (current: number | null, delta: number | null): number | null =>
  current === null && delta === null ? null : (current ?? 0) + (delta ?? 0);

const normalizedStatus = (status: string): TokenUsageApiCostStatus => {
  if (status === 'estimated' || status === 'price_missing' || status === 'partial_price_missing' || status === 'mixed' || status === 'local_no_api_bill') {
    return status;
  }
  return 'price_missing';
};

const mergeStatus = (
  current: TokenUsageApiCostStatus,
  next: string,
  priorReportCount: number,
): TokenUsageApiCostStatus => {
  const normalized = normalizedStatus(next);
  if (priorReportCount === 0) return normalized;
  return current === normalized ? current : 'mixed';
};

const mergeCurrency = (
  current: string | null,
  next: string | null,
): { currency: string | null; mixed: boolean } => {
  if (!next || next === current) return { currency: current, mixed: false };
  if (!current) return { currency: next, mixed: false };
  return { currency: null, mixed: true };
};

const mergeCacheState = (current: TokenUsageCacheState, next: string): TokenUsageCacheState => {
  if (current === 'positive' || next === 'positive') return 'positive';
  if (current === 'zero_reported' || next === 'zero_reported') return 'zero_reported';
  if (current === 'unsupported_or_local' && next === 'unsupported_or_local') return 'unsupported_or_local';
  if (current === 'not_reported' || next === 'not_reported') return 'not_reported';
  return 'unknown';
};

const mergeUniqueStrings = (current: string[], next: string[]): string[] =>
  Array.from(new Set([...current, ...next].filter(Boolean))).sort();

const applyPersistedEventToPartialTeamAggregate = (
  summary: TokenUsageRunSummary,
  details: TeamTokenUsageDetails,
): TokenUsageRunSummary => {
  const grossInputDelta = details.meter_delta_input_tokens ?? 0;
  const outputDelta = details.meter_delta_output_tokens ?? 0;
  const totalDelta = details.meter_delta_total_tokens ?? grossInputDelta + outputDelta;
  const standardDelta = details.standard_input_tokens ?? 0;
  const cacheReadDelta = details.cache_read_input_tokens ?? 0;
  const cacheCreationDelta = details.cache_creation_input_tokens ?? 0;
  const cacheCreation5mDelta = details.cache_creation_5m_input_tokens ?? 0;
  const cacheCreation1hDelta = details.cache_creation_1h_input_tokens ?? 0;
  const reasoningDelta = details.reasoning_output_tokens ?? 0;
  const currencyMerge = summary.apiCostStatus === 'mixed' && summary.currency === null && summary.usageReportCount > 0
    ? { currency: null, mixed: true }
    : mergeCurrency(summary.currency, details.currency);
  const grossInputTokens = summary.grossInputTokens + grossInputDelta;
  const standardInputTokens = summary.standardInputTokens + standardDelta;
  const cacheReadInputTokens = summary.cacheReadInputTokens + cacheReadDelta;
  const cacheCreationInputTokens = summary.cacheCreationInputTokens + cacheCreationDelta;
  const cacheCreation5mInputTokens = summary.cacheCreation5mInputTokens + cacheCreation5mDelta;
  const cacheCreation1hInputTokens = summary.cacheCreation1hInputTokens + cacheCreation1hDelta;
  const outputTokens = summary.outputTokens + outputDelta;
  const reasoningOutputTokens = summary.reasoningOutputTokens + reasoningDelta;
  const mergedUnitPrices = mergeUnitPrices(summary.unitPrices, details);

  return {
    ...summary,
    grossInputTokens,
    standardInputTokens,
    cacheMissInputTokens: summary.cacheMissInputTokens + (details.cache_miss_input_tokens ?? standardDelta),
    cacheReadInputTokens,
    cacheCreationInputTokens,
    cacheCreation5mInputTokens,
    cacheCreation1hInputTokens,
    outputTokens,
    reasoningOutputTokens,
    billableOutputTokens: summary.billableOutputTokens + (details.billable_output_tokens ?? outputDelta),
    totalTokens: summary.totalTokens + totalDelta,
    cacheReadInputTokenRate: rate(cacheReadInputTokens, grossInputTokens),
    standardInputTokenRate: rate(standardInputTokens, grossInputTokens),
    cacheCreationInputTokenRate: rate(cacheCreationInputTokens, grossInputTokens),
    cacheState: mergeCacheState(summary.cacheState, details.cache_state),
    estimatedApiInputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiInputCost, details.estimated_api_input_cost),
    estimatedApiStandardInputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiStandardInputCost, details.estimated_api_standard_input_cost),
    estimatedApiCacheReadInputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiCacheReadInputCost, details.estimated_api_cache_read_input_cost),
    estimatedApiCacheCreationInputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiCacheCreationInputCost, details.estimated_api_cache_creation_input_cost),
    estimatedApiCacheCreation5mInputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiCacheCreation5mInputCost, details.estimated_api_cache_creation_5m_input_cost),
    estimatedApiCacheCreation1hInputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiCacheCreation1hInputCost, details.estimated_api_cache_creation_1h_input_cost),
    estimatedApiOutputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiOutputCost, details.estimated_api_output_cost),
    estimatedApiReasoningOutputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiReasoningOutputCost, details.estimated_api_reasoning_output_cost),
    estimatedApiTotalCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiTotalCost, details.estimated_api_total_cost),
    currency: currencyMerge.currency,
    apiCostStatus: currencyMerge.mixed
      ? 'mixed'
      : mergeStatus(summary.apiCostStatus, details.api_cost_status, summary.usageReportCount),
    missingPriceDimensions: mergeUniqueStrings(summary.missingPriceDimensions, details.missing_price_dimensions),
    pricingPolicyKey: details.pricing_policy_key ?? summary.pricingPolicyKey,
    selectedPricingTierId: details.selected_pricing_tier_id ?? summary.selectedPricingTierId,
    unitPrices: currencyMerge.mixed
      ? forceMixedUnitPrices({
          standardInputTokens,
          cacheReadInputTokens,
          cacheCreationInputTokens,
          cacheCreation5mInputTokens,
          cacheCreation1hInputTokens,
          outputTokens,
          reasoningOutputTokens,
        })
      : mergedUnitPrices,
    usageReportCount: summary.usageReportCount + 1,
    updatedAt: details.observed_at,
  };
};

const normalizeRecordBackedSummary = (summary: TokenUsageRunSummary): TokenUsageRunSummary => {
  if (!summary.runId?.trim()) throw new Error('Record-backed token summary requires a run ID.');
  if (!Number.isSafeInteger(summary.usageReportCount) || summary.usageReportCount < 0) {
    throw new Error('Record-backed token summary requires a non-negative safe-integer usage report count.');
  }
  return { ...summary, unitPrices: unitPricesOrEmpty(summary.unitPrices) };
};

export const useTokenUsageMeterStore = defineStore('tokenUsageMeter', () => {
  const runSummaries = reactive<Record<string, TokenUsageRunSummary>>({});
  const teamMemberSummaries = reactive<Record<string, TokenUsageRunSummary>>({});
  const teamAggregateEntries = reactive<Record<string, TeamTokenUsageAggregateEntry>>({});
  const seenUsageKeys = new Set<string>();
  const teamAggregateRequests = new Map<string, Promise<TokenUsageRunSummary | null>>();

  function getRunSummary(runId: string | null | undefined): TokenUsageRunSummary | null {
    const id = normalizedId(runId);
    return id ? runSummaries[id] ?? null : null;
  }

  function getTeamMemberSummary(identity: TeamTokenUsageMemberIdentity): TokenUsageRunSummary | null {
    const teamRunId = normalizedId(identity.teamRunId);
    const agentRunId = normalizedId(identity.agentRunId);
    return teamRunId && agentRunId
      ? teamMemberSummaries[memberCacheKey({ teamRunId, agentRunId })] ?? null
      : null;
  }

  function getTeamSummary(teamRunId: string | null | undefined): TokenUsageRunSummary | null {
    const id = normalizedId(teamRunId);
    return id ? teamAggregateEntries[id]?.summary ?? null : null;
  }

  function getTeamRunSummaryState(teamRunId: string | null | undefined): TeamTokenUsageAggregateState | null {
    const id = normalizedId(teamRunId);
    return id ? teamAggregateEntries[id]?.state ?? null : null;
  }

  function getTeamRunSummaryHydrationGeneration(teamRunId: string | null | undefined): number {
    const id = normalizedId(teamRunId);
    return id ? teamAggregateEntries[id]?.liveGeneration ?? 0 : 0;
  }

  function needsAgentRunSummaryHydration(runId: string | null | undefined): boolean {
    const id = normalizedId(runId);
    return Boolean(id && !runSummaries[id]);
  }

  function needsTeamMemberSummaryHydration(identity: TeamTokenUsageMemberIdentity): boolean {
    const teamRunId = normalizedId(identity.teamRunId);
    const agentRunId = normalizedId(identity.agentRunId);
    return Boolean(teamRunId && agentRunId && !getTeamMemberSummary({ teamRunId, agentRunId }));
  }

  function needsTeamRunSummaryHydration(teamRunId: string | null | undefined): boolean {
    const id = normalizedId(teamRunId);
    return Boolean(id && teamAggregateEntries[id]?.state !== 'record_backed');
  }

  function upsertRecordBackedAgentRunSummary(input: {
    runId: string;
    summary: TokenUsageRunSummary;
  }): boolean {
    const runId = normalizedId(input.runId);
    const summary = normalizeRecordBackedSummary(input.summary);
    if (!runId || summary.runId !== runId) {
      throw new Error('Standalone token summary returned a different AgentRun ID.');
    }
    const current = runSummaries[runId];
    if (current && summary.usageReportCount <= current.usageReportCount) return false;
    runSummaries[runId] = summary;
    return true;
  }

  function upsertRecordBackedTeamMemberSummary(input: TeamTokenUsageMemberIdentity & {
    summary: TokenUsageRunSummary;
  }): boolean {
    const teamRunId = normalizedId(input.teamRunId);
    const agentRunId = normalizedId(input.agentRunId);
    const summary = normalizeRecordBackedSummary(input.summary);
    if (!teamRunId || !agentRunId || summary.runId !== agentRunId || summary.rootTeamRunId !== teamRunId) {
      throw new Error('Team member token summary returned a different run identity.');
    }
    const key = memberCacheKey({ teamRunId, agentRunId });
    const current = teamMemberSummaries[key];
    if (current && summary.usageReportCount <= current.usageReportCount) return false;
    teamMemberSummaries[key] = summary;
    return true;
  }

  function applyTokenUsageUpdated(payload: TokenUsageUpdatedPayload): boolean {
    const runId = normalizedId(payload.run_id);
    if (!runId || !payload.run_summary_after_event) return false;
    const seenKey = payload.usage_event_id || payload.idempotency_key;
    if (seenKey && seenUsageKeys.has(seenKey)) return false;
    const summary = mapTokenUsageRunSummaryDto(payload.run_summary_after_event, { runId });
    if (seenKey) seenUsageKeys.add(seenKey);
    return upsertRecordBackedAgentRunSummary({ runId, summary });
  }

  function applyTeamTokenUsage(
    rootTeamRunId: string,
    agentRunId: string,
    details: TeamTokenUsageDetails,
  ): boolean {
    const teamRunId = normalizedId(rootTeamRunId);
    const runId = normalizedId(agentRunId);
    if (!teamRunId || !runId || details.agent_run_id !== runId || !details.run_summary_after_event) return false;
    const seenKey = details.usage_event_id || details.idempotency_key;
    if (seenUsageKeys.has(seenKey)) return false;
    const summary = mapTokenUsageRunSummaryDto(details.run_summary_after_event, {
      runId,
      rootTeamRunId: teamRunId,
    });
    seenUsageKeys.add(seenKey);
    upsertRecordBackedTeamMemberSummary({ teamRunId, agentRunId: runId, summary });

    const current = teamAggregateEntries[teamRunId];
    const liveGeneration = (current?.liveGeneration ?? 0) + 1;
    if (!current || current.state === 'live_partial') {
      teamAggregateEntries[teamRunId] = {
        summary: applyPersistedEventToPartialTeamAggregate(
          current?.summary ?? emptyTeamAggregate(teamRunId),
          details,
        ),
        state: 'live_partial',
        liveGeneration,
        fetchGeneration: current?.fetchGeneration ?? null,
      };
    } else {
      teamAggregateEntries[teamRunId] = {
        ...current,
        state: 'refresh_required',
        liveGeneration,
      };
    }
    return true;
  }

  async function fetchAgentRunSummary(runIdValue: string): Promise<TokenUsageRunSummary | null> {
    const runId = normalizedId(runIdValue);
    if (!runId) return null;
    const client = getApolloClient();
    const { data } = await client.query({
      query: GET_AGENT_RUN_TOKEN_USAGE_SUMMARY,
      variables: { runId },
      fetchPolicy: 'network-only',
    });
    const summary = data?.getAgentRunTokenUsageSummary as TokenUsageRunSummary | undefined;
    if (!summary) return null;
    upsertRecordBackedAgentRunSummary({ runId, summary });
    return getRunSummary(runId);
  }

  async function refreshTeamRunSummaryUntilStable(teamRunId: string): Promise<TokenUsageRunSummary | null> {
    let result: TokenUsageRunSummary | null = null;
    let stable = false;
    while (!stable) {
      const fetchGeneration = teamAggregateEntries[teamRunId]?.liveGeneration ?? 0;
      const current = teamAggregateEntries[teamRunId];
      if (current) current.fetchGeneration = fetchGeneration;
      const client = getApolloClient();
      const { data } = await client.query({
        query: GET_TEAM_RUN_TOKEN_USAGE_SUMMARY,
        variables: { teamRunId },
        fetchPolicy: 'network-only',
      });
      const response = data?.getTeamRunTokenUsageSummary as TokenUsageRunSummary | undefined;
      if (!response) return null;
      result = normalizeRecordBackedSummary(response);
      if (result.runId !== teamRunId || (result.rootTeamRunId !== null && result.rootTeamRunId !== teamRunId)) {
        throw new Error('Team token summary returned a different TeamRun identity.');
      }
      const liveGeneration = teamAggregateEntries[teamRunId]?.liveGeneration ?? 0;
      stable = liveGeneration === fetchGeneration;
      teamAggregateEntries[teamRunId] = {
        summary: result,
        state: stable ? 'record_backed' : 'refresh_required',
        liveGeneration,
        fetchGeneration,
      };
    }
    return result;
  }

  function fetchTeamRunSummary(teamRunIdValue: string): Promise<TokenUsageRunSummary | null> {
    const teamRunId = normalizedId(teamRunIdValue);
    if (!teamRunId) return Promise.resolve(null);
    const existing = teamAggregateRequests.get(teamRunId);
    if (existing) return existing;
    const request = (async () => {
      try {
        return await refreshTeamRunSummaryUntilStable(teamRunId);
      } finally {
        teamAggregateRequests.delete(teamRunId);
      }
    })();
    teamAggregateRequests.set(teamRunId, request);
    return request;
  }

  async function fetchTeamMemberSummary(input: TeamTokenUsageMemberIdentity): Promise<TokenUsageRunSummary | null> {
    const teamRunId = normalizedId(input.teamRunId);
    const agentRunId = normalizedId(input.agentRunId);
    if (!teamRunId || !agentRunId) return null;
    const client = getApolloClient();
    const { data } = await client.query({
      query: GET_TEAM_MEMBER_TOKEN_USAGE_SUMMARY,
      variables: { teamRunId, agentRunId },
      fetchPolicy: 'network-only',
    });
    const summary = data?.getTeamMemberTokenUsageSummary as TokenUsageRunSummary | undefined;
    if (!summary) return null;
    upsertRecordBackedTeamMemberSummary({ teamRunId, agentRunId, summary });
    return getTeamMemberSummary({ teamRunId, agentRunId });
  }

  const hasAnyUsage = computed(() => Object.keys(runSummaries).length > 0
    || Object.keys(teamAggregateEntries).length > 0
    || Object.keys(teamMemberSummaries).length > 0);

  return {
    hasAnyUsage,
    getRunSummary,
    getTeamMemberSummary,
    getTeamSummary,
    getTeamRunSummaryState,
    getTeamRunSummaryHydrationGeneration,
    needsAgentRunSummaryHydration,
    needsTeamMemberSummaryHydration,
    needsTeamRunSummaryHydration,
    upsertRecordBackedAgentRunSummary,
    upsertRecordBackedTeamMemberSummary,
    applyTokenUsageUpdated,
    applyTeamTokenUsage,
    fetchAgentRunSummary,
    fetchTeamRunSummary,
    fetchTeamMemberSummary,
  };
});
