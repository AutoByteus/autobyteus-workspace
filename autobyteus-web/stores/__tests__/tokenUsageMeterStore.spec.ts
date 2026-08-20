import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { TokenUsageRunSummaryDto } from '@autobyteus/team-stream-contracts';
import { useTokenUsageMeterStore } from '../tokenUsageMeterStore';
import { handleTokenUsageUpdated } from '~/services/agentStreaming/handlers/tokenUsageHandler';
import { mapTokenUsageRunSummaryDto } from '~/services/agentStreaming/tokenUsageRunSummaryMapper';
import { getApolloClient } from '~/utils/apolloClient';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { TeamTokenUsageDetails, TokenUsageRunSummary, TokenUsageUpdatedPayload } from '~/types/tokenUsageMeter';

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}));

const buildContext = (runId = 'run-context-1'): AgentContext => ({
  state: { runId },
  conversation: { messages: [], updatedAt: '' },
}) as unknown as AgentContext;

const buildSummary = (overrides: Partial<TokenUsageRunSummary> = {}): TokenUsageRunSummary => ({
  runId: 'run-1',
  rootTeamRunId: null,
  agentDefinitionId: 'agent-definition-1',
  workspaceId: 'workspace-1',
  grossInputTokens: 300,
  standardInputTokens: 180,
  cacheMissInputTokens: 180,
  cacheReadInputTokens: 80,
  cacheCreationInputTokens: 40,
  cacheCreation5mInputTokens: 10,
  cacheCreation1hInputTokens: 20,
  outputTokens: 50,
  reasoningOutputTokens: 12,
  billableOutputTokens: 50,
  totalTokens: 350,
  cacheReadInputTokenRate: 80 / 300,
  standardInputTokenRate: 0.6,
  cacheCreationInputTokenRate: 40 / 300,
  cacheState: 'positive',
  estimatedApiInputCost: 0.003,
  estimatedApiStandardInputCost: 0.0018,
  estimatedApiCacheReadInputCost: 0.00008,
  estimatedApiCacheCreationInputCost: 0.00024,
  estimatedApiCacheCreation5mInputCost: 0.00006,
  estimatedApiCacheCreation1hInputCost: 0.0002,
  estimatedApiOutputCost: 0.002,
  estimatedApiReasoningOutputCost: 0.0004,
  estimatedApiTotalCost: 0.005,
  currency: 'USD',
  apiCostStatus: 'estimated',
  missingPriceDimensions: [],
  pricingPolicyKey: 'catalog:openai:gpt-5.6-sol',
  selectedPricingTierId: 'standard',
  unitPrices: {
    standardInput: { status: 'single', pricePerMillion: 10 },
    cacheReadInput: { status: 'single', pricePerMillion: 1 },
    cacheCreationInput: { status: 'single', pricePerMillion: 6 },
    cacheCreation5mInput: { status: 'single', pricePerMillion: 6 },
    cacheCreation1hInput: { status: 'single', pricePerMillion: 10 },
    output: { status: 'single', pricePerMillion: 30 },
    reasoningOutput: { status: 'single', pricePerMillion: 30 },
  },
  latestPromptTokens: 200,
  effectiveContextWindowTokens: 128_000,
  contextWindowUsagePercent: 0.15625,
  latestModelProvider: 'OPENAI',
  latestModelIdentifier: 'gpt-5.6-sol',
  latestRuntimeKind: 'codex_app_server',
  usageReportCount: 3,
  updatedAt: '2026-08-20T10:05:00.000Z',
  ...overrides,
});

