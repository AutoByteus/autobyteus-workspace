import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTokenUsageMeterStore } from '../tokenUsageMeterStore';
import { handleTokenUsageUpdated } from '~/services/agentStreaming/handlers/tokenUsageHandler';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { TokenUsageUpdatedPayload } from '~/types/tokenUsageMeter';

const buildContext = (runId = 'run-context-1'): AgentContext => ({
  state: { runId },
  conversation: { messages: [], updatedAt: '' },
}) as unknown as AgentContext;

const buildPayload = (overrides: Partial<TokenUsageUpdatedPayload> = {}): TokenUsageUpdatedPayload => {
  const grossInput = overrides.meter_delta_input_tokens ?? 100;
  const output = overrides.meter_delta_output_tokens ?? 25;
  const total = overrides.meter_delta_total_tokens ?? grossInput + output;
  const cacheRead = overrides.cache_read_input_tokens ?? 0;
  const cacheCreation = overrides.cache_creation_input_tokens ?? 0;
  const standardInput = overrides.standard_input_tokens ?? Math.max(grossInput - cacheRead - cacheCreation, 0);
  return {
    usage_event_id: 'usage-event-1',
    idempotency_key: 'usage-key-1',
    observed_at: '2026-06-24T10:00:00.000Z',
    run_id: 'run-1',
    runtime_kind: 'codex_app_server',
    model_provider: 'OPENAI',
    model_identifier: 'gpt-5.4-mini',
    usage_scope: 'per_turn',
    input_token_semantic: 'gross_includes_cache',
    standard_input_tokens: standardInput,
    cache_miss_input_tokens: standardInput,
    cache_read_input_tokens: cacheRead,
    cache_creation_input_tokens: cacheCreation,
    cache_creation_5m_input_tokens: 0,
    cache_creation_1h_input_tokens: 0,
    cache_state: cacheRead > 0 || cacheCreation > 0 ? 'positive' : 'not_reported',
    billable_output_tokens: output,
    meter_delta_input_tokens: grossInput,
    meter_delta_output_tokens: output,
    meter_delta_total_tokens: total,
    estimated_api_input_cost: 0.001,
    estimated_api_standard_input_cost: 0.001,
    estimated_api_cache_read_input_cost: null,
    estimated_api_cache_creation_input_cost: null,
    estimated_api_cache_creation_5m_input_cost: null,
    estimated_api_cache_creation_1h_input_cost: null,
    reasoning_output_tokens: 0,
    estimated_api_output_cost: 0.002,
    estimated_api_reasoning_output_cost: null,
    estimated_api_total_cost: 0.003,
    currency: 'USD',
    api_cost_status: 'estimated',
    missing_price_dimensions: [],
    pricing_policy_key: 'catalog:openai:gpt-5.4-mini',
    selected_pricing_tier_id: null,
    latest_prompt_tokens: null,
    effective_context_window_tokens: null,
    context_window_usage_percent: null,
    ...overrides,
  };
};

