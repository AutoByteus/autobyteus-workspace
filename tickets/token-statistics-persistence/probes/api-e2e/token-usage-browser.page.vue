<template>
  <main data-test="token-usage-browser-probe" class="h-screen min-h-0">
    <TokenUsageMeterPanel />
    <pre data-test="token-usage-probe-state" class="sr-only">{{ serializedState }}</pre>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import TokenUsageMeterPanel from '~/components/workspace/usage/TokenUsageMeterPanel.vue';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';
import { buildTestTeamContext, testAgentContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';
import type { TokenUsageRunSummary } from '~/types/tokenUsageMeter';

const route = useRoute();
const meterStore = useTokenUsageMeterStore();
const selectionStore = useAgentSelectionStore();
const agentContextsStore = useAgentContextsStore();
const teamContextsStore = useAgentTeamContextsStore();

const queryValue = (name: string, fallback: string): string => {
  const value = route.query[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() || fallback;
};

const mode = queryValue('mode', 'manual');
const runId = queryValue('runId', 'probe-standalone');
const teamRunId = queryValue('teamRunId', 'probe-team');
const memberRunId = queryValue('memberRunId', 'probe-member');
const otherMemberRunId = queryValue('otherMemberRunId', 'probe-other-member');
const foreignTeamRunId = queryValue('foreignTeamRunId', 'probe-foreign-team');

const summaryToDto = (summary: TokenUsageRunSummary) => ({
  run_id: summary.runId,
  root_team_run_id: summary.rootTeamRunId,
  agent_definition_id: summary.agentDefinitionId,
  workspace_id: summary.workspaceId,
  gross_input_tokens: summary.grossInputTokens,
  standard_input_tokens: summary.standardInputTokens,
  cache_miss_input_tokens: summary.cacheMissInputTokens,
  cache_read_input_tokens: summary.cacheReadInputTokens,
  cache_creation_input_tokens: summary.cacheCreationInputTokens,
  cache_creation_5m_input_tokens: summary.cacheCreation5mInputTokens,
  cache_creation_1h_input_tokens: summary.cacheCreation1hInputTokens,
  output_tokens: summary.outputTokens,
  reasoning_output_tokens: summary.reasoningOutputTokens,
  billable_output_tokens: summary.billableOutputTokens,
  total_tokens: summary.totalTokens,
  cache_read_input_token_rate: summary.cacheReadInputTokenRate,
  standard_input_token_rate: summary.standardInputTokenRate,
  cache_creation_input_token_rate: summary.cacheCreationInputTokenRate,
  cache_state: summary.cacheState,
  estimated_api_input_cost: summary.estimatedApiInputCost,
  estimated_api_standard_input_cost: summary.estimatedApiStandardInputCost,
  estimated_api_cache_read_input_cost: summary.estimatedApiCacheReadInputCost,
  estimated_api_cache_creation_input_cost: summary.estimatedApiCacheCreationInputCost,
  estimated_api_cache_creation_5m_input_cost: summary.estimatedApiCacheCreation5mInputCost,
  estimated_api_cache_creation_1h_input_cost: summary.estimatedApiCacheCreation1hInputCost,
  estimated_api_output_cost: summary.estimatedApiOutputCost,
  estimated_api_reasoning_output_cost: summary.estimatedApiReasoningOutputCost,
  estimated_api_total_cost: summary.estimatedApiTotalCost,
  currency: summary.currency,
  api_cost_status: summary.apiCostStatus,
  missing_price_dimensions: summary.missingPriceDimensions,
  pricing_policy_key: summary.pricingPolicyKey,
  selected_pricing_tier_id: summary.selectedPricingTierId,
  unit_prices: {
    standard_input: { status: summary.unitPrices.standardInput.status, price_per_million: summary.unitPrices.standardInput.pricePerMillion },
    cache_read_input: { status: summary.unitPrices.cacheReadInput.status, price_per_million: summary.unitPrices.cacheReadInput.pricePerMillion },
    cache_creation_input: { status: summary.unitPrices.cacheCreationInput.status, price_per_million: summary.unitPrices.cacheCreationInput.pricePerMillion },
    cache_creation_5m_input: { status: summary.unitPrices.cacheCreation5mInput.status, price_per_million: summary.unitPrices.cacheCreation5mInput.pricePerMillion },
    cache_creation_1h_input: { status: summary.unitPrices.cacheCreation1hInput.status, price_per_million: summary.unitPrices.cacheCreation1hInput.pricePerMillion },
    output: { status: summary.unitPrices.output.status, price_per_million: summary.unitPrices.output.pricePerMillion },
    reasoning_output: { status: summary.unitPrices.reasoningOutput.status, price_per_million: summary.unitPrices.reasoningOutput.pricePerMillion },
  },
  latest_prompt_tokens: summary.latestPromptTokens,
  effective_context_window_tokens: summary.effectiveContextWindowTokens,
  context_window_usage_percent: summary.contextWindowUsagePercent,
  latest_model_provider: summary.latestModelProvider,
  latest_model_identifier: summary.latestModelIdentifier,
  latest_runtime_kind: summary.latestRuntimeKind,
  usage_report_count: summary.usageReportCount,
  updated_at: summary.updatedAt,
});

const setupStandalone = (nullEvents = 0) => {
  agentContextsStore.runs.set(runId, testAgentContext({
    runId,
    displayName: 'Restarted Standalone',
    runtimeKind: 'codex_app_server',
    llmModelIdentifier: 'gpt-5.6-sol',
  }));
  for (let index = 0; index < nullEvents; index += 1) {
    meterStore.applyTokenUsageUpdated({
      run_id: runId,
      usage_event_id: `null-standalone-${index}`,
      idempotency_key: `null-standalone-key-${index}`,
      run_summary_after_event: null,
    } as any);
  }
  selectionStore.setRunSelection(runId, 'agent');
};

const setupTeam = (nullEvents = 0) => {
  const context = buildTestTeamContext({
    teamRunId,
    teamDefinitionId: `definition-${teamRunId}`,
    teamDefinitionName: 'Restarted Team',
    rootChildren: [
      testAgentNode('/lead', { displayName: 'Lead', agentRunId: memberRunId }),
      testAgentNode('/reviewer', { displayName: 'Reviewer', agentRunId: otherMemberRunId }),
    ],
    contexts: [
      { agentRunId: memberRunId, context: testAgentContext({ runId: memberRunId, displayName: 'Lead' }) },
      { agentRunId: otherMemberRunId, context: testAgentContext({ runId: otherMemberRunId, displayName: 'Reviewer' }) },
    ],
    coordinatorAddress: '/lead',
    focusedAgentRunId: memberRunId,
  });
  teamContextsStore.teams.set(teamRunId, context);
  for (let index = 0; index < nullEvents; index += 1) {
    meterStore.applyTeamTokenUsage(teamRunId, memberRunId, {
      agent_run_id: memberRunId,
      usage_event_id: `null-team-${index}`,
      idempotency_key: `null-team-key-${index}`,
      run_summary_after_event: null,
    } as any);
  }
  selectionStore.setRunSelection(teamRunId, 'team');
};

const applyStandaloneSnapshot = (summary: TokenUsageRunSummary, eventId: string) => meterStore.applyTokenUsageUpdated({
  run_id: runId,
  usage_event_id: eventId,
  idempotency_key: `key-${eventId}`,
  run_summary_after_event: summaryToDto(summary),
} as any);

const applyTeamSnapshot = (
  summary: TokenUsageRunSummary,
  eventId: string,
  delta: { input: number; output: number; total: number },
) => meterStore.applyTeamTokenUsage(teamRunId, memberRunId, {
  change_sequence: summary.usageReportCount,
  agent_run_id: memberRunId,
  usage_event_id: eventId,
  idempotency_key: `key-${eventId}`,
  observed_at: summary.updatedAt,
  turn_id: null,
  llm_call_id: null,
  model_provider: summary.latestModelProvider,
  model_identifier: summary.latestModelIdentifier,
  model_value: null,
  usage_scope: 'per_call',
  input_token_semantic: 'gross_includes_cache',
  standard_input_tokens: delta.input,
  cache_miss_input_tokens: delta.input,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_creation_5m_input_tokens: 0,
  cache_creation_1h_input_tokens: 0,
  cache_state: 'not_reported',
  reasoning_output_tokens: 0,
  billable_output_tokens: delta.output,
  meter_delta_input_tokens: delta.input,
  meter_delta_output_tokens: delta.output,
  meter_delta_total_tokens: delta.total,
  input_price_per_million: summary.unitPrices.standardInput.pricePerMillion,
  output_price_per_million: summary.unitPrices.output.pricePerMillion,
  cached_input_read_price_per_million: null,
  cached_input_write_price_per_million: null,
  cached_input_write_5m_price_per_million: null,
  cached_input_write_1h_price_per_million: null,
  estimated_api_input_cost: 0,
  estimated_api_standard_input_cost: 0,
  estimated_api_cache_read_input_cost: null,
  estimated_api_cache_creation_input_cost: null,
  estimated_api_cache_creation_5m_input_cost: null,
  estimated_api_cache_creation_1h_input_cost: null,
  estimated_api_output_cost: 0,
  estimated_api_reasoning_output_cost: null,
  estimated_api_total_cost: 0,
  currency: summary.currency,
  api_cost_status: summary.apiCostStatus,
  missing_price_dimensions: summary.missingPriceDimensions,
  pricing_policy_key: summary.pricingPolicyKey,
  selected_pricing_tier_id: summary.selectedPricingTierId,
  latest_prompt_tokens: summary.latestPromptTokens,
  effective_context_window_tokens: summary.effectiveContextWindowTokens,
  context_window_usage_percent: summary.contextWindowUsagePercent,
  run_summary_after_event: summaryToDto(summary),
  quality_flags: [],
} as any);

const state = () => ({
  selectionType: selectionStore.selectedType,
  runSummary: meterStore.getRunSummary(runId),
  memberSummary: meterStore.getTeamMemberSummary({ teamRunId, agentRunId: memberRunId }),
  foreignMemberSummary: meterStore.getTeamMemberSummary({ teamRunId: foreignTeamRunId, agentRunId: memberRunId }),
  teamSummary: meterStore.getTeamSummary(teamRunId),
  teamState: meterStore.getTeamRunSummaryState(teamRunId),
  teamNeedsHydration: meterStore.needsTeamRunSummaryHydration(teamRunId),
});

const serializedState = computed(() => JSON.stringify(state()));

onMounted(() => {
  (window as any).__tokenUsageProbe = {
    state,
    setupStandalone,
    setupTeam,
    applyStandaloneSnapshot,
    applyTeamSnapshot,
    fetchTeamAggregate: () => meterStore.fetchTeamRunSummary(teamRunId),
  };
  if (mode === 'standalone-before') setupStandalone(2);
  if (mode === 'team-before') setupTeam(2);
  document.documentElement.dataset.tokenUsageProbeReady = 'true';
});
</script>