const buildSummaryDto = (overrides: Partial<TokenUsageRunSummaryDto> = {}): TokenUsageRunSummaryDto => ({
  run_id: 'run-1',
  root_team_run_id: null,
  agent_definition_id: 'agent-definition-1',
  workspace_id: 'workspace-1',
  gross_input_tokens: 300,
  standard_input_tokens: 180,
  cache_miss_input_tokens: 180,
  cache_read_input_tokens: 80,
  cache_creation_input_tokens: 40,
  cache_creation_5m_input_tokens: 10,
  cache_creation_1h_input_tokens: 20,
  output_tokens: 50,
  reasoning_output_tokens: 12,
  billable_output_tokens: 50,
  total_tokens: 350,
  cache_read_input_token_rate: 80 / 300,
  standard_input_token_rate: 0.6,
  cache_creation_input_token_rate: 40 / 300,
  cache_state: 'positive',
  estimated_api_input_cost: 0.003,
  estimated_api_standard_input_cost: 0.0018,
  estimated_api_cache_read_input_cost: 0.00008,
  estimated_api_cache_creation_input_cost: 0.00024,
  estimated_api_cache_creation_5m_input_cost: 0.00006,
  estimated_api_cache_creation_1h_input_cost: 0.0002,
  estimated_api_output_cost: 0.002,
  estimated_api_reasoning_output_cost: 0.0004,
  estimated_api_total_cost: 0.005,
  currency: 'USD',
  api_cost_status: 'estimated',
  missing_price_dimensions: [],
  pricing_policy_key: 'catalog:openai:gpt-5.6-sol',
  selected_pricing_tier_id: 'standard',
  unit_prices: {
    standard_input: { status: 'single', price_per_million: 10 },
    cache_read_input: { status: 'single', price_per_million: 1 },
    cache_creation_input: { status: 'single', price_per_million: 6 },
    cache_creation_5m_input: { status: 'single', price_per_million: 6 },
    cache_creation_1h_input: { status: 'single', price_per_million: 10 },
    output: { status: 'single', price_per_million: 30 },
    reasoning_output: { status: 'single', price_per_million: 30 },
  },
  latest_prompt_tokens: 200,
  effective_context_window_tokens: 128_000,
  context_window_usage_percent: 0.15625,
  latest_model_provider: 'OPENAI',
  latest_model_identifier: 'gpt-5.6-sol',
  latest_runtime_kind: 'codex_app_server',
  usage_report_count: 3,
  updated_at: '2026-08-20T10:05:00.000Z',
  ...overrides,
});

const buildPayload = (overrides: Partial<TokenUsageUpdatedPayload> = {}): TokenUsageUpdatedPayload => ({
  usage_event_id: 'usage-event-1',
  idempotency_key: 'usage-key-1',
  observed_at: '2026-08-20T10:00:00.000Z',
  run_id: 'run-1',
  runtime_kind: 'codex_app_server',
  model_provider: 'OPENAI',
  model_identifier: 'gpt-5.6-sol',
  usage_scope: 'per_turn',
  input_token_semantic: 'gross_includes_cache',
  standard_input_tokens: 0,
  cache_miss_input_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_creation_5m_input_tokens: 0,
  cache_creation_1h_input_tokens: 0,
  cache_state: 'not_reported',
  reasoning_output_tokens: 0,
  billable_output_tokens: 0,
  meter_delta_input_tokens: 0,
  meter_delta_output_tokens: 0,
  meter_delta_total_tokens: 0,
  estimated_api_input_cost: null,
  estimated_api_standard_input_cost: null,
  estimated_api_cache_read_input_cost: null,
  estimated_api_cache_creation_input_cost: null,
  estimated_api_cache_creation_5m_input_cost: null,
  estimated_api_cache_creation_1h_input_cost: null,
  estimated_api_output_cost: null,
  estimated_api_reasoning_output_cost: null,
  estimated_api_total_cost: null,
  currency: null,
  api_cost_status: 'price_missing',
  missing_price_dimensions: ['input'],
  pricing_policy_key: null,
  selected_pricing_tier_id: null,
  latest_prompt_tokens: null,
  effective_context_window_tokens: null,
  context_window_usage_percent: null,
  run_summary_after_event: buildSummaryDto(),
  quality_flags: [],
  ...overrides,
});