describe('tokenUsageMeterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('applies live usage events idempotently and uses the active context run id when omitted', () => {
    const store = useTokenUsageMeterStore();
    const context = buildContext('run-from-context');
    const payload = buildPayload({ run_id: '' });

    handleTokenUsageUpdated(payload as any, context);
    handleTokenUsageUpdated(payload as any, context);

    expect(store.getRunSummary('run-from-context')).toMatchObject({
      runId: 'run-from-context',
      grossInputTokens: 100,
      standardInputTokens: 100,
      outputTokens: 25,
      totalTokens: 125,
      reasoningOutputTokens: 0,
      estimatedApiTotalCost: 0.003,
      currency: 'USD',
      apiCostStatus: 'estimated',
      usageReportCount: 1,
      latestModelIdentifier: 'gpt-5.4-mini',
      latestRuntimeKind: 'codex_app_server',
    });
  });

  it('aggregates member events into team summary and reports mixed priced/unpriced status', () => {
    const store = useTokenUsageMeterStore();

    store.applyTokenUsageUpdated(buildPayload({
      usage_event_id: 'team-priced-event',
      idempotency_key: 'team-priced-key',
      run_id: 'member-run-1',
      root_team_run_id: 'team-run-1',
      member_agent_run_id: 'member-run-1',
      member_path: ['worker'],
      member_route_key: 'worker',
      meter_delta_input_tokens: 40,
      meter_delta_output_tokens: 10,
      meter_delta_total_tokens: 50,
      estimated_api_input_cost: 0.001,
      estimated_api_output_cost: 0.001,
      estimated_api_total_cost: 0.002,
      api_cost_status: 'estimated',
    }));

    store.applyTokenUsageUpdated(buildPayload({
      usage_event_id: 'team-unpriced-event',
      idempotency_key: 'team-unpriced-key',
      run_id: 'member-run-2',
      root_team_run_id: 'team-run-1',
      member_agent_run_id: 'member-run-2',
      member_path: ['reviewer'],
      member_route_key: 'reviewer',
      meter_delta_input_tokens: 20,
      meter_delta_output_tokens: 5,
      meter_delta_total_tokens: 25,
      estimated_api_input_cost: null,
      estimated_api_output_cost: null,
      estimated_api_total_cost: null,
      currency: null,
      api_cost_status: 'price_missing',
      model_identifier: 'unknown-model',
    }));

    expect(store.getRunSummary('member-run-1')).toMatchObject({
      totalTokens: 50,
      estimatedApiTotalCost: 0.002,
      apiCostStatus: 'estimated',
    });
    expect(store.getRunSummary('member-run-2')).toMatchObject({
      totalTokens: 25,
      estimatedApiTotalCost: null,
      apiCostStatus: 'price_missing',
    });
    expect(store.getTeamSummary('team-run-1')).toMatchObject({
      runId: 'team-run-1',
      grossInputTokens: 60,
      standardInputTokens: 60,
      outputTokens: 15,
      totalTokens: 75,
      estimatedApiTotalCost: 0.002,
      apiCostStatus: 'mixed',
      usageReportCount: 2,
    });
  });


  it('aggregates Codex runtime reasoning and context fields from live usage events', () => {
    const store = useTokenUsageMeterStore();

    store.applyTokenUsageUpdated(buildPayload({
      usage_event_id: 'reasoning-event',
      idempotency_key: 'reasoning-key',
      runtime_kind: 'codex_app_server',
      model_identifier: 'gpt-5.4-mini',
      reasoning_output_tokens: 12,
      estimated_api_input_cost: 0.0011,
      estimated_api_reasoning_output_cost: 0.0012,
      estimated_api_output_cost: 0.0025,
      estimated_api_total_cost: 0.0036,
      latest_prompt_tokens: 384,
      effective_context_window_tokens: 1_024,
      context_window_usage_percent: 37.5,
    }));

    expect(store.getRunSummary('run-1')).toMatchObject({
      reasoningOutputTokens: 12,
      estimatedApiInputCost: 0.0011,
      estimatedApiReasoningOutputCost: 0.0012,
      estimatedApiOutputCost: 0.0025,
      estimatedApiTotalCost: 0.0036,
      latestPromptTokens: 384,
      effectiveContextWindowTokens: 1_024,
      contextWindowUsagePercent: 37.5,
      latestModelIdentifier: 'gpt-5.4-mini',
      latestRuntimeKind: 'codex_app_server',
    });
  });
  it('clears aggregate costs when live events mix currencies', () => {
    const store = useTokenUsageMeterStore();

    store.applyTokenUsageUpdated(buildPayload({
      usage_event_id: 'usd-event',
      idempotency_key: 'usd-key',
      estimated_api_total_cost: 0.003,
      currency: 'USD',
    }));
    store.applyTokenUsageUpdated(buildPayload({
      usage_event_id: 'cny-event',
      idempotency_key: 'cny-key',
      meter_delta_input_tokens: 50,
      meter_delta_output_tokens: 10,
      meter_delta_total_tokens: 60,
      estimated_api_input_cost: 0.02,
      estimated_api_output_cost: 0.04,
      estimated_api_total_cost: 0.06,
      currency: 'CNY',
    }));

    expect(store.getRunSummary('run-1')).toMatchObject({
      grossInputTokens: 150,
      standardInputTokens: 150,
      outputTokens: 35,
      totalTokens: 185,
      estimatedApiInputCost: null,
      estimatedApiOutputCost: null,
      estimatedApiTotalCost: null,
      currency: null,
      apiCostStatus: 'mixed',
    });
  });

  it('lets ledger-backed reload summaries replace provisional live summaries', () => {
    const store = useTokenUsageMeterStore();

    store.applyTokenUsageUpdated(buildPayload({
      run_id: 'run-reload-1',
      meter_delta_total_tokens: 10,
    }));
    store.upsertSummary({
      runId: 'run-reload-1',
      rootTeamRunId: null,
      teamRunPath: null,
      memberAgentRunId: null,
      memberPath: null,
      memberRouteKey: null,
      agentDefinitionId: 'agent-def-1',
      workspaceId: 'workspace-1',
      grossInputTokens: 250,
      standardInputTokens: 250,
      cacheMissInputTokens: 250,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheCreation5mInputTokens: 0,
      cacheCreation1hInputTokens: 0,
      outputTokens: 50,
      billableOutputTokens: 50,
      totalTokens: 300,
      cacheReadInputTokenRate: 0,
      standardInputTokenRate: 1,
      cacheCreationInputTokenRate: 0,
      cacheState: 'not_reported',
      reasoningOutputTokens: 0,
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
      latestPromptTokens: 200,
      effectiveContextWindowTokens: 1000,
      contextWindowUsagePercent: 20,
      latestModelProvider: 'OPENAI',
      latestModelIdentifier: 'unpriced-model',
      latestRuntimeKind: 'codex_app_server',
      usageReportCount: 3,
      updatedAt: '2026-06-24T10:05:00.000Z',
    });

    expect(store.getRunSummary('run-reload-1')).toMatchObject({
      grossInputTokens: 250,
      outputTokens: 50,
      totalTokens: 300,
      estimatedApiTotalCost: null,
      apiCostStatus: 'price_missing',
      contextWindowUsagePercent: 20,
      usageReportCount: 3,
    });
  });
});
