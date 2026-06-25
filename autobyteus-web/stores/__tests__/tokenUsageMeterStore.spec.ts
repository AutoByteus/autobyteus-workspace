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

const buildPayload = (overrides: Partial<TokenUsageUpdatedPayload> = {}): TokenUsageUpdatedPayload => ({
  usage_event_id: 'usage-event-1',
  idempotency_key: 'usage-key-1',
  observed_at: '2026-06-24T10:00:00.000Z',
  run_id: 'run-1',
  runtime_kind: 'codex_app_server',
  model_provider: 'OPENAI',
  model_identifier: 'gpt-5.4-mini',
  usage_scope: 'per_turn',
  reported_input_tokens: 100,
  reported_output_tokens: 25,
  reported_total_tokens: 125,
  accounting_input_tokens: 100,
  accounting_output_tokens: 25,
  accounting_total_tokens: 125,
  meter_delta_input_tokens: 100,
  meter_delta_output_tokens: 25,
  meter_delta_total_tokens: 125,
  estimated_api_input_cost: 0.001,
  estimated_api_output_cost: 0.002,
  estimated_api_total_cost: 0.003,
  currency: 'USD',
  api_cost_status: 'estimated',
  ...overrides,
});

describe('tokenUsageMeterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('applies live usage events idempotently and falls back to the active context run id', () => {
    const store = useTokenUsageMeterStore();
    const context = buildContext('run-from-context');
    const payload = buildPayload({ run_id: '' });

    handleTokenUsageUpdated(payload as any, context);
    handleTokenUsageUpdated(payload as any, context);

    expect(store.getRunSummary('run-from-context')).toMatchObject({
      runId: 'run-from-context',
      inputTokens: 100,
      outputTokens: 25,
      totalTokens: 125,
      estimatedApiTotalCost: 0.003,
      currency: 'USD',
      apiCostStatus: 'estimated',
      eventCount: 1,
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
      accounting_input_tokens: 40,
      accounting_output_tokens: 10,
      accounting_total_tokens: 50,
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
      accounting_input_tokens: 20,
      accounting_output_tokens: 5,
      accounting_total_tokens: 25,
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
      inputTokens: 60,
      outputTokens: 15,
      totalTokens: 75,
      estimatedApiTotalCost: 0.002,
      apiCostStatus: 'mixed',
      eventCount: 2,
    });
  });

  it('lets ledger-backed reload summaries replace provisional live summaries', () => {
    const store = useTokenUsageMeterStore();

    store.applyTokenUsageUpdated(buildPayload({
      run_id: 'run-reload-1',
      accounting_total_tokens: 10,
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
      inputTokens: 250,
      outputTokens: 50,
      totalTokens: 300,
      estimatedApiInputCost: null,
      estimatedApiOutputCost: null,
      estimatedApiTotalCost: null,
      currency: null,
      apiCostStatus: 'price_missing',
      latestContextInputTokens: 200,
      effectiveContextBudgetTokens: 1000,
      contextPressurePercent: 20,
      latestModelProvider: 'OPENAI',
      latestModelIdentifier: 'unpriced-model',
      latestRuntimeKind: 'codex_app_server',
      eventCount: 3,
      updatedAt: '2026-06-24T10:05:00.000Z',
    });

    expect(store.getRunSummary('run-reload-1')).toMatchObject({
      inputTokens: 250,
      outputTokens: 50,
      totalTokens: 300,
      estimatedApiTotalCost: null,
      apiCostStatus: 'price_missing',
      contextPressurePercent: 20,
      eventCount: 3,
    });
  });
});