const buildTeamPayload = (
  agentRunId: string,
  overrides: Partial<TeamTokenUsageDetails> = {},
): TeamTokenUsageDetails => ({
  change_sequence: 1,
  agent_run_id: agentRunId,
  usage_event_id: `event-${agentRunId}`,
  idempotency_key: `key-${agentRunId}`,
  observed_at: '2026-08-20T10:00:00.000Z',
  turn_id: null,
  llm_call_id: null,
  model_provider: 'OPENAI',
  model_identifier: 'gpt-5.6-sol',
  model_value: null,
  usage_scope: 'per_turn',
  input_token_semantic: 'gross_includes_cache',
  standard_input_tokens: 40,
  cache_miss_input_tokens: 40,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_creation_5m_input_tokens: 0,
  cache_creation_1h_input_tokens: 0,
  cache_state: 'not_reported',
  reasoning_output_tokens: 0,
  billable_output_tokens: 10,
  meter_delta_input_tokens: 40,
  meter_delta_output_tokens: 10,
  meter_delta_total_tokens: 50,
  input_price_per_million: 10,
  output_price_per_million: 30,
  cached_input_read_price_per_million: null,
  cached_input_write_price_per_million: null,
  cached_input_write_5m_price_per_million: null,
  cached_input_write_1h_price_per_million: null,
  estimated_api_input_cost: 0.0004,
  estimated_api_standard_input_cost: 0.0004,
  estimated_api_cache_read_input_cost: null,
  estimated_api_cache_creation_input_cost: null,
  estimated_api_cache_creation_5m_input_cost: null,
  estimated_api_cache_creation_1h_input_cost: null,
  estimated_api_output_cost: 0.0003,
  estimated_api_reasoning_output_cost: null,
  estimated_api_total_cost: 0.0007,
  currency: 'USD',
  api_cost_status: 'estimated',
  missing_price_dimensions: [],
  pricing_policy_key: 'catalog:openai:gpt-5.6-sol',
  selected_pricing_tier_id: 'standard',
  latest_prompt_tokens: 200,
  effective_context_window_tokens: 128_000,
  context_window_usage_percent: 0.15625,
  run_summary_after_event: buildSummaryDto({
    run_id: agentRunId,
    root_team_run_id: 'team-run-1',
  }),
  quality_flags: [],
  ...overrides,
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('tokenUsageMeterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('admits only the persisted standalone snapshot and deduplicates its event identity', () => {
    const store = useTokenUsageMeterStore();
    const payload = buildPayload({ run_id: '' });

    expect(handleTokenUsageUpdated(payload, buildContext('run-1'))).toBe(true);
    expect(handleTokenUsageUpdated(payload, buildContext('run-1'))).toBe(false);

    expect(store.getRunSummary('run-1')).toEqual(buildSummary());
    expect(store.getRunSummary('run-1')).toMatchObject({
      grossInputTokens: 300,
      totalTokens: 350,
      estimatedApiTotalCost: 0.005,
      latestRuntimeKind: 'codex_app_server',
      usageReportCount: 3,
    });
    expect(store.needsAgentRunSummaryHydration('run-1')).toBe(false);
  });

  it('keeps standalone hydration required when a live event has no persisted snapshot', () => {
    const store = useTokenUsageMeterStore();

    expect(store.applyTokenUsageUpdated(buildPayload({ run_summary_after_event: null }))).toBe(false);
    expect(store.getRunSummary('run-1')).toBeNull();
    expect(store.needsAgentRunSummaryHydration('run-1')).toBe(true);
  });

  it('uses usageReportCount to reject stale/equal run snapshots across a live/fetch race', async () => {
    const store = useTokenUsageMeterStore();
    const pending = deferred<{ data: { getAgentRunTokenUsageSummary: TokenUsageRunSummary } }>();
    vi.mocked(getApolloClient).mockReturnValue({ query: vi.fn(() => pending.promise) } as any);

    const fetchPromise = store.fetchAgentRunSummary('run-1');
    store.applyTokenUsageUpdated(buildPayload({
      usage_event_id: 'new-live-event',
      run_summary_after_event: buildSummaryDto({ usage_report_count: 5, total_tokens: 500 }),
    }));
    pending.resolve({ data: { getAgentRunTokenUsageSummary: buildSummary({ usageReportCount: 4, totalTokens: 400 }) } });

    await expect(fetchPromise).resolves.toMatchObject({ usageReportCount: 5, totalTokens: 500 });
    expect(store.upsertRecordBackedAgentRunSummary({
      runId: 'run-1',
      summary: buildSummary({ usageReportCount: 5, totalTokens: 999 }),
    })).toBe(false);
    expect(store.upsertRecordBackedAgentRunSummary({
      runId: 'run-1',
      summary: buildSummary({ usageReportCount: 6, totalTokens: 600 }),
    })).toBe(true);
    expect(store.getRunSummary('run-1')).toMatchObject({ usageReportCount: 6, totalTokens: 600 });
  });

  it('admits the exact cumulative team-member snapshot and keeps compound team identity', () => {
    const store = useTokenUsageMeterStore();
    const details = buildTeamPayload('member-run-1');

    expect(store.applyTeamTokenUsage('team-run-1', 'member-run-1', details)).toBe(true);
    expect(store.getTeamMemberSummary({ teamRunId: 'team-run-1', agentRunId: 'member-run-1' })).toMatchObject({
      runId: 'member-run-1',
      rootTeamRunId: 'team-run-1',
      totalTokens: 350,
      latestRuntimeKind: 'codex_app_server',
      usageReportCount: 3,
    });
    expect(store.getTeamMemberSummary({ teamRunId: 'another-team', agentRunId: 'member-run-1' })).toBeNull();
    expect(store.needsTeamMemberSummaryHydration({ teamRunId: 'team-run-1', agentRunId: 'member-run-1' })).toBe(false);
    expect(store.needsTeamMemberSummaryHydration({ teamRunId: 'another-team', agentRunId: 'member-run-1' })).toBe(true);
    expect(store.getTeamSummary('team-run-1')).toMatchObject({
      runId: 'team-run-1',
      rootTeamRunId: 'team-run-1',
      grossInputTokens: 40,
      outputTokens: 10,
      totalTokens: 50,
      usageReportCount: 1,
    });
    expect(store.getTeamRunSummaryState('team-run-1')).toBe('live_partial');
  });

  it('rejects missing and mismatched persisted team-member snapshots without creating readiness', () => {
    const store = useTokenUsageMeterStore();

    expect(store.applyTeamTokenUsage('team-run-1', 'member-run-1', buildTeamPayload('member-run-1', {
      run_summary_after_event: null,
    }))).toBe(false);
    expect(() => store.applyTeamTokenUsage('team-run-1', 'member-run-1', buildTeamPayload('member-run-1', {
      usage_event_id: 'mismatch-event',
      run_summary_after_event: buildSummaryDto({
        run_id: 'member-run-1',
        root_team_run_id: 'foreign-team',
      }),
    }))).toThrow('different TeamRun ID');
    expect(store.needsTeamMemberSummaryHydration({ teamRunId: 'team-run-1', agentRunId: 'member-run-1' })).toBe(true);
    expect(store.getTeamSummary('team-run-1')).toBeNull();
  });

  it('rejects stale GraphQL member data after a newer live member snapshot', async () => {
    const store = useTokenUsageMeterStore();
    const pending = deferred<{ data: { getTeamMemberTokenUsageSummary: TokenUsageRunSummary } }>();
    vi.mocked(getApolloClient).mockReturnValue({ query: vi.fn(() => pending.promise) } as any);

    const fetchPromise = store.fetchTeamMemberSummary({ teamRunId: 'team-run-1', agentRunId: 'member-run-1' });
    store.applyTeamTokenUsage('team-run-1', 'member-run-1', buildTeamPayload('member-run-1', {
      usage_event_id: 'member-new-live',
      run_summary_after_event: buildSummaryDto({
        run_id: 'member-run-1',
        root_team_run_id: 'team-run-1',
        usage_report_count: 8,
        total_tokens: 800,
      }),
    }));
    pending.resolve({ data: { getTeamMemberTokenUsageSummary: buildSummary({
      runId: 'member-run-1',
      rootTeamRunId: 'team-run-1',
      usageReportCount: 7,
      totalTokens: 700,
    }) } });

    await expect(fetchPromise).resolves.toMatchObject({ usageReportCount: 8, totalTokens: 800 });
  });

  it('coalesces aggregate callers and serially refetches when persisted events dirty an inclusive response', async () => {
    const store = useTokenUsageMeterStore();
    const first = deferred<{ data: { getTeamRunTokenUsageSummary: TokenUsageRunSummary } }>();
    const second = deferred<{ data: { getTeamRunTokenUsageSummary: TokenUsageRunSummary } }>();
    let activeRequests = 0;
    let maxActiveRequests = 0;
    const responses = [first, second];
    const queryMock = vi.fn(() => {
      const response = responses[queryMock.mock.calls.length - 1]!;
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      return response.promise.finally(() => { activeRequests -= 1; });
    });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const request = store.fetchTeamRunSummary('team-run-1');
    const coalescedRequest = store.fetchTeamRunSummary('team-run-1');
    expect(queryMock).toHaveBeenCalledTimes(1);

    store.applyTeamTokenUsage('team-run-1', 'member-run-1', buildTeamPayload('member-run-1', {
      usage_event_id: 'during-first-fetch',
    }));
    first.resolve({ data: { getTeamRunTokenUsageSummary: buildSummary({
      runId: 'team-run-1',
      rootTeamRunId: 'team-run-1',
      totalTokens: 900,
    }) } });
    await flush();

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(maxActiveRequests).toBe(1);
    expect(store.getTeamSummary('team-run-1')).toMatchObject({ totalTokens: 900 });
    expect(store.getTeamRunSummaryState('team-run-1')).toBe('refresh_required');

    second.resolve({ data: { getTeamRunTokenUsageSummary: buildSummary({
      runId: 'team-run-1',
      rootTeamRunId: 'team-run-1',
      totalTokens: 950,
    }) } });
    await expect(request).resolves.toMatchObject({ totalTokens: 950 });
    await expect(coalescedRequest).resolves.toMatchObject({ totalTokens: 950 });
    expect(store.getTeamRunSummaryState('team-run-1')).toBe('record_backed');
    expect(store.needsTeamRunSummaryHydration('team-run-1')).toBe(false);
    expect(maxActiveRequests).toBe(1);
  });

  it('does not blindly extend a record-backed aggregate with a later live delta', async () => {
    const store = useTokenUsageMeterStore();
    const queryMock = vi.fn()
      .mockResolvedValueOnce({ data: { getTeamRunTokenUsageSummary: buildSummary({
        runId: 'team-run-1', rootTeamRunId: 'team-run-1', totalTokens: 990,
      }) } })
      .mockResolvedValueOnce({ data: { getTeamRunTokenUsageSummary: buildSummary({
        runId: 'team-run-1', rootTeamRunId: 'team-run-1', totalTokens: 1_002,
      }) } });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    await store.fetchTeamRunSummary('team-run-1');
    store.applyTeamTokenUsage('team-run-1', 'member-run-1', buildTeamPayload('member-run-1', {
      usage_event_id: 'post-record-event',
      meter_delta_total_tokens: 12,
    }));

    expect(store.getTeamSummary('team-run-1')).toMatchObject({ totalTokens: 990 });
    expect(store.getTeamRunSummaryState('team-run-1')).toBe('refresh_required');
    await store.fetchTeamRunSummary('team-run-1');
    expect(store.getTeamSummary('team-run-1')).toMatchObject({ totalTokens: 1_002 });
    expect(store.getTeamRunSummaryState('team-run-1')).toBe('record_backed');
  });

  it('rejects unsafe report generations at the wire and GraphQL admission boundaries', () => {
    expect(() => mapTokenUsageRunSummaryDto({
      ...buildSummaryDto(),
      usage_report_count: Number.MAX_SAFE_INTEGER + 1,
    }, { runId: 'run-1' })).toThrow();

    const store = useTokenUsageMeterStore();
    expect(() => store.upsertRecordBackedAgentRunSummary({
      runId: 'run-1',
      summary: buildSummary({ usageReportCount: -1 }),
    })).toThrow('non-negative safe-integer');
  });
});
