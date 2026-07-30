import 'reflect-metadata';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { graphql as graphqlFn, GraphQLSchema } from 'graphql';
import { initializePrisma, rootPrismaClient, shutdownPrisma } from 'repository_prisma';
import { buildGraphqlSchema } from '../../../src/api/graphql/schema.js';
import { createTokenUsageUpdatedPayload } from '../../../src/agent-execution/domain/agent-run-token-usage.js';
import { TokenUsageLedgerStore } from '../../../src/token-usage/providers/token-usage-ledger-store.js';
import type { TokenUsageUpdatedPayload } from '../../../src/agent-execution/domain/agent-run-token-usage.js';
import type { TokenUsageExecutionAddress } from '../../../src/token-usage/domain/execution-address.js';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';

const store = new TokenUsageLedgerStore();
const createdRunIds = new Set<string>();
const createdTeamRunIds = new Set<string>();

const buildEvent = (input: {
  runId: string;
  rootTeamRunId?: string | null;
  memberRouteKey?: string | null;
  executionAddress?: TokenUsageExecutionAddress | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
  observedAt: string;
  inputTokenSemantic?: TokenUsageUpdatedPayload['input_token_semantic'];
  grossInputTokens: number;
  reportedInputTokens?: number | null;
  standardInputTokens?: number | null;
  cacheMissInputTokens?: number | null;
  cacheReadTokens?: number | null;
  cacheCreationTokens?: number | null;
  cacheCreation5mTokens?: number | null;
  cacheCreation1hTokens?: number | null;
  cacheState?: TokenUsageUpdatedPayload['cache_state'];
  outputTokens: number;
  billableOutputTokens?: number | null;
  reasoningTokens?: number | null;
  inputCost?: number | null;
  standardInputCost?: number | null;
  cacheReadInputCost?: number | null;
  cacheCreationInputCost?: number | null;
  cacheCreation5mInputCost?: number | null;
  cacheCreation1hInputCost?: number | null;
  outputCost?: number | null;
  reasoningCost?: number | null;
  totalCost: number | null;
  status: TokenUsageUpdatedPayload['api_cost_status'];
  pricingStatus?: TokenUsageUpdatedPayload['pricing_status'];
  modelProvider?: string | null;
  providerName?: string | null;
  model?: string;
  modelValue?: string | null;
  runtimeKind?: string;
  ingestionKind?: string;
  currency?: string | null;
  missingPriceDimensions?: string[];
  pricingPolicyKey?: string | null;
  selectedPricingTierId?: string | null;
  latestPromptTokens?: number | null;
  effectiveContextWindowTokens?: number | null;
  contextWindowUsagePercent?: number | null;
  teamName?: string | null;
  agentName?: string | null;
  runSummary?: string | null;
  runCreatedAt?: string | null;
  memberName?: string | null;
}) => {
  createdRunIds.add(input.runId);
  if (input.rootTeamRunId) createdTeamRunIds.add(input.rootTeamRunId);
  const cacheReadTokens = input.cacheReadTokens ?? 0;
  const cacheCreationTokens = input.cacheCreationTokens ?? ((input.cacheCreation5mTokens ?? 0) + (input.cacheCreation1hTokens ?? 0));
  const standardInputTokens = input.standardInputTokens ?? Math.max(input.grossInputTokens - cacheReadTokens - cacheCreationTokens, 0);
  const cacheMissInputTokens = input.cacheMissInputTokens ?? standardInputTokens;
  const inputTokenSemantic = input.inputTokenSemantic ?? 'gross_includes_cache';
  const reportedInputTokens = input.reportedInputTokens ?? (inputTokenSemantic === 'base_excludes_cache' ? standardInputTokens : input.grossInputTokens);
  const totalTokens = input.grossInputTokens + input.outputTokens;
  return createTokenUsageUpdatedPayload({
    runId: input.runId,
    payload: {
      usage_event_id: `graphql-ledger-${randomUUID()}`,
      idempotency_key: `graphql-ledger:${randomUUID()}`,
      observed_at: input.observedAt,
      root_team_run_id: input.rootTeamRunId ?? null,
      execution_address: input.executionAddress ?? null,
      member_agent_run_id: input.rootTeamRunId ? input.runId : null,
      member_route_key: input.memberRouteKey ?? null,
      task_agent_run_id: input.taskAgentRunId ?? null,
      task_id: input.taskId ?? null,
      runtime_kind: input.runtimeKind ?? 'codex_app_server',
      ingestion_kind: input.ingestionKind ?? 'codex_thread_token_usage',
      usage_scope: 'per_turn',
      model_provider: input.modelProvider ?? 'OPENAI',
      provider_name: input.providerName ?? null,
      model_identifier: input.model ?? 'gpt-5.4-mini',
      model_value: input.modelValue ?? null,
      input_token_semantic: inputTokenSemantic,
      reported_input_tokens: reportedInputTokens,
      reported_output_tokens: input.outputTokens,
      reported_total_tokens: (reportedInputTokens ?? input.grossInputTokens) + input.outputTokens,
      accounting_input_tokens: input.grossInputTokens,
      accounting_output_tokens: input.outputTokens,
      accounting_total_tokens: totalTokens,
      standard_input_tokens: standardInputTokens,
      cache_miss_input_tokens: cacheMissInputTokens,
      cache_read_input_tokens: cacheReadTokens,
      cache_creation_input_tokens: cacheCreationTokens,
      cache_creation_5m_input_tokens: input.cacheCreation5mTokens ?? 0,
      cache_creation_1h_input_tokens: input.cacheCreation1hTokens ?? 0,
      cache_state: input.cacheState ?? (cacheReadTokens > 0 || cacheCreationTokens > 0 ? 'positive' : 'not_reported'),
      reasoning_output_tokens: input.reasoningTokens ?? null,
      billable_output_tokens: input.billableOutputTokens ?? input.outputTokens,
      pricing_status: input.pricingStatus ?? (input.status === 'local_no_api_bill' ? 'local_no_api_bill' : input.status === 'estimated' || input.status === 'partial_price_missing' ? 'trusted' : 'missing'),
      api_cost_status: input.status,
      currency: input.currency ?? (input.totalCost === null || input.status === 'local_no_api_bill' ? null : 'USD'),
      estimated_api_input_cost: input.inputCost ?? null,
      estimated_api_standard_input_cost: input.standardInputCost ?? null,
      estimated_api_cache_read_input_cost: input.cacheReadInputCost ?? null,
      estimated_api_cache_creation_input_cost: input.cacheCreationInputCost ?? null,
      estimated_api_cache_creation_5m_input_cost: input.cacheCreation5mInputCost ?? null,
      estimated_api_cache_creation_1h_input_cost: input.cacheCreation1hInputCost ?? null,
      estimated_api_output_cost: input.outputCost ?? null,
      estimated_api_reasoning_output_cost: input.reasoningCost ?? null,
      estimated_api_total_cost: input.totalCost,
      missing_price_dimensions: input.missingPriceDimensions ?? [],
      pricing_policy_key: input.pricingPolicyKey ?? null,
      selected_pricing_tier_id: input.selectedPricingTierId ?? null,
      latest_prompt_tokens: input.latestPromptTokens ?? null,
      effective_context_window_tokens: input.effectiveContextWindowTokens ?? null,
      context_window_usage_percent: input.contextWindowUsagePercent ?? null,
      team_name: input.teamName ?? null,
      agent_name: input.agentName ?? null,
      run_summary: input.runSummary ?? null,
      run_created_at: input.runCreatedAt ?? null,
      member_name: input.memberName ?? null,
    },
  });
};

