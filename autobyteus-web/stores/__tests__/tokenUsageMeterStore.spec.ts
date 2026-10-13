import { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext';
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture';
import { AgentRunCollaborationContext } from '~/services/agentCollaboration/agentRunCollaborationContext';
import { agentRootView } from '~/services/agentCollaboration/__tests__/agentRootFixture';
import { createAgentContext } from '~/services/agentOrgExecution/agentOrgMemberContextFactory';
import { parseAgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { TokenUsageRunSummaryDto } from '@autobyteus/team-stream-contracts';
import { useTokenUsageMeterStore } from '../tokenUsageMeterStore';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';
import { toAgentProjectionMessage, toAgentPresentationProjectionMessage } from '~/services/agentStreaming/teamStreamDtoAdapters';
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
  contextCompactionThresholdTokens: null,
  latestModelProvider: 'OPENAI',
  latestModelIdentifier: 'gpt-5.6-sol',
  latestRuntimeKind: 'codex_app_server',
  latestSelectedRawModelId: null,
  hasCacheWriteRateAssumption: false,
  usageReportCount: 3,
  revision: 3,
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
  context_compaction_threshold_tokens: null,
  latest_model_provider: 'OPENAI',
  latest_model_identifier: 'gpt-5.6-sol',
  latest_runtime_kind: 'codex_app_server',
  usage_report_count: 3,
  revision: 3,
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
  context_compaction_threshold_tokens: null,
  reports_model_call: true,
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
  context_compaction_threshold_tokens: null,
  reports_model_call: true,
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

  it('uses revision to reject stale/equal run snapshots across a live/fetch race (D-9)', async () => {
    const store = useTokenUsageMeterStore();
    const pending = deferred<{ data: { getAgentRunTokenUsageSummary: TokenUsageRunSummary } }>();
    vi.mocked(getApolloClient).mockReturnValue({ query: vi.fn(() => pending.promise) } as any);

    const fetchPromise = store.fetchAgentRunSummary('run-1');
    store.applyTokenUsageUpdated(buildPayload({
      usage_event_id: 'new-live-event',
      run_summary_after_event: buildSummaryDto({ usage_report_count: 5, revision: 5, total_tokens: 500 }),
    }));
    pending.resolve({ data: { getAgentRunTokenUsageSummary: buildSummary({ usageReportCount: 4, revision: 4, totalTokens: 400 }) } });

    await expect(fetchPromise).resolves.toMatchObject({ usageReportCount: 5, totalTokens: 500 });
    expect(store.upsertRecordBackedAgentRunSummary({
      runId: 'run-1',
      summary: buildSummary({ usageReportCount: 9, revision: 5, totalTokens: 999 }),
    })).toBe(false);
    expect(store.upsertRecordBackedAgentRunSummary({
      runId: 'run-1',
      summary: buildSummary({ usageReportCount: 6, revision: 6, totalTokens: 600 }),
    })).toBe(true);
    expect(store.getRunSummary('run-1')).toMatchObject({ usageReportCount: 6, totalTokens: 600 });
  });

  it('accepts a reading-only summary with an unchanged call count (Codex compaction, D-9)', () => {
    const store = useTokenUsageMeterStore();
    store.applyTokenUsageUpdated(buildPayload({
      usage_event_id: 'call-12',
      run_summary_after_event: buildSummaryDto({ usage_report_count: 12, revision: 41, latest_prompt_tokens: 92_942 }),
    }));
    expect(store.applyTokenUsageUpdated(buildPayload({
      usage_event_id: 'compaction-reading',
      reports_model_call: false,
      run_summary_after_event: buildSummaryDto({ usage_report_count: 12, revision: 42, latest_prompt_tokens: 68_630 }),
    }))).toBe(true);
    expect(store.getRunSummary('run-1')).toMatchObject({ usageReportCount: 12, revision: 42, latestPromptTokens: 68_630 });
  });

  it('keeps a standalone roll-up on an equal revision and rejects an older one', () => {
    const store = useTokenUsageMeterStore();
    expect(store.upsertRecordBackedStandaloneRunSummary({ runId: 'run-1', summary: buildSummary({ revision: 10, totalTokens: 100 }) })).toBe(true);
    expect(store.upsertRecordBackedStandaloneRunSummary({ runId: 'run-1', summary: buildSummary({ revision: 10, totalTokens: 110 }) })).toBe(true);
    expect(store.upsertRecordBackedStandaloneRunSummary({ runId: 'run-1', summary: buildSummary({ revision: 9, totalTokens: 90 }) })).toBe(false);
    expect(store.getStandaloneRunSummary('run-1')).toMatchObject({ revision: 10, totalTokens: 110 });
  });

  it('counts only model-call events in the live team partial aggregate (D-9)', () => {
    const store = useTokenUsageMeterStore();
    store.applyTeamTokenUsage('team-run-1', 'member-run-1', buildTeamPayload('member-run-1', {
      usage_event_id: 'call-event',
      run_summary_after_event: buildSummaryDto({ run_id: 'member-run-1', root_team_run_id: 'team-run-1', revision: 1 }),
    }));
    store.applyTeamTokenUsage('team-run-1', 'member-run-1', buildTeamPayload('member-run-1', {
      usage_event_id: 'remainder-event',
      reports_model_call: false,
      meter_delta_input_tokens: 45_481,
      meter_delta_output_tokens: 0,
      meter_delta_total_tokens: 45_481,
      run_summary_after_event: buildSummaryDto({ run_id: 'member-run-1', root_team_run_id: 'team-run-1', revision: 2 }),
    }));
    expect(store.getTeamSummary('team-run-1')).toMatchObject({ usageReportCount: 1, totalTokens: 50 + 45_481 });
    expect(store.getTeamMemberSummary({ teamRunId: 'team-run-1', agentRunId: 'member-run-1' })).toMatchObject({ revision: 2 });
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

  it('preserves selected Claude SDK identity and cache assumption from stream DTO to record-backed meter', () => {
    const dto = buildSummaryDto({
      latest_runtime_kind: 'claude_agent_sdk',
      latest_model_provider: 'ANTHROPIC',
      latest_model_identifier: 'claude-opus-5-5',
      latest_selected_raw_model_id: 'claude-opus-5-5[1m]',
      has_cache_write_rate_assumption: true,
      latest_prompt_tokens: 22_135,
      effective_context_window_tokens: 1_000_000,
      context_window_usage_percent: 2.2135,
      context_compaction_threshold_tokens: 967_000,
      revision: 17,
    });
    const summary = mapTokenUsageRunSummaryDto(dto, { runId: 'run-1' });
    expect(summary).toMatchObject({ contextCompactionThresholdTokens: 967_000, revision: 17 });
    const store = useTokenUsageMeterStore();
    store.upsertRecordBackedAgentRunSummary({ runId: 'run-1', summary });
    expect(store.getRunSummary('run-1')).toMatchObject({
      latestModelIdentifier: 'claude-opus-5-5',
      latestSelectedRawModelId: 'claude-opus-5-5[1m]',
      hasCacheWriteRateAssumption: true,
      estimatedApiTotalCost: 0.005,
      latestPromptTokens: 22_135,
      effectiveContextWindowTokens: 1_000_000,
      contextWindowUsagePercent: 2.2135,
    });
    expect(JSON.stringify(store.getRunSummary('run-1'))).not.toContain('haiku');
  });

  it('keeps a mark made with no exact summary loaded through a remainder event and a fetched summary (D-13, SR-014)', () => {
    // A reopened standalone run: only its roll-up was fetched when the compaction completes.
    const store = useTokenUsageMeterStore();
    store.upsertRecordBackedStandaloneRunSummary({ runId: 'run-1', summary: buildSummary({ usageReportCount: 30, revision: 40 }) });
    store.markCompactionCompleted('run-1');
    expect(store.isAwaitingPostCompactionReading('run-1')).toBe(true);
    // The Claude turn-end remainder after a manual /compact is a live event without a model call.
    store.applyTokenUsageUpdated(buildPayload({
      usage_event_id: 'turn-end-remainder', reports_model_call: false,
      run_summary_after_event: buildSummaryDto({ usage_report_count: 12, revision: 13 }),
    }));
    // Fetched or hydrated summaries never clear the mark.
    store.upsertRecordBackedAgentRunSummary({ runId: 'run-1', summary: buildSummary({ usageReportCount: 12, revision: 14 }) });
    store.upsertRecordBackedStandaloneRunSummary({ runId: 'run-1', summary: buildSummary({ usageReportCount: 31, revision: 41 }) });
    expect(store.isAwaitingPostCompactionReading('run-1')).toBe(true);
    // The run's next live model call clears it, even when its summary is not newer than the stored one.
    store.applyTokenUsageUpdated(buildPayload({
      usage_event_id: 'next-call', reports_model_call: true,
      run_summary_after_event: buildSummaryDto({ usage_report_count: 13, revision: 14 }),
    }));
    expect(store.isAwaitingPostCompactionReading('run-1')).toBe(false);
  });

  it("does not clear the host mark on a child's live model call (D-13)", () => {
    const store = useTokenUsageMeterStore();
    store.markCompactionCompleted('run-1');
    store.applyTokenUsageUpdated(buildPayload({
      usage_event_id: 'child-call', run_id: 'child-run', reports_model_call: true,
      run_summary_after_event: buildSummaryDto({ run_id: 'child-run' }),
    }));
    expect(store.isAwaitingPostCompactionReading('run-1')).toBe(true);
    expect(store.isAwaitingPostCompactionReading('child-run')).toBe(false);
  });

  it('clears a Team member mark only on its next live model call, idempotently (D-13, SR-014)', () => {
    const store = useTokenUsageMeterStore();
    const member = (eventId: string, reportsModelCall: boolean, revision: number) =>
      store.applyTeamTokenUsage('team-run-1', 'member-run-1', buildTeamPayload('member-run-1', {
        usage_event_id: eventId, reports_model_call: reportsModelCall,
        run_summary_after_event: buildSummaryDto({ run_id: 'member-run-1', root_team_run_id: 'team-run-1', revision }),
      }));
    store.markCompactionCompleted('member-run-1');
    member('turn-end-remainder', false, 5);
    expect(store.isAwaitingPostCompactionReading('member-run-1')).toBe(true);
    member('next-call', true, 6);
    expect(store.isAwaitingPostCompactionReading('member-run-1')).toBe(false);
    // A replayed event and the same event reaching the agent entry point are harmless.
    member('next-call', true, 6);
    store.applyTokenUsageUpdated(buildPayload({ usage_event_id: 'next-call', run_id: 'member-run-1', reports_model_call: true,
      run_summary_after_event: buildSummaryDto({ run_id: 'member-run-1', root_team_run_id: 'team-run-1', revision: 6 }) }));
    expect(store.isAwaitingPostCompactionReading('member-run-1')).toBe(false);
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
    expect(() => store.upsertRecordBackedAgentRunSummary({
      runId: 'run-1',
      summary: buildSummary({ revision: Number.MAX_SAFE_INTEGER + 1 }),
    })).toThrow('non-negative safe-integer revision');
    expect(() => mapTokenUsageRunSummaryDto({ ...buildSummaryDto(), revision: undefined }, { runId: 'run-1' })).toThrow();
  });
});

describe('live-only exact AgentRun throughput admission', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); });
  const live = (revision: number, seconds: number, extra: Partial<TokenUsageUpdatedPayload> = {}) => buildPayload({
    usage_event_id: `live-${revision}`, idempotency_key: `live-key-${revision}`, turn_id: 'turn',
    observed_at: `2026-10-13T10:00:${String(seconds).padStart(2, '0')}.000Z`,
    meter_delta_output_tokens: 200,
    run_summary_after_event: buildSummaryDto({ revision, usage_report_count: revision }),
    ...extra,
  });

  it('never hydrates throughput, rejects stale live summaries, and re-baselines across a newer fetch', () => {
    const store = useTokenUsageMeterStore();
    store.upsertRecordBackedAgentRunSummary({ runId: 'run-1', summary: buildSummary({ revision: 9 }) });
    store.upsertRecordBackedStandaloneRunSummary({ runId: 'run-1', summary: buildSummary({ outputTokens: 999999 }) });
    expect(store.getRunThroughput('run-1')).toBeNull();
    expect(store.applyTokenUsageUpdated(live(8, 0))).toBe(false);
    expect(store.getRunThroughput('run-1')).toBeNull();
    store.applyTokenUsageUpdated(live(10, 0));
    store.applyTokenUsageUpdated(live(11, 10));
    expect(store.getRunThroughput('run-1')).toMatchObject({ tokensPerSecond: 20 });
    store.upsertRecordBackedAgentRunSummary({ runId: 'run-1', summary: buildSummary({ revision: 12 }) });
    expect(store.getRunThroughput('run-1')).toMatchObject({ tokensPerSecond: 20 });
    expect(store.applyTokenUsageUpdated(live(12, 15))).toBe(false);
    store.applyTokenUsageUpdated(live(13, 20));
    expect(store.getRunThroughput('run-1')?.status).toBe('collecting');
    expect(store.getStandaloneRunSummary('run-1')?.outputTokens).toBe(999999);
  });

  it('observes actual Team view record-usage + dispatch-agent effects once with summary runtime', () => {
    const store = useTokenUsageMeterStore();
    const team = buildTestTeamContext({ teamRunId: 'team', rootChildren: [testAgentNode('/lead', { agentRunId: 'member' })], coordinatorAddress: '/lead' });
    for (const [revision, seconds] of [[1, 0], [2, 10], [3, 15]]) {
      const details = buildTeamPayload('member', {
        usage_event_id: `team-event-${revision}`, idempotency_key: `team-key-${revision}`,
        change_sequence: revision, turn_id: 'team-turn',
        observed_at: `2026-10-13T10:00:${String(seconds).padStart(2, '0')}.000Z`,
        meter_delta_output_tokens: revision === 3 ? 150 : 200,
        run_summary_after_event: buildSummaryDto({ run_id: 'member', root_team_run_id: 'team', revision, usage_report_count: revision }),
      });
      const result = team.view.applyMessage({ type: 'TOKEN_USAGE_UPDATED', payload: details });
      expect(result.disposition).toBe('applied');
      expect(result.effects.map((effect) => effect.kind)).toEqual(['record_team_token_usage', 'dispatch_agent']);
      for (const effect of result.effects) {
        if (effect.kind === 'record_team_token_usage') {
          expect(store.applyTeamTokenUsage(team.view.getRootTeamRunId(), effect.agentRunId, effect.details)).toBe(true);
        } else if (effect.kind === 'dispatch_agent') {
          const projection = toAgentProjectionMessage(effect.message, effect.agentRunId);
          if (projection.type !== 'TOKEN_USAGE_UPDATED') throw new Error('Expected usage projection');
          expect(handleTokenUsageUpdated(projection.payload, team.view.getAgentContext(effect.agentRunId)!)).toBe(false);
        }
      }
      expect(store.getRunThroughput('member')).toMatchObject(revision === 1
        ? { status: 'collecting' }
        : { tokensPerSecond: revision === 2 ? 20 : 30, identity: { runId: 'member', runtimeKind: 'codex_app_server' } });
    }
    expect(store.getTeamSummary('team')?.usageReportCount).toBe(3);
    expect(store.getTeamSummary('team')?.outputTokens).toBe(550);
    expect(store.getRunThroughput('team')).toBeNull();
  });

  it('observes Org/collaboration presentation reports through the common handler', () => {
    const store = useTokenUsageMeterStore();
    for (const [revision, seconds] of [[1, 0], [2, 10]]) {
      const { agent_run_id, change_sequence, ...payload } = buildTeamPayload('child', {
        usage_event_id: `child-${revision}`, turn_id: 'turn',
        observed_at: `2026-10-13T10:00:${String(seconds).padStart(2, '0')}.000Z`,
        meter_delta_output_tokens: 200,
        run_summary_after_event: buildSummaryDto({ run_id: 'child', revision, usage_report_count: revision }),
      });
      const projection = toAgentPresentationProjectionMessage({ type: 'TOKEN_USAGE_UPDATED', payload }, 'child');
      if (projection.type !== 'TOKEN_USAGE_UPDATED') throw new Error('Expected usage projection');
      handleTokenUsageUpdated(projection.payload, buildContext('child'));
    }
    expect(store.getRunThroughput('child')).toMatchObject({ tokensPerSecond: 20, identity: { runId: 'child', runtimeKind: 'codex_app_server' } });
    expect(store.getRunThroughput('run-1')).toBeNull();
  });

  it('invalidates known fresh missing-summary calls without changing summary admission', () => {
    const store = useTokenUsageMeterStore();
    store.applyTokenUsageUpdated(live(1, 0));
    store.applyTokenUsageUpdated(live(2, 10));
    const saved = store.getRunSummary('run-1');
    expect(store.applyTokenUsageUpdated(live(3, 15, { run_summary_after_event: null }))).toBe(false);
    expect(store.getRunSummary('run-1')).toEqual(saved);
    expect(store.getRunThroughput('run-1')).toEqual({ status: 'unavailable', reason: 'missingSummary' });
    store.applyTokenUsageUpdated(live(3, 20));
    expect(store.getRunThroughput('run-1')?.status).toBe('collecting');
    store.applyTokenUsageUpdated(live(4, 25));
    expect(store.getRunThroughput('run-1')).toMatchObject({ tokensPerSecond: 40 });
    store.applyTokenUsageUpdated(live(2, 30, { run_summary_after_event: null })); // seen event key is ignored
    expect(store.getRunThroughput('run-1')).toMatchObject({ tokensPerSecond: 40 });
  });

  it('breaks Team sampling on a fresh missing summary and leaves costs unchanged', () => {
    const store = useTokenUsageMeterStore();
    const member = (revision: number, seconds: number) => buildTeamPayload('member', {
      usage_event_id: `team-${revision}`, idempotency_key: `team-${revision}`, turn_id: 'turn',
      observed_at: `2026-10-13T10:00:${String(seconds).padStart(2, '0')}.000Z`,
      run_summary_after_event: buildSummaryDto({ run_id: 'member', root_team_run_id: 'team', revision, usage_report_count: revision }),
    });
    store.applyTeamTokenUsage('team', 'member', member(1, 0));
    store.applyTeamTokenUsage('team', 'member', member(2, 10));
    expect(store.getRunThroughput('member')?.status).toBe('ready');
    const total = store.getTeamSummary('team');
    const missing = { ...member(3, 15), run_summary_after_event: null };
    expect(store.applyTeamTokenUsage('team', 'member', missing)).toBe(false);
    expect(store.getRunThroughput('member')).toEqual({ status: 'unavailable', reason: 'missingSummary' });
    expect(store.getTeamSummary('team')).toEqual(total);
    store.applyTeamTokenUsage('team', 'member', member(3, 20));
    expect(store.getRunThroughput('member')?.status).toBe('collecting');
  });

  it('rejects mismatched exact identities before observation', () => {
    const store = useTokenUsageMeterStore();
    expect(() => store.applyTokenUsageUpdated(live(1, 0, {
      run_summary_after_event: buildSummaryDto({ run_id: 'other' }),
    }))).toThrow('different AgentRun');
    expect(store.getRunThroughput('run-1')).toBeNull();
    expect(store.applyTeamTokenUsage('team', 'wrong', buildTeamPayload('member'))).toBe(false);
    expect(store.getRunThroughput('wrong')).toBeNull();
  });
});

