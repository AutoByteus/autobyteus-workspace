<template>
  <main class="min-h-screen bg-slate-100">
    <nav class="flex flex-wrap gap-2 p-3 text-sm">
      <button v-for="action in actions" :key="action" class="rounded border bg-white px-2 py-1" @click="perform(action)">{{ action }}</button>
    </nav>
    <div class="mx-auto h-[1100px] w-full max-w-[440px]" data-preview="panel"><TokenUsageMeterPanel /></div>
  </main>
</template>
<script setup lang="ts">
import TokenUsageMeterPanel from '~/components/workspace/usage/TokenUsageMeterPanel.vue';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { TokenUsageRunSummary } from '~/types/tokenUsageMeter';
definePageMeta({ layout: false });
const buildSummary = (overrides: Partial<TokenUsageRunSummary> = {}): TokenUsageRunSummary => ({
  runId: 'run-1',
  rootTeamRunId: null,
  agentDefinitionId: null,
  workspaceId: null,
  grossInputTokens: 1000,
  standardInputTokens: 700,
  cacheMissInputTokens: 700,
  cacheReadInputTokens: 300,
  cacheCreationInputTokens: 0,
  cacheCreation5mInputTokens: 0,
  cacheCreation1hInputTokens: 0,
  outputTokens: 120,
  billableOutputTokens: 153,
  totalTokens: 1153,
  cacheReadInputTokenRate: 0.3,
  standardInputTokenRate: 0.7,
  cacheCreationInputTokenRate: 0,
  cacheState: 'positive',
  reasoningOutputTokens: 33,
  estimatedApiInputCost: 0.002,
  estimatedApiStandardInputCost: 0.0014,
  estimatedApiCacheReadInputCost: 0.0006,
  estimatedApiCacheCreationInputCost: null,
  estimatedApiCacheCreation5mInputCost: null,
  estimatedApiCacheCreation1hInputCost: null,
  estimatedApiOutputCost: 0.0012,
  estimatedApiReasoningOutputCost: 0.00033,
  estimatedApiTotalCost: 0.0032,
  currency: 'USD',
  apiCostStatus: 'estimated',
  missingPriceDimensions: [],
  pricingPolicyKey: 'catalog:openai:gpt-test',
  selectedPricingTierId: null,
  unitPrices: {
    standardInput: { status: 'single', pricePerMillion: 2 },
    cacheReadInput: { status: 'single', pricePerMillion: 2 },
    cacheCreationInput: { status: 'not_applicable', pricePerMillion: null },
    cacheCreation5mInput: { status: 'not_applicable', pricePerMillion: null },
    cacheCreation1hInput: { status: 'not_applicable', pricePerMillion: null },
    output: { status: 'single', pricePerMillion: 10 },
    reasoningOutput: { status: 'single', pricePerMillion: 10 },
  },
  latestPromptTokens: 1000,
  effectiveContextWindowTokens: 128000,
  contextWindowUsagePercent: 0.78125,
  contextCompactionThresholdTokens: null,
  latestModelProvider: 'OPENAI',
  latestModelIdentifier: 'gpt-test',
  latestRuntimeKind: 'autobyteus',
  usageReportCount: 1,
  // Each fixture's revision follows its call count unless a test sets it.
  revision: overrides.usageReportCount ?? 1,
  updatedAt: '2026-06-25T00:00:00.000Z',
  ...overrides,
});

/** A standalone run's panel shows its roll-up (REQ-006); seed it as the roll-up query would. */
const buildSummaryDto = (summary: TokenUsageRunSummary) => ({
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
  context_compaction_threshold_tokens: summary.contextCompactionThresholdTokens,
  latest_model_provider: summary.latestModelProvider,
  latest_model_identifier: summary.latestModelIdentifier,
  latest_runtime_kind: summary.latestRuntimeKind,
  usage_report_count: summary.usageReportCount,
  revision: summary.revision,
  updated_at: summary.updatedAt,
});

const buildAgentContext = (runId: string, name: string) => {
  const conversation = {
    id: runId,
    messages: [],
    createdAt: '2026-06-25T00:00:00.000Z',
    updatedAt: '2026-06-25T00:00:00.000Z',
    agentDefinitionId: `${name}-definition`,
    agentName: name,
  };
  const state = new AgentRunState(runId, conversation as any);
  state.currentStatus = AgentStatus.Idle;
  return new AgentContext({
    agentDefinitionId: `${name}-definition`,
    agentDefinitionName: name,
    runtimeKind: 'autobyteus',
    llmModelIdentifier: 'gpt-test',
    workspaceId: null,
    workspaceMetadata: null,
    autoExecuteTools: false,
    llmConfig: null,
    isLocked: true,
  } as any, state);
};


const meter = useTokenUsageMeterStore();
const contexts = useAgentContextsStore();
const selection = useAgentSelectionStore();
const { setPreference } = useLocalization();
contexts.runs.set('run-1', buildAgentContext('run-1', 'Project Task Manager'));
contexts.runs.set('other-run', buildAgentContext('other-run', 'Historical Agent'));
contexts.runs.get('run-1')!.state.currentStatus = AgentStatus.Running;
selection.setRunSelection('run-1', 'agent');
let revision = 0;
const actions = ['Baseline', 'Second', 'Third', 'Zero', 'Invalid', 'Totals', 'Offline', 'Other', 'Host', 'Chinese', 'English'];
function perform(action: string) {
  if (action === 'Chinese' || action === 'English') { void setPreference(action === 'Chinese' ? 'zh-CN' : 'en'); return; }
  if (action === 'Other' || action === 'Host') { selection.setRunSelection(action === 'Other' ? 'other-run' : 'run-1', 'agent'); return; }
  if (action === 'Offline') { contexts.runs.get('run-1')!.state.currentStatus = AgentStatus.Offline; return; }
  if (action === 'Totals') { meter.upsertRecordBackedStandaloneRunSummary({ runId: 'run-1', summary: buildSummary({ outputTokens: 99999, latestModelIdentifier: 'aggregate-child-model' }) }); return; }
  const seconds = ({ Baseline: 0, Second: 10, Third: 15, Zero: 20, Invalid: 20 } as Record<string, number>)[action];
  revision++;
  meter.applyTokenUsageUpdated({ usage_event_id: `preview-${revision}`, idempotency_key: `preview-${revision}`,
    run_id: 'run-1', turn_id: 'preview-turn', reports_model_call: true,
    model_identifier: 'exact-reported-model-with-a-long-identity-for-narrow-panel-checks',
    observed_at: `2026-10-13T10:00:${String(seconds).padStart(2, '0')}.000Z`,
    meter_delta_output_tokens: action === 'Zero' ? 0 : action === 'Third' ? 150 : 200,
    run_summary_after_event: buildSummaryDto(buildSummary({ revision, usageReportCount: revision })),
  });
}
</script>