describe('token usage ledger GraphQL projections', () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeAll(async () => {
    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve('type-graphql'));
    const graphqlPath = require.resolve('graphql', { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    const runIds = Array.from(createdRunIds);
    if (runIds.length > 0) {
      await rootPrismaClient.tokenUsageLedgerEvent.deleteMany({ where: { runId: { in: runIds } } });
    }
    createdRunIds.clear();
    createdTeamRunIds.clear();
    await shutdownPrisma();
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  it('returns expanded run/team/member summaries and settings statistics from ledger accounting fields', async () => {
    const suffix = randomUUID();
    const standaloneRunId = `graphql-standalone-${suffix}`;
    const teamRunId = `graphql-team-${suffix}`;
    const memberRunId = `graphql-member-${suffix}`;
    const start = '2026-06-24T10:00:00.000Z';
    const end = '2026-06-24T10:10:00.000Z';

    await store.appendTokenUsageEvent(buildEvent({
      runId: standaloneRunId,
      observedAt: '2026-06-24T10:01:00.000Z',
      grossInputTokens: 115_908,
      standardInputTokens: 13_444,
      cacheMissInputTokens: 13_444,
      cacheReadTokens: 102_464,
      outputTokens: 5_979,
      reasoningTokens: 0,
      inputCost: 0.31248,
      standardInputCost: 0.107552,
      cacheReadInputCost: 0.204928,
      outputCost: 0.167412,
      totalCost: 0.479892,
      status: 'estimated',
      model: 'glm-5.2',
      modelProvider: 'GLM',
      currency: 'CNY',
      pricingPolicyKey: 'catalog:glm:glm-5.2:bigmodel-cn',
      latestPromptTokens: 13_206,
      effectiveContextWindowTokens: 1_000_000,
      contextWindowUsagePercent: 1.3206,
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId: memberRunId,
      rootTeamRunId: teamRunId,
      memberRouteKey: 'worker',
      executionAddress: { segments: [{ kind: 'member', memberRouteKey: 'worker' }] },
      observedAt: '2026-06-24T10:02:00.000Z',
      grossInputTokens: 30,
      standardInputTokens: 30,
      outputTokens: 10,
      reasoningTokens: 3,
      totalCost: null,
      status: 'price_missing',
      model: 'unknown-model',
      modelProvider: 'OPENAI_COMPATIBLE',
      missingPriceDimensions: ['model_pricing'],
    }));

    const query = `
      query TokenUsageLedger($runId: String!, $teamRunId: String!, $memberRunId: String!, $start: DateTime!, $end: DateTime!) {
        getAgentRunTokenUsageSummary(runId: $runId) {
          runId
          grossInputTokens
          standardInputTokens
          cacheMissInputTokens
          cacheReadInputTokens
          cacheCreationInputTokens
          outputTokens
          reasoningOutputTokens
          billableOutputTokens
          totalTokens
          cacheReadInputTokenRate
          standardInputTokenRate
          cacheState
          estimatedApiInputCost
          estimatedApiStandardInputCost
          estimatedApiCacheReadInputCost
          estimatedApiOutputCost
          estimatedApiTotalCost
          currency
          apiCostStatus
          missingPriceDimensions
          pricingPolicyKey
          latestPromptTokens
          effectiveContextWindowTokens
          contextWindowUsagePercent
          latestModelProvider
          latestRuntimeKind
          latestModelIdentifier
          usageReportCount
        }
        getTeamRunTokenUsageSummary(teamRunId: $teamRunId) {
          runId
          rootTeamRunId
          grossInputTokens
          standardInputTokens
          outputTokens
          totalTokens
          reasoningOutputTokens
          estimatedApiTotalCost
          apiCostStatus
          missingPriceDimensions
          usageReportCount
        }
        getTeamMemberTokenUsageSummary(teamRunId: $teamRunId, memberAgentRunId: $memberRunId) {
          runId
          rootTeamRunId
          executionAddress
          memberAgentRunId
          memberRouteKey
          grossInputTokens
          totalTokens
          reasoningOutputTokens
          estimatedApiTotalCost
          apiCostStatus
          missingPriceDimensions
        }
        totalCostInPeriod(startTime: $start, endTime: $end)
        usageStatisticsInPeriod(startTime: $start, endTime: $end) {
          llmModel
          promptTokens
          assistantTokens
          reasoningTokens
          promptCost
          assistantCost
          reasoningCost
          totalCost
          currency
          apiCostStatus
        }
      }
    `;

    const result = await execGraphql<{
      getAgentRunTokenUsageSummary: Record<string, unknown>;
      getTeamRunTokenUsageSummary: Record<string, unknown>;
      getTeamMemberTokenUsageSummary: Record<string, unknown>;
      totalCostInPeriod: number | null;
      usageStatisticsInPeriod: Array<Record<string, unknown>>;
    }>(query, {
      runId: standaloneRunId,
      teamRunId,
      memberRunId,
      start: new Date(start),
      end: new Date(end),
    });

    expect(result.getAgentRunTokenUsageSummary).toMatchObject({
      runId: standaloneRunId,
      grossInputTokens: 115_908,
      standardInputTokens: 13_444,
      cacheMissInputTokens: 13_444,
      cacheReadInputTokens: 102_464,
      cacheCreationInputTokens: 0,
      outputTokens: 5_979,
      reasoningOutputTokens: 0,
      billableOutputTokens: 5_979,
      totalTokens: 121_887,
      cacheState: 'positive',
      estimatedApiInputCost: 0.31248,
      estimatedApiStandardInputCost: 0.107552,
      estimatedApiCacheReadInputCost: 0.204928,
      estimatedApiOutputCost: 0.167412,
      estimatedApiTotalCost: 0.479892,
      currency: 'CNY',
      apiCostStatus: 'estimated',
      missingPriceDimensions: [],
      pricingPolicyKey: 'catalog:glm:glm-5.2:bigmodel-cn',
      latestPromptTokens: 13_206,
      effectiveContextWindowTokens: 1_000_000,
      contextWindowUsagePercent: 1.3206,
      latestModelProvider: 'GLM',
      latestRuntimeKind: 'codex_app_server',
      latestModelIdentifier: 'glm-5.2',
      usageReportCount: 1,
    });
    expect(result.getAgentRunTokenUsageSummary.cacheReadInputTokenRate).toBeCloseTo(102_464 / 115_908, 8);
    expect(result.getAgentRunTokenUsageSummary.standardInputTokenRate).toBeCloseTo(13_444 / 115_908, 8);

    expect(result.getTeamRunTokenUsageSummary).toMatchObject({
      rootTeamRunId: teamRunId,
      grossInputTokens: 30,
      standardInputTokens: 30,
      outputTokens: 10,
      totalTokens: 40,
      reasoningOutputTokens: 3,
      estimatedApiTotalCost: null,
      apiCostStatus: 'price_missing',
      missingPriceDimensions: ['model_pricing'],
      usageReportCount: 1,
    });
    expect(result.getTeamMemberTokenUsageSummary).toMatchObject({
      runId: memberRunId,
      rootTeamRunId: teamRunId,
      executionAddress: { segments: [{ kind: 'member', memberRouteKey: 'worker' }] },
      memberAgentRunId: memberRunId,
      memberRouteKey: 'worker',
      grossInputTokens: 30,
      totalTokens: 40,
      reasoningOutputTokens: 3,
      estimatedApiTotalCost: null,
      apiCostStatus: 'price_missing',
      missingPriceDimensions: ['model_pricing'],
    });
    expect(result.totalCostInPeriod).toBe(0.479892);
    expect(result.usageStatisticsInPeriod).toEqual(expect.arrayContaining([
      expect.objectContaining({
        llmModel: 'glm-5.2',
        promptTokens: 115_908,
        assistantTokens: 5_979,
        reasoningTokens: 0,
        promptCost: 0.31248,
        assistantCost: 0.167412,
        totalCost: 0.479892,
        currency: 'CNY',
        apiCostStatus: 'estimated',
      }),
      expect.objectContaining({
        llmModel: 'unknown-model',
        promptTokens: 30,
        assistantTokens: 10,
        reasoningTokens: 3,
        totalCost: null,
        currency: null,
        apiCostStatus: 'price_missing',
      }),
    ]));

    const persistedEvents = await store.listEventsInPeriod(new Date(start), new Date(end));
    const standaloneEvent = persistedEvents.find((event) => event.run_id === standaloneRunId);

    expect(standaloneEvent).toMatchObject({
      runtime_kind: 'codex_app_server',
      ingestion_kind: 'codex_thread_token_usage',
      usage_scope: 'per_turn',
      input_token_semantic: 'gross_includes_cache',
      standard_input_tokens: 13_444,
      cache_read_input_tokens: 102_464,
      cache_state: 'positive',
      latest_prompt_tokens: 13_206,
      effective_context_window_tokens: 1_000_000,
      context_window_usage_percent: 1.3206,
    });
  });

  it('returns null aggregate costs and mixed status for mixed-currency GraphQL summaries and statistics', async () => {
    const suffix = randomUUID();
    const runId = `graphql-mixed-currency-${suffix}`;
    const start = '2040-06-24T10:00:00.000Z';
    const end = '2040-06-24T10:10:00.000Z';

    await store.appendTokenUsageEvent(buildEvent({
      runId,
      observedAt: '2040-06-24T10:01:00.000Z',
      grossInputTokens: 100,
      outputTokens: 20,
      reasoningTokens: 4,
      reasoningCost: 0.0004,
      inputCost: 0.001,
      outputCost: 0.002,
      totalCost: 0.003,
      status: 'estimated',
      model: 'glm-5.2',
      currency: 'USD',
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId,
      observedAt: '2040-06-24T10:02:00.000Z',
      grossInputTokens: 200,
      outputTokens: 40,
      reasoningTokens: 8,
      reasoningCost: 0.004,
      inputCost: 0.02,
      outputCost: 0.04,
      totalCost: 0.06,
      status: 'estimated',
      model: 'glm-5.2',
      currency: 'CNY',
    }));

    const query = `
      query MixedCurrencyTokenUsage($runId: String!, $start: DateTime!, $end: DateTime!) {
        getAgentRunTokenUsageSummary(runId: $runId) {
          runId
          grossInputTokens
          outputTokens
          totalTokens
          reasoningOutputTokens
          estimatedApiInputCost
          estimatedApiOutputCost
          estimatedApiReasoningOutputCost
          estimatedApiTotalCost
          currency
          apiCostStatus
        }
        totalCostInPeriod(startTime: $start, endTime: $end)
        usageStatisticsInPeriod(startTime: $start, endTime: $end) {
          llmModel
          promptTokens
          assistantTokens
          reasoningTokens
          promptCost
          assistantCost
          reasoningCost
          totalCost
          currency
          apiCostStatus
        }
      }
    `;

    const result = await execGraphql<{
      getAgentRunTokenUsageSummary: Record<string, unknown>;
      totalCostInPeriod: number | null;
      usageStatisticsInPeriod: Array<Record<string, unknown>>;
    }>(query, {
      runId,
      start: new Date(start),
      end: new Date(end),
    });

    expect(result.getAgentRunTokenUsageSummary).toMatchObject({
      runId,
      grossInputTokens: 300,
      outputTokens: 60,
      totalTokens: 360,
      reasoningOutputTokens: 12,
      estimatedApiInputCost: null,
      estimatedApiOutputCost: null,
      estimatedApiReasoningOutputCost: null,
      estimatedApiTotalCost: null,
      currency: null,
      apiCostStatus: 'mixed',
    });
    expect(result.totalCostInPeriod).toBeNull();
    expect(result.usageStatisticsInPeriod).toEqual(expect.arrayContaining([
      expect.objectContaining({
        llmModel: 'glm-5.2',
        promptTokens: 300,
        assistantTokens: 60,
        reasoningTokens: 12,
        promptCost: null,
        assistantCost: null,
        reasoningCost: null,
        totalCost: null,
        currency: null,
        apiCostStatus: 'mixed',
      }),
    ]));
  });

  it('returns recursive task statistics rows and runtime/model diagnostics without double counting team members', async () => {
    const suffix = randomUUID();
    const olderTeamRunId = `graphql-task-team-older-${suffix}`;
    const newerTeamRunId = `graphql-task-team-newer-${suffix}`;
    const olderMemberRunId = `graphql-task-member-older-${suffix}`;
    const designerMemberRunId = `graphql-task-member-designer-${suffix}`;
    const builderMemberRunId = `graphql-task-member-builder-${suffix}`;
    const taskTeamRunIdOne = `graphql-task-team-student-study-1-${suffix}`;
    const taskTeamRunIdTwo = `graphql-task-team-student-study-2-${suffix}`;
    const studentOneRunId = `graphql-task-member-student-one-${suffix}`;
    const studentTwoRunId = `graphql-task-member-student-two-${suffix}`;
    const repeatedStudentRunId = `graphql-task-member-student-repeat-${suffix}`;
    const codexTaskAgentRunIdOne = `graphql-task-agent-codex-1-${suffix}`;
    const codexTaskAgentRunIdTwo = `graphql-task-agent-codex-2-${suffix}`;
    const nestedTaskAgentRunId = `graphql-task-agent-nested-${suffix}`;
    const standaloneRunId = `graphql-task-standalone-${suffix}`;
    const start = '2041-07-01T09:55:00.000Z';
    const end = '2041-07-01T11:30:00.000Z';

    await store.appendTokenUsageEvent(buildEvent({
      runId: olderMemberRunId,
      rootTeamRunId: olderTeamRunId,
      memberRouteKey: 'legacy_designer',
      observedAt: '2041-07-01T10:00:00.000Z',
      grossInputTokens: 20,
      outputTokens: 5,
      reasoningTokens: 1,
      totalCost: null,
      status: 'price_missing',
      model: 'missing-price-model',
      runtimeKind: 'codex_app_server',
      missingPriceDimensions: ['model_pricing'],
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId: standaloneRunId,
      observedAt: '2041-07-01T10:30:00.000Z',
      grossInputTokens: 200,
      standardInputTokens: 140,
      cacheReadTokens: 60,
      outputTokens: 20,
      reasoningTokens: 4,
      inputCost: 2.0,
      standardInputCost: 1.4,
      cacheReadInputCost: 0.6,
      outputCost: 0.2,
      reasoningCost: 0.04,
      totalCost: 2.2,
      status: 'partial_price_missing',
      model: 'gpt-shared',
      runtimeKind: 'codex_app_server',
      missingPriceDimensions: ['cache_creation_price'],
      agentName: 'GraphQL Standalone Agent',
      runSummary: 'Prototype task statistics',
      runCreatedAt: '2041-07-01T10:20:00.000Z',
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId: designerMemberRunId,
      rootTeamRunId: newerTeamRunId,
      memberRouteKey: 'designer',
      executionAddress: { segments: [{ kind: 'member', memberRouteKey: 'designer' }] },
      observedAt: '2041-07-01T11:00:00.000Z',
      grossInputTokens: 100,
      standardInputTokens: 60,
      cacheReadTokens: 40,
      outputTokens: 10,
      reasoningTokens: 2,
      inputCost: 1.0,
      standardInputCost: 0.8,
      cacheReadInputCost: 0.2,
      outputCost: 0.1,
      reasoningCost: 0.02,
      totalCost: 1.1,
      status: 'estimated',
      model: 'gpt-shared',
      runtimeKind: 'codex_app_server',
      teamName: 'GraphQL Engineering Team',
      runSummary: 'Ship task statistics',
      runCreatedAt: '2041-07-01T10:58:00.000Z',
      memberName: 'GraphQL Designer',
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId: builderMemberRunId,
      rootTeamRunId: newerTeamRunId,
      memberRouteKey: 'builder',
      executionAddress: { segments: [{ kind: 'member', memberRouteKey: 'builder' }] },
      observedAt: '2041-07-01T11:05:00.000Z',
      grossInputTokens: 60,
      standardInputTokens: 60,
      outputTokens: 8,
      reasoningTokens: 3,
      inputCost: 0.6,
      standardInputCost: 0.6,
      outputCost: 0.08,
      reasoningCost: 0.03,
      totalCost: 0.68,
      status: 'estimated',
      model: 'gpt-shared',
      runtimeKind: 'autobyteus',
      teamName: 'GraphQL Engineering Team',
      runSummary: 'Ship task statistics',
      runCreatedAt: '2041-07-01T10:58:00.000Z',
      memberName: 'GraphQL Builder',
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId: studentOneRunId,
      rootTeamRunId: newerTeamRunId,
      memberRouteKey: 'student_one',
      executionAddress: {
        segments: [
          { kind: 'member', memberRouteKey: 'StudentStudyGroup' },
          { kind: 'task_team', taskTeamRunId: taskTeamRunIdOne },
          { kind: 'member', memberRouteKey: 'student_one' },
        ],
      },
      observedAt: '2041-07-01T11:06:00.000Z',
      grossInputTokens: 30,
      standardInputTokens: 30,
      outputTokens: 3,
      inputCost: 0.3,
      standardInputCost: 0.3,
      outputCost: 0.03,
      totalCost: 0.33,
      status: 'estimated',
      model: 'gpt-shared',
      runtimeKind: 'codex_app_server',
      teamName: 'GraphQL Engineering Team',
      memberName: 'student_one',
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId: studentTwoRunId,
      rootTeamRunId: newerTeamRunId,
      memberRouteKey: 'student_two',
      executionAddress: {
        segments: [
          { kind: 'member', memberRouteKey: 'StudentStudyGroup' },
          { kind: 'task_team', taskTeamRunId: taskTeamRunIdOne },
          { kind: 'member', memberRouteKey: 'student_two' },
        ],
      },
      observedAt: '2041-07-01T11:07:00.000Z',
      grossInputTokens: 40,
      standardInputTokens: 40,
      outputTokens: 4,
      inputCost: 0.4,
      standardInputCost: 0.4,
      outputCost: 0.04,
      totalCost: 0.44,
      status: 'estimated',
      model: 'gpt-shared',
      runtimeKind: 'codex_app_server',
      teamName: 'GraphQL Engineering Team',
      memberName: 'student_two',
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId: nestedTaskAgentRunId,
      rootTeamRunId: newerTeamRunId,
      memberRouteKey: 'student_one',
      taskAgentRunId: nestedTaskAgentRunId,
      taskId: `task-nested-agent-${suffix}`,
      executionAddress: {
        segments: [
          { kind: 'member', memberRouteKey: 'StudentStudyGroup' },
          { kind: 'task_team', taskTeamRunId: taskTeamRunIdOne },
          { kind: 'member', memberRouteKey: 'student_one' },
          { kind: 'task_agent', taskAgentRunId: nestedTaskAgentRunId },
        ],
      },
      observedAt: '2041-07-01T11:08:00.000Z',
      grossInputTokens: 20,
      standardInputTokens: 20,
      outputTokens: 2,
      inputCost: 0.2,
      standardInputCost: 0.2,
      outputCost: 0.02,
      totalCost: 0.22,
      status: 'estimated',
      model: 'gpt-shared',
      runtimeKind: 'codex_app_server',
      teamName: 'GraphQL Engineering Team',
      memberName: 'student_one',
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId: repeatedStudentRunId,
      rootTeamRunId: newerTeamRunId,
      memberRouteKey: 'student_one',
      executionAddress: {
        segments: [
          { kind: 'member', memberRouteKey: 'StudentStudyGroup' },
          { kind: 'task_team', taskTeamRunId: taskTeamRunIdTwo },
          { kind: 'member', memberRouteKey: 'student_one' },
        ],
      },
      observedAt: '2041-07-01T11:11:00.000Z',
      grossInputTokens: 15,
      standardInputTokens: 15,
      outputTokens: 2,
      inputCost: 0.15,
      standardInputCost: 0.15,
      outputCost: 0.015,
      totalCost: 0.165,
      status: 'estimated',
      model: 'gpt-shared',
      runtimeKind: 'codex_app_server',
      teamName: 'GraphQL Engineering Team',
      memberName: 'student_one',
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId: codexTaskAgentRunIdOne,
      rootTeamRunId: newerTeamRunId,
      memberRouteKey: 'Codex',
      taskAgentRunId: codexTaskAgentRunIdOne,
      taskId: `task-codex-agent-1-${suffix}`,
      executionAddress: {
        segments: [
          { kind: 'member', memberRouteKey: 'Codex' },
          { kind: 'task_agent', taskAgentRunId: codexTaskAgentRunIdOne },
        ],
      },
      observedAt: '2041-07-01T11:12:00.000Z',
      grossInputTokens: 50,
      standardInputTokens: 50,
      outputTokens: 5,
      inputCost: 0.5,
      standardInputCost: 0.5,
      outputCost: 0.05,
      totalCost: 0.55,
      status: 'estimated',
      model: 'gpt-shared',
      runtimeKind: 'codex_app_server',
      teamName: 'GraphQL Engineering Team',
      memberName: 'Codex',
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId: codexTaskAgentRunIdTwo,
      rootTeamRunId: newerTeamRunId,
      memberRouteKey: 'Codex',
      taskAgentRunId: codexTaskAgentRunIdTwo,
      taskId: `task-codex-agent-2-${suffix}`,
      executionAddress: {
        segments: [
          { kind: 'member', memberRouteKey: 'Codex' },
          { kind: 'task_agent', taskAgentRunId: codexTaskAgentRunIdTwo },
        ],
      },
      observedAt: '2041-07-01T11:13:00.000Z',
      grossInputTokens: 25,
      standardInputTokens: 25,
      outputTokens: 3,
      inputCost: 0.25,
      standardInputCost: 0.25,
      outputCost: 0.025,
      totalCost: 0.275,
      status: 'estimated',
      model: 'gpt-shared',
      runtimeKind: 'codex_app_server',
      teamName: 'GraphQL Engineering Team',
      memberName: 'Codex',
    }));

    const query = `
      fragment TaskAggregateFields on TokenUsageCostSummaryAggregateGraphql {
        grossInputTokens
        cacheReadInputTokens
        cacheReadInputTokenRate
        outputTokens
        reasoningOutputTokens
        estimatedApiInputCost
        estimatedApiOutputCost
        estimatedApiReasoningOutputCost
        estimatedApiTotalCost
        currency
        apiCostStatus
        missingPriceDimensions
        observedRuntimeKinds
        observedModelIdentifiers
      }

      fragment TaskRowFields on TokenUsageTaskStatisticsRowGraphql {
        rowId
        rowKind
        runId
        rootTeamRunId
        memberRouteKey
        memberAgentRunId
        taskAgentRunId
        taskTeamRunId
        taskId
        executionAddress
        displayName
        summary
        createdAt
        createdTimeSource
        models
        runtimeKinds
        aggregate { ...TaskAggregateFields }
      }

      query TokenUsageTaskStatistics($start: DateTime!, $end: DateTime!) {
        taskRowType: __type(name: "TokenUsageTaskStatisticsRowGraphql") {
          fields { name }
        }
        tokenUsageTaskStatisticsInPeriod(startTime: $start, endTime: $end) {
          rows {
            ...TaskRowFields
            children {
              ...TaskRowFields
              children {
                ...TaskRowFields
              }
            }
          }
        }
        usageStatisticsInPeriod(startTime: $start, endTime: $end) {
          runtimeKind
          llmModel
          inputTokens
          outputTokens
          thinkingTokens
          totalCost
          apiCostStatus
          aggregate {
            grossInputTokens
            outputTokens
            estimatedApiTotalCost
            apiCostStatus
            observedRuntimeKinds
            observedModelIdentifiers
          }
        }
      }
    `;

    type TaskRow = Record<string, unknown> & {
      rowId: string;
      rowKind: string;
      runId: string | null;
      rootTeamRunId: string | null;
      memberRouteKey: string | null;
      memberAgentRunId: string | null;
      taskAgentRunId: string | null;
      taskTeamRunId: string | null;
      taskId: string | null;
      executionAddress: TokenUsageExecutionAddress | null;
      displayName: string;
      models: string[];
      runtimeKinds: string[];
      aggregate: Record<string, unknown>;
      children: TaskRow[];
    };

    const result = await execGraphql<{
      taskRowType: { fields: Array<{ name: string }> };
      tokenUsageTaskStatisticsInPeriod: { rows: TaskRow[] };
      usageStatisticsInPeriod: Array<Record<string, unknown> & { aggregate: Record<string, unknown> }>;
    }>(query, {
      start: new Date(start),
      end: new Date(end),
    });

    const taskRowFieldNames = result.taskRowType.fields.map((field) => field.name);
    expect(taskRowFieldNames).toContain('children');
    expect(taskRowFieldNames).toContain('executionAddress');
    expect(taskRowFieldNames).not.toContain('members');
    expect(taskRowFieldNames).not.toContain('memberPath');

    const rows = result.tokenUsageTaskStatisticsInPeriod.rows;
    expect(rows.map((row) => row.rowId)).toEqual([
      `team:${newerTeamRunId}`,
      `agent:${standaloneRunId}`,
      `team:${olderTeamRunId}`,
    ]);
    expect(rows.some((row) => row.rowId === `agent:${designerMemberRunId}`)).toBe(false);
    expect(rows.some((row) => row.rowId === `agent:${builderMemberRunId}`)).toBe(false);
    expect(rows.some((row) => row.rowId === `team:${taskTeamRunIdOne}`)).toBe(false);
    expect(rows.some((row) => row.rowId === `team:${taskTeamRunIdTwo}`)).toBe(false);
    expect(rows.some((row) => row.rowId === `agent:${codexTaskAgentRunIdOne}`)).toBe(false);
    expect(rows.some((row) => row.rowId === `agent:${codexTaskAgentRunIdTwo}`)).toBe(false);

    const newerTeam = rows[0]!;
    expect(newerTeam).toMatchObject({
      rowKind: 'TEAM_RUN',
      runId: null,
      rootTeamRunId: newerTeamRunId,
      displayName: 'GraphQL Engineering Team',
      summary: 'Ship task statistics',
      createdAt: '2041-07-01T10:58:00.000Z',
      createdTimeSource: 'RUN_HISTORY',
      models: ['gpt-shared'],
      runtimeKinds: ['autobyteus', 'codex_app_server'],
    });
    expect(newerTeam.aggregate).toMatchObject({
      grossInputTokens: 340,
      cacheReadInputTokens: 40,
      outputTokens: 37,
      reasoningOutputTokens: 5,
      estimatedApiReasoningOutputCost: 0.05,
      currency: 'USD',
      apiCostStatus: 'estimated',
      missingPriceDimensions: [],
      observedRuntimeKinds: ['autobyteus', 'codex_app_server'],
      observedModelIdentifiers: ['gpt-shared'],
    });
    expect(newerTeam.aggregate.estimatedApiInputCost).toBeCloseTo(3.4, 10);
    expect(newerTeam.aggregate.estimatedApiOutputCost).toBeCloseTo(0.36, 10);
    expect(newerTeam.aggregate.cacheReadInputTokenRate).toBeCloseTo(40 / 340, 8);
    expect(newerTeam.aggregate.estimatedApiTotalCost).toBeCloseTo(3.76, 10);

    const directDesigner = newerTeam.children.find((row) => row.memberAgentRunId === designerMemberRunId)!;
    expect(directDesigner).toMatchObject({
      rowKind: 'MEMBER_RUN',
      runId: designerMemberRunId,
      memberRouteKey: 'designer',
      displayName: 'GraphQL Designer',
      executionAddress: { segments: [{ kind: 'member', memberRouteKey: 'designer' }] },
      models: ['gpt-shared'],
      runtimeKinds: ['codex_app_server'],
      aggregate: expect.objectContaining({
        grossInputTokens: 100,
        outputTokens: 10,
        estimatedApiTotalCost: 1.1,
        apiCostStatus: 'estimated',
      }),
    });
    const directBuilder = newerTeam.children.find((row) => row.memberAgentRunId === builderMemberRunId)!;
    expect(directBuilder).toMatchObject({
      rowKind: 'MEMBER_RUN',
      runId: builderMemberRunId,
      memberRouteKey: 'builder',
      displayName: 'GraphQL Builder',
      executionAddress: { segments: [{ kind: 'member', memberRouteKey: 'builder' }] },
      runtimeKinds: ['autobyteus'],
      aggregate: expect.objectContaining({
        grossInputTokens: 60,
        outputTokens: 8,
        estimatedApiTotalCost: 0.68,
        apiCostStatus: 'estimated',
      }),
    });

    const taskTeamRows = newerTeam.children.filter((row) => row.rowKind === 'TASK_TEAM_RUN');
    expect(taskTeamRows.map((row) => row.taskTeamRunId).sort()).toEqual([taskTeamRunIdOne, taskTeamRunIdTwo].sort());
    const firstTaskTeam = taskTeamRows.find((row) => row.taskTeamRunId === taskTeamRunIdOne)!;
    expect(firstTaskTeam).toMatchObject({
      runId: taskTeamRunIdOne,
      memberRouteKey: 'StudentStudyGroup',
      displayName: 'StudentStudyGroup',
      executionAddress: {
        segments: [
          { kind: 'member', memberRouteKey: 'StudentStudyGroup' },
          { kind: 'task_team', taskTeamRunId: taskTeamRunIdOne },
        ],
      },
      aggregate: expect.objectContaining({
        grossInputTokens: 90,
        outputTokens: 9,
        estimatedApiTotalCost: 0.99,
      }),
    });
    expect(firstTaskTeam.children.map((row) => row.rowKind).sort()).toEqual(['MEMBER_RUN', 'MEMBER_RUN', 'TASK_AGENT_RUN']);
    expect(firstTaskTeam.children.find((row) => row.memberRouteKey === 'student_two')).toMatchObject({
      rowKind: 'MEMBER_RUN',
      runId: studentTwoRunId,
      displayName: 'student_two',
      aggregate: expect.objectContaining({ grossInputTokens: 40, estimatedApiTotalCost: 0.44 }),
    });
    const nestedTaskAgent = firstTaskTeam.children.find((row) => row.rowKind === 'TASK_AGENT_RUN')!;
    expect(nestedTaskAgent).toMatchObject({
      runId: nestedTaskAgentRunId,
      memberRouteKey: 'student_one',
      taskAgentRunId: nestedTaskAgentRunId,
      taskId: `task-nested-agent-${suffix}`,
      executionAddress: {
        segments: [
          { kind: 'member', memberRouteKey: 'StudentStudyGroup' },
          { kind: 'task_team', taskTeamRunId: taskTeamRunIdOne },
          { kind: 'member', memberRouteKey: 'student_one' },
          { kind: 'task_agent', taskAgentRunId: nestedTaskAgentRunId },
        ],
      },
      aggregate: expect.objectContaining({ grossInputTokens: 20, estimatedApiTotalCost: 0.22 }),
    });

    const repeatedTaskTeam = taskTeamRows.find((row) => row.taskTeamRunId === taskTeamRunIdTwo)!;
    expect(repeatedTaskTeam).toMatchObject({
      runId: taskTeamRunIdTwo,
      memberRouteKey: 'StudentStudyGroup',
      displayName: 'StudentStudyGroup',
      aggregate: expect.objectContaining({ grossInputTokens: 15, estimatedApiTotalCost: 0.165 }),
    });
    expect(repeatedTaskTeam.children).toHaveLength(1);
    expect(repeatedTaskTeam.children[0]).toMatchObject({
      rowKind: 'MEMBER_RUN',
      runId: repeatedStudentRunId,
      memberRouteKey: 'student_one',
    });

    const taskAgentRows = newerTeam.children.filter((row) => row.rowKind === 'TASK_AGENT_RUN');
    expect(taskAgentRows.map((row) => row.taskAgentRunId).sort()).toEqual([codexTaskAgentRunIdOne, codexTaskAgentRunIdTwo].sort());
    expect(taskAgentRows.find((row) => row.taskAgentRunId === codexTaskAgentRunIdOne)).toMatchObject({
      runId: codexTaskAgentRunIdOne,
      memberRouteKey: 'Codex',
      displayName: 'Codex',
      taskId: `task-codex-agent-1-${suffix}`,
      aggregate: expect.objectContaining({ grossInputTokens: 50, estimatedApiTotalCost: 0.55 }),
    });
    expect(taskAgentRows.find((row) => row.taskAgentRunId === codexTaskAgentRunIdTwo)).toMatchObject({
      runId: codexTaskAgentRunIdTwo,
      memberRouteKey: 'Codex',
      displayName: 'Codex',
      taskId: `task-codex-agent-2-${suffix}`,
      aggregate: expect.objectContaining({ grossInputTokens: 25, estimatedApiTotalCost: 0.275 }),
    });

    const standalone = rows[1]!;
    expect(standalone).toMatchObject({
      rowKind: 'AGENT_RUN',
      runId: standaloneRunId,
      rootTeamRunId: null,
      displayName: 'GraphQL Standalone Agent',
      summary: 'Prototype task statistics',
      createdAt: '2041-07-01T10:20:00.000Z',
      createdTimeSource: 'RUN_HISTORY',
      models: ['gpt-shared'],
      runtimeKinds: ['codex_app_server'],
      children: [],
    });
    expect(standalone.aggregate).toMatchObject({
      grossInputTokens: 200,
      cacheReadInputTokens: 60,
      outputTokens: 20,
      reasoningOutputTokens: 4,
      estimatedApiTotalCost: 2.2,
      apiCostStatus: 'partial_price_missing',
      missingPriceDimensions: ['cache_creation_price'],
    });

    const olderTeam = rows[2]!;
    expect(olderTeam).toMatchObject({
      rowKind: 'TEAM_RUN',
      rootTeamRunId: olderTeamRunId,
      displayName: 'Unknown team run',
      createdAt: '2041-07-01T10:00:00.000Z',
      createdTimeSource: 'FIRST_USAGE_OBSERVED',
      models: ['missing-price-model'],
      runtimeKinds: ['codex_app_server'],
    });
    expect(olderTeam.aggregate).toMatchObject({
      estimatedApiTotalCost: null,
      apiCostStatus: 'price_missing',
      missingPriceDimensions: ['model_pricing'],
    });
    expect(olderTeam.children).toEqual([
      expect.objectContaining({
        rowKind: 'MEMBER_RUN',
        memberRouteKey: 'legacy_designer',
        memberAgentRunId: olderMemberRunId,
        executionAddress: null,
        displayName: 'legacy_designer',
        aggregate: expect.objectContaining({ grossInputTokens: 20 }),
      }),
    ]);

    const diagnostics = result.usageStatisticsInPeriod;
    const diagnosticKeys = diagnostics.map((row) => `${row.runtimeKind}/${row.llmModel}`).sort();
    expect(diagnosticKeys).toEqual([
      'autobyteus/gpt-shared',
      'codex_app_server/gpt-shared',
      'codex_app_server/missing-price-model',
    ]);
    const codexShared = diagnostics.find((row) => row.runtimeKind === 'codex_app_server' && row.llmModel === 'gpt-shared')!;
    expect(codexShared).toMatchObject({
      inputTokens: 480,
      outputTokens: 49,
      thinkingTokens: 6,
      apiCostStatus: 'mixed',
      aggregate: expect.objectContaining({
        grossInputTokens: 480,
        outputTokens: 49,
        apiCostStatus: 'mixed',
        observedRuntimeKinds: ['codex_app_server'],
        observedModelIdentifiers: ['gpt-shared'],
      }),
    });
    expect(codexShared.totalCost).toBeCloseTo(5.28, 10);
    expect(codexShared.aggregate.estimatedApiTotalCost).toBeCloseTo(5.28, 10);
    const autobyteusShared = diagnostics.find((row) => row.runtimeKind === 'autobyteus' && row.llmModel === 'gpt-shared')!;
    expect(autobyteusShared).toMatchObject({
      inputTokens: 60,
      outputTokens: 8,
      thinkingTokens: 3,
      totalCost: 0.68,
      apiCostStatus: 'estimated',
    });
  });

  it('exposes provider-aware model and task fields through the live GraphQL schema', async () => {
    const suffix = randomUUID();
    const providerId = `provider_${suffix}`;
    const customProviderPath = path.join(
      appConfigProvider.config.getAppDataDir(),
      'llm',
      'custom-llm-providers.json',
    );
    let originalProviderConfig: Buffer | null = null;
    try {
      originalProviderConfig = await fs.readFile(customProviderPath);
    } catch {
      originalProviderConfig = null;
    }
    await fs.mkdir(path.dirname(customProviderPath), { recursive: true });
    await fs.writeFile(customProviderPath, JSON.stringify({
      version: 2,
      providers: [{
        id: providerId,
        name: 'alibaba_cloud',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://provider.invalid/v1',
      }],
    }), 'utf-8');

    const customModel = `openai-compatible:${providerId}:qwen3.8-max-preview`;
    const teamRunId = `graphql-display-team-${suffix}`;
    const customMemberRunId = `graphql-display-member-custom-${suffix}`;
    const builtInMemberRunId = `graphql-display-member-built-in-${suffix}`;
    const collisionMemberRunId = `graphql-display-member-collision-${suffix}`;
    const standaloneRunId = `graphql-display-standalone-${suffix}`;
    const start = '2046-07-30T10:00:00.000Z';
    const end = '2046-07-30T10:10:00.000Z';

    try {
      await store.appendTokenUsageEvent(buildEvent({
        runId: standaloneRunId,
        observedAt: '2046-07-30T10:01:00.000Z',
        grossInputTokens: 100,
        outputTokens: 10,
        totalCost: 1.1,
        status: 'estimated',
        model: customModel,
        modelValue: 'qwen3.8-max-preview',
        modelProvider: 'OPENAI_COMPATIBLE',
        providerName: 'alibaba_cloud',
        runtimeKind: 'autobyteus',
      }));
      await store.appendTokenUsageEvent(buildEvent({
        runId: standaloneRunId,
        observedAt: '2046-07-30T10:02:00.000Z',
        grossInputTokens: 80,
        outputTokens: 8,
        totalCost: 0.88,
        status: 'estimated',
        model: 'deepseek-v4-flash',
        modelValue: 'deepseek-v4-flash',
        modelProvider: 'DEEPSEEK',
        runtimeKind: 'autobyteus',
      }));
      await store.appendTokenUsageEvent(buildEvent({
        runId: standaloneRunId,
        observedAt: '2046-07-30T10:03:00.000Z',
        grossInputTokens: 60,
        outputTokens: 6,
        totalCost: 0.66,
        status: 'estimated',
        model: 'gpt-5.6-luna',
        modelValue: 'gpt-5.6-luna',
        modelProvider: 'OPENAI',
        runtimeKind: 'codex_app_server',
      }));
      await store.appendTokenUsageEvent(buildEvent({
        runId: customMemberRunId,
        rootTeamRunId: teamRunId,
        memberRouteKey: 'custom',
        executionAddress: { segments: [{ kind: 'member', memberRouteKey: 'custom' }] },
        observedAt: '2046-07-30T10:04:00.000Z',
        grossInputTokens: 30,
        outputTokens: 3,
        totalCost: 0.33,
        status: 'estimated',
        model: customModel,
        modelValue: 'qwen3.8-max-preview',
        modelProvider: 'OPENAI_COMPATIBLE',
        providerName: 'alibaba_cloud',
        runtimeKind: 'autobyteus',
      }));
      await store.appendTokenUsageEvent(buildEvent({
        runId: builtInMemberRunId,
        rootTeamRunId: teamRunId,
        memberRouteKey: 'built-in',
        executionAddress: { segments: [{ kind: 'member', memberRouteKey: 'built-in' }] },
        observedAt: '2046-07-30T10:05:00.000Z',
        grossInputTokens: 20,
        outputTokens: 2,
        totalCost: 0.22,
        status: 'estimated',
        model: 'deepseek-v4-flash',
        modelValue: 'deepseek-v4-flash',
        modelProvider: 'DEEPSEEK',
        runtimeKind: 'autobyteus',
      }));
      await store.appendTokenUsageEvent(buildEvent({
        runId: collisionMemberRunId,
        rootTeamRunId: teamRunId,
        memberRouteKey: 'collision',
        executionAddress: { segments: [{ kind: 'member', memberRouteKey: 'collision' }] },
        observedAt: '2046-07-30T10:06:00.000Z',
        grossInputTokens: 10,
        outputTokens: 1,
        totalCost: 0.11,
        status: 'estimated',
        model: customModel,
        modelValue: 'qwen3.8-max-preview',
        modelProvider: 'OPENAI',
        runtimeKind: 'codex_app_server',
      }));

      const query = `
        query TokenUsageDisplayFields($start: DateTime!, $end: DateTime!) {
          usageStatisticsInPeriod(startTime: $start, endTime: $end) {
            runtimeKind
            llmModel
            modelDisplayName
            inputTokens
            outputTokens
            totalCost
          }
          tokenUsageTaskStatisticsInPeriod(startTime: $start, endTime: $end) {
            rows {
              rowId
              models
              modelDisplayNames
              children {
                rowId
                memberRouteKey
                models
                modelDisplayNames
              }
            }
          }
          totalCostInPeriod(startTime: $start, endTime: $end)
        }
      `;

      const result = await execGraphql<{
        usageStatisticsInPeriod: Array<{
          runtimeKind: string;
          llmModel: string;
          modelDisplayName: string;
          inputTokens: number;
          outputTokens: number;
          totalCost: number | null;
        }>;
        tokenUsageTaskStatisticsInPeriod: {
          rows: Array<{
            rowId: string;
            models: string[];
            modelDisplayNames: string[];
            children: Array<{
              rowId: string;
              memberRouteKey: string | null;
              models: string[];
              modelDisplayNames: string[];
            }>;
          }>;
        };
        totalCostInPeriod: number | null;
      }>(query, { start: new Date(start), end: new Date(end) });

      expect(result.usageStatisticsInPeriod).toEqual(expect.arrayContaining([
        expect.objectContaining({
          runtimeKind: 'autobyteus',
          llmModel: customModel,
          modelDisplayName: 'alibaba_cloud:qwen3.8-max-preview',
          inputTokens: 130,
          outputTokens: 13,
          totalCost: expect.closeTo(1.43, 10),
        }),
        expect.objectContaining({
          runtimeKind: 'autobyteus',
          llmModel: 'deepseek-v4-flash',
          modelDisplayName: 'DeepSeek:deepseek-v4-flash',
        }),
        expect.objectContaining({
          runtimeKind: 'codex_app_server',
          llmModel: 'gpt-5.6-luna',
          modelDisplayName: 'gpt-5.6-luna',
        }),
      ]));
      const taskTeam = result.tokenUsageTaskStatisticsInPeriod.rows.find((row) => row.rowId === `team:${teamRunId}`);
      expect(taskTeam).toBeDefined();
      expect(taskTeam?.models).toHaveLength(taskTeam?.modelDisplayNames.length ?? -1);
      expect(taskTeam?.children).toHaveLength(3);
      const customMember = taskTeam?.children.find((row) => row.memberRouteKey === 'custom');
      expect(customMember).toMatchObject({
        models: [customModel],
        modelDisplayNames: ['alibaba_cloud:qwen3.8-max-preview'],
      });
      const builtInMember = taskTeam?.children.find((row) => row.memberRouteKey === 'built-in');
      expect(builtInMember).toMatchObject({
        models: ['deepseek-v4-flash'],
        modelDisplayNames: ['DeepSeek:deepseek-v4-flash'],
      });
      const collisionMember = taskTeam?.children.find((row) => row.memberRouteKey === 'collision');
      expect(collisionMember).toMatchObject({
        models: [customModel],
        modelDisplayNames: [customModel],
      });
      expect(result.totalCostInPeriod).toBeCloseTo(3.3, 10);

      const persistedCustomEvent = await rootPrismaClient.tokenUsageLedgerEvent.findFirst({
        where: { runId: standaloneRunId, modelIdentifier: customModel },
        select: { modelIdentifier: true, modelValue: true, providerName: true },
      });
      expect(persistedCustomEvent).toEqual({
        modelIdentifier: customModel,
        modelValue: 'qwen3.8-max-preview',
        providerName: 'alibaba_cloud',
      });

      await fs.rm(customProviderPath, { force: true });
      const snapshotAfterProviderDeletion = await execGraphql<{
        usageStatisticsInPeriod: Array<{ llmModel: string; modelDisplayName: string }>;
      }>(`
        query TokenUsageSnapshotAfterProviderDeletion($start: DateTime!, $end: DateTime!) {
          usageStatisticsInPeriod(startTime: $start, endTime: $end) {
            llmModel
            modelDisplayName
          }
        }
      `, { start: new Date(start), end: new Date(end) });
      expect(snapshotAfterProviderDeletion.usageStatisticsInPeriod).toEqual(expect.arrayContaining([
        expect.objectContaining({
          llmModel: customModel,
          modelDisplayName: 'alibaba_cloud:qwen3.8-max-preview',
        }),
      ]));
    } finally {
      await rootPrismaClient.tokenUsageLedgerEvent.deleteMany({ where: { runId: { in: [standaloneRunId, teamRunId, customMemberRunId, builtInMemberRunId, collisionMemberRunId] } } });
      if (originalProviderConfig) {
        await fs.writeFile(customProviderPath, originalProviderConfig);
      } else {
        await fs.rm(customProviderPath, { force: true });
      }
    }
  });
});