// TPS-ATTRIBUTION / AC-002: enter actual exact-identity context owners, not just projection helpers.
describe('throughput through real Org and collaboration context admission', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); });
  const launch = { runtimeKind: 'codex_app_server' as const, llmModelIdentifier: 'configured-alias',
    llmConfig: null, autoExecuteTools: false, workspaceRootPath: null };
  const entries = (statuses: readonly { agent_run_id: string; member_address: string }[]) => statuses.map(row => ({
    agentRunId: row.agent_run_id, memberAddress: parseAgentTeamAddress(row.member_address),
    context: createAgentContext({ agentRunId: row.agent_run_id, address: parseAgentTeamAddress(row.member_address),
      agentDefinitionId: 'test-definition', launch }, '2026-10-13T10:00:00Z', null),
  }));
  const event = (runId: string, address: string, revision: number, output: number) => {
    const { agent_run_id, change_sequence, ...payload } = buildTeamPayload(runId, {
      usage_event_id: `${runId}-${revision}`, idempotency_key: `${runId}-${revision}`, turn_id: 'turn',
      model_identifier: `reported-${runId}`,
      observed_at: `2026-10-13T10:00:${revision === 1 ? '00' : '10'}.000Z`,
      meter_delta_output_tokens: output,
      run_summary_after_event: buildSummaryDto({ run_id: runId, revision, usage_report_count: revision }),
    });
    return { kind: 'agent_presentation' as const, agent_run_id: runId, member_address: address,
      message: { type: 'TOKEN_USAGE_UPDATED' as const, payload } };
  };
  it('keeps four Org target kinds and same-address task copies distinct through sequenced reports', () => {
    const view = taskBearingView();
    const org = new AgentOrgExecutionContext({ orgRunId: 'org-run', view, entries: entries(view.agent_statuses) });
    const subjects = [
      ['agent-director', '/director', 'agent_org_direct_agent'],
      ['agent-lead-configured', '/team/lead', 'agent_org_team_member'],
      ['agent-worker-task', '/worker', 'agent_org_task_agent'],
      ['agent-task-lead', '/team/lead', 'agent_org_task_team_member'],
    ];
    let sequence = view.base_change_sequence;
    for (const revision of [1, 2]) for (const [index, [id, address]] of subjects.entries()) {
      expect(org.applyEvent(++sequence, event(id!, address!, revision, (index + 1) * 100))).toBe('applied');
    }
    const meter = useTokenUsageMeterStore();
    for (const [index, [id, , kind]] of subjects.entries()) {
      org.select({ kind: 'agent_execution', agentRunId: id! });
      const selected = org.selectedTarget()!;
      expect(selected.kind).toBe(kind);
      expect(meter.getRunThroughput(selected.context.state.runId)).toMatchObject({ status: 'ready',
        tokensPerSecond: (index + 1) * 10, identity: { runId: id, modelIdentifier: `reported-${id}`, runtimeKind: 'codex_app_server' } });
    }
    expect(meter.getRunThroughput('org-run')).toBeNull();
    expect(() => org.applyEvent(++sequence, event('agent-task-lead', '/director', 3, 9999))).toThrow(/identity/);
    expect(meter.getRunThroughput('agent-task-lead')).toMatchObject({ tokensPerSecond: 40 });
  });
  it('routes hosted Agent and Team calls without attributing children to their standalone host', () => {
    const view = agentRootView();
    const root = new AgentRunCollaborationContext({ hostRunId: 'host-run', view, entries: entries(view.agent_statuses) });
    let sequence = view.base_change_sequence;
    const subjects = [['cua-run', '/computer_use_agent'], ['pp-run', '/product_team/prototyper']];
    for (const revision of [1, 2]) for (const [index, [id, address]] of subjects.entries()) {
      expect(root.applyEvent(++sequence, event(id!, address!, revision, (index + 1) * 200))).toBe('applied');
    }
    const meter = useTokenUsageMeterStore();
    for (const [index, [id]] of subjects.entries()) expect(meter.getRunThroughput(root.getAgentContext(id!)!.state.runId))
      .toMatchObject({ tokensPerSecond: (index + 1) * 20, identity: { runId: id, modelIdentifier: `reported-${id}` } });
    expect(meter.getRunThroughput('host-run')).toBeNull();
    expect(() => root.applyEvent(++sequence, event('host-run', '/research_assistant', 1, 9999))).toThrow(/identity/);
    expect(meter.getRunThroughput('host-run')).toBeNull();
  });
});
