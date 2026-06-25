import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import { getApolloClient } from '~/utils/apolloClient';
import {
  GET_AGENT_RUN_TOKEN_USAGE_SUMMARY,
  GET_TEAM_MEMBER_TOKEN_USAGE_SUMMARY,
  GET_TEAM_RUN_TOKEN_USAGE_SUMMARY,
} from '~/graphql/queries/token_usage_meter_queries';
import type { TokenUsageApiCostStatus, TokenUsageRunSummary, TokenUsageUpdatedPayload } from '~/types/tokenUsageMeter';

const emptySummary = (runId: string): TokenUsageRunSummary => ({
  runId,
  rootTeamRunId: null,
  teamRunPath: null,
  memberAgentRunId: null,
  memberPath: null,
  memberRouteKey: null,
  agentDefinitionId: null,
  workspaceId: null,
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  reasoningOutputTokens: 0,
  estimatedApiInputCost: null,
  estimatedApiOutputCost: null,
  estimatedApiReasoningOutputCost: null,
  estimatedApiTotalCost: null,
  currency: null,
  apiCostStatus: 'price_missing',
  latestContextInputTokens: null,
  effectiveContextBudgetTokens: null,
  contextPressurePercent: null,
  latestModelProvider: null,
  latestModelIdentifier: null,
  latestRuntimeKind: null,
  eventCount: 0,
  updatedAt: null,
});

const addCost = (current: number | null, delta: number | null | undefined): number | null => {
  if (current === null && (delta === null || delta === undefined)) return null;
  return (current ?? 0) + (delta ?? 0);
};

const mergeStatus = (current: TokenUsageApiCostStatus, next?: string | null, priorEventCount = 0): TokenUsageApiCostStatus => {
  const normalized = (next || 'price_missing') as TokenUsageApiCostStatus;
  if (priorEventCount === 0) return normalized;
  if (current === normalized) return current;
  return 'mixed';
};

const mergeCurrency = (current: string | null, next?: string | null): { currency: string | null; mixed: boolean } => {
  if (!next || next === current) return { currency: current, mixed: false };
  if (!current) return { currency: next, mixed: false };
  return { currency: null, mixed: true };
};

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
    runSummaries[summary.runId] = summary;
    if (summary.rootTeamRunId) {
      teamSummaries[summary.rootTeamRunId] = summary.rootTeamRunId === summary.runId
        ? summary
        : (teamSummaries[summary.rootTeamRunId] ?? summary);
    }
  }

  function applyToSummary(summary: TokenUsageRunSummary, payload: TokenUsageUpdatedPayload): TokenUsageRunSummary {
    const inputDelta = payload.meter_delta_input_tokens ?? payload.accounting_input_tokens ?? 0;
    const outputDelta = payload.meter_delta_output_tokens ?? payload.accounting_output_tokens ?? 0;
    const totalDelta = payload.meter_delta_total_tokens ?? payload.accounting_total_tokens ?? (inputDelta + outputDelta);
    const reasoningDelta = payload.reasoning_output_tokens ?? 0;
    const currencyMerge = summary.apiCostStatus === 'mixed' && summary.currency === null && summary.eventCount > 0
      ? { currency: null, mixed: true }
      : mergeCurrency(summary.currency, payload.currency);
    const status = currencyMerge.mixed
      ? 'mixed'
      : mergeStatus(summary.apiCostStatus, payload.api_cost_status, summary.eventCount);
    return {
      ...summary,
      rootTeamRunId: payload.root_team_run_id ?? summary.rootTeamRunId,
      memberAgentRunId: payload.member_agent_run_id ?? summary.memberAgentRunId,
      memberPath: payload.member_path ?? summary.memberPath,
      memberRouteKey: payload.member_route_key ?? summary.memberRouteKey,
      agentDefinitionId: payload.agent_definition_id ?? summary.agentDefinitionId,
      workspaceId: payload.workspace_id ?? summary.workspaceId,
      inputTokens: summary.inputTokens + inputDelta,
      outputTokens: summary.outputTokens + outputDelta,
      totalTokens: summary.totalTokens + totalDelta,
      reasoningOutputTokens: summary.reasoningOutputTokens + reasoningDelta,
      estimatedApiInputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiInputCost, payload.estimated_api_input_cost),
      estimatedApiOutputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiOutputCost, payload.estimated_api_output_cost),
      estimatedApiReasoningOutputCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiReasoningOutputCost, payload.estimated_api_reasoning_output_cost),
      estimatedApiTotalCost: currencyMerge.mixed ? null : addCost(summary.estimatedApiTotalCost, payload.estimated_api_total_cost),
      currency: currencyMerge.currency,
      apiCostStatus: status,
      latestContextInputTokens: payload.latest_context_input_tokens ?? summary.latestContextInputTokens,
      effectiveContextBudgetTokens: payload.effective_context_budget_tokens ?? summary.effectiveContextBudgetTokens,
      contextPressurePercent: payload.context_pressure_percent ?? summary.contextPressurePercent,
      latestModelProvider: payload.model_provider ?? summary.latestModelProvider,
      latestModelIdentifier: payload.model_identifier ?? payload.model_value ?? summary.latestModelIdentifier,
      latestRuntimeKind: payload.runtime_kind ?? summary.latestRuntimeKind,
      eventCount: summary.eventCount + 1,
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
    if (summary) runSummaries[summary.runId] = summary;
    return summary ?? null;
  }

  async function fetchTeamRunSummary(teamRunId: string): Promise<TokenUsageRunSummary | null> {
    const client = getApolloClient();
    const { data } = await client.query({ query: GET_TEAM_RUN_TOKEN_USAGE_SUMMARY, variables: { teamRunId }, fetchPolicy: 'network-only' });
    const summary = data?.getTeamRunTokenUsageSummary as TokenUsageRunSummary | undefined;
    if (summary) teamSummaries[teamRunId] = summary;
    return summary ?? null;
  }

  async function fetchTeamMemberSummary(input: { teamRunId: string; memberAgentRunId?: string | null; memberRouteKey?: string | null }): Promise<TokenUsageRunSummary | null> {
    const client = getApolloClient();
    const { data } = await client.query({ query: GET_TEAM_MEMBER_TOKEN_USAGE_SUMMARY, variables: input, fetchPolicy: 'network-only' });
    const summary = data?.getTeamMemberTokenUsageSummary as TokenUsageRunSummary | undefined;
    if (summary) runSummaries[summary.runId] = summary;
    return summary ?? null;
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
