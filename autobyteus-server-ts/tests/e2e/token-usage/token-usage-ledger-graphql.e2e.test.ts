import 'reflect-metadata';
import { createRequire } from 'node:module';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { graphql as graphqlFn, GraphQLSchema } from 'graphql';
import { PrismaClient } from '@prisma/client';
import { buildGraphqlSchema } from '../../../src/api/graphql/schema.js';
import { createTokenUsageUpdatedPayload } from '../../../src/agent-execution/domain/agent-run-token-usage.js';
import { TokenUsageLedgerStore } from '../../../src/token-usage/providers/token-usage-ledger-store.js';

const prisma = new PrismaClient();
const store = new TokenUsageLedgerStore();
const createdRunIds = new Set<string>();
const createdTeamRunIds = new Set<string>();

const buildEvent = (input: {
  runId: string;
  rootTeamRunId?: string | null;
  memberRouteKey?: string | null;
  observedAt: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number | null;
  cacheCreationTokens?: number | null;
  reasoningTokens?: number | null;
  reasoningCost?: number | null;
  totalCost: number | null;
  status: 'estimated' | 'price_missing' | 'partial_price_missing';
  model?: string;
  currency?: string | null;
  latestContextInputTokens?: number | null;
  effectiveContextBudgetTokens?: number | null;
  contextPressurePercent?: number | null;
}) => {
  createdRunIds.add(input.runId);
  if (input.rootTeamRunId) createdTeamRunIds.add(input.rootTeamRunId);
  const totalTokens = input.inputTokens + input.outputTokens;
  return createTokenUsageUpdatedPayload({
    runId: input.runId,
    payload: {
      usage_event_id: `graphql-ledger-${randomUUID()}`,
      idempotency_key: `graphql-ledger:${randomUUID()}`,
      observed_at: input.observedAt,
      root_team_run_id: input.rootTeamRunId ?? null,
      member_agent_run_id: input.rootTeamRunId ? input.runId : null,
      member_route_key: input.memberRouteKey ?? null,
      runtime_kind: 'codex_app_server',
      ingestion_kind: 'codex_thread_token_usage',
      usage_scope: 'per_turn',
      model_provider: 'OPENAI',
      model_identifier: input.model ?? 'gpt-5.4-mini',
      reported_input_tokens: input.inputTokens,
      reported_output_tokens: input.outputTokens,
      reported_total_tokens: totalTokens,
      accounting_input_tokens: input.inputTokens,
      accounting_output_tokens: input.outputTokens,
      accounting_total_tokens: totalTokens,
      cache_read_input_tokens: input.cacheReadTokens ?? null,
      cache_creation_input_tokens: input.cacheCreationTokens ?? null,
      reasoning_output_tokens: input.reasoningTokens ?? null,
      pricing_status: input.status === 'estimated' ? 'trusted' : 'missing',
      api_cost_status: input.status,
      currency: input.currency ?? (input.totalCost === null ? null : 'USD'),
      estimated_api_input_cost: input.totalCost === null ? null : input.totalCost / 2,
      estimated_api_output_cost: input.totalCost === null ? null : input.totalCost / 2,
      estimated_api_reasoning_output_cost: input.reasoningCost ?? null,
      estimated_api_total_cost: input.totalCost,
      latest_context_input_tokens: input.latestContextInputTokens ?? null,
      effective_context_budget_tokens: input.effectiveContextBudgetTokens ?? null,
      context_pressure_percent: input.contextPressurePercent ?? null,
    },
  });
};

describe('token usage ledger GraphQL projections', () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeAll(async () => {
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
      await prisma.tokenUsageLedgerEvent.deleteMany({ where: { runId: { in: runIds } } });
    }
    createdRunIds.clear();
    createdTeamRunIds.clear();
    await prisma.$disconnect();
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  it('returns run/team/member summaries and settings statistics from ledger accounting fields', async () => {
    const suffix = randomUUID();
    const standaloneRunId = `graphql-standalone-${suffix}`;
    const teamRunId = `graphql-team-${suffix}`;
    const memberRunId = `graphql-member-${suffix}`;
    const start = '2026-06-24T10:00:00.000Z';
    const end = '2026-06-24T10:10:00.000Z';

    await store.appendTokenUsageEvent(buildEvent({
      runId: standaloneRunId,
      observedAt: '2026-06-24T10:01:00.000Z',
      inputTokens: 100,
      outputTokens: 25,
      cacheReadTokens: 40,
      reasoningTokens: 7,
      reasoningCost: 0.0007,
      totalCost: 0.004,
      status: 'estimated',
      model: 'gpt-5.4-mini',
      latestContextInputTokens: 100,
      effectiveContextBudgetTokens: 1_000,
      contextPressurePercent: 10,
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId: memberRunId,
      rootTeamRunId: teamRunId,
      memberRouteKey: 'worker',
      observedAt: '2026-06-24T10:02:00.000Z',
      inputTokens: 30,
      outputTokens: 10,
      reasoningTokens: 3,
      totalCost: null,
      status: 'price_missing',
      model: 'unknown-model',
    }));

    const query = `
      query TokenUsageLedger($runId: String!, $teamRunId: String!, $memberRunId: String!, $start: DateTime!, $end: DateTime!) {
        getAgentRunTokenUsageSummary(runId: $runId) {
          runId
          inputTokens
          outputTokens
          totalTokens
          reasoningOutputTokens
          estimatedApiInputCost
          estimatedApiOutputCost
          estimatedApiReasoningOutputCost
          estimatedApiTotalCost
          currency
          apiCostStatus
          latestContextInputTokens
          effectiveContextBudgetTokens
          contextPressurePercent
          latestRuntimeKind
          latestModelIdentifier
          eventCount
        }
        getTeamRunTokenUsageSummary(teamRunId: $teamRunId) {
          runId
          rootTeamRunId
          inputTokens
          outputTokens
          totalTokens
          reasoningOutputTokens
          estimatedApiInputCost
          estimatedApiOutputCost
          estimatedApiReasoningOutputCost
          estimatedApiTotalCost
          apiCostStatus
          eventCount
        }
        getTeamMemberTokenUsageSummary(teamRunId: $teamRunId, memberAgentRunId: $memberRunId) {
          runId
          rootTeamRunId
          memberAgentRunId
          memberRouteKey
          totalTokens
          reasoningOutputTokens
          estimatedApiInputCost
          estimatedApiOutputCost
          estimatedApiReasoningOutputCost
          estimatedApiTotalCost
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
      inputTokens: 100,
      outputTokens: 25,
      totalTokens: 125,
      reasoningOutputTokens: 7,
      estimatedApiInputCost: 0.002,
      estimatedApiOutputCost: 0.002,
      estimatedApiReasoningOutputCost: 0.0007,
      estimatedApiTotalCost: 0.004,
      currency: 'USD',
      apiCostStatus: 'estimated',
      latestContextInputTokens: 100,
      effectiveContextBudgetTokens: 1000,
      contextPressurePercent: 10,
      latestRuntimeKind: 'codex_app_server',
      latestModelIdentifier: 'gpt-5.4-mini',
      eventCount: 1,
    });
    expect(result.getTeamRunTokenUsageSummary).toMatchObject({
      rootTeamRunId: teamRunId,
      inputTokens: 30,
      outputTokens: 10,
      totalTokens: 40,
      reasoningOutputTokens: 3,
      estimatedApiReasoningOutputCost: null,
      estimatedApiTotalCost: null,
      apiCostStatus: 'price_missing',
      eventCount: 1,
    });
    expect(result.getTeamMemberTokenUsageSummary).toMatchObject({
      runId: memberRunId,
      rootTeamRunId: teamRunId,
      memberAgentRunId: memberRunId,
      memberRouteKey: 'worker',
      totalTokens: 40,
      reasoningOutputTokens: 3,
      estimatedApiReasoningOutputCost: null,
      estimatedApiTotalCost: null,
      apiCostStatus: 'price_missing',
    });
    expect(result.totalCostInPeriod).toBe(0.004);
    expect(result.usageStatisticsInPeriod).toEqual(expect.arrayContaining([
      expect.objectContaining({
        llmModel: 'gpt-5.4-mini',
        promptTokens: 100,
        assistantTokens: 25,
        reasoningTokens: 7,
        promptCost: 0.002,
        assistantCost: 0.002,
        reasoningCost: 0.0007,
        totalCost: 0.004,
        currency: 'USD',
        apiCostStatus: 'estimated',
      }),
      expect.objectContaining({
        llmModel: 'unknown-model',
        promptTokens: 30,
        assistantTokens: 10,
        reasoningTokens: 3,
        reasoningCost: null,
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
      cache_read_input_tokens: 40,
      reasoning_output_tokens: 7,
      latest_context_input_tokens: 100,
      effective_context_budget_tokens: 1_000,
      context_pressure_percent: 10,
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
      inputTokens: 100,
      outputTokens: 20,
      reasoningTokens: 4,
      reasoningCost: 0.0004,
      totalCost: 0.003,
      status: 'estimated',
      model: 'glm-5.2',
      currency: 'USD',
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId,
      observedAt: '2040-06-24T10:02:00.000Z',
      inputTokens: 200,
      outputTokens: 40,
      reasoningTokens: 8,
      reasoningCost: 0.004,
      totalCost: 0.06,
      status: 'estimated',
      model: 'glm-5.2',
      currency: 'CNY',
    }));

    const query = `
      query MixedCurrencyTokenUsage($runId: String!, $start: DateTime!, $end: DateTime!) {
        getAgentRunTokenUsageSummary(runId: $runId) {
          runId
          inputTokens
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
      inputTokens: 300,
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

  it('keeps removed MiniMax M2.7 absent from the settings-facing GraphQL model list', async () => {
    const previousDiscoveryEnv = {
      OLLAMA_HOSTS: process.env.OLLAMA_HOSTS,
      LMSTUDIO_HOSTS: process.env.LMSTUDIO_HOSTS,
      AUTOBYTEUS_LLM_SERVER_HOSTS: process.env.AUTOBYTEUS_LLM_SERVER_HOSTS,
    };
    process.env.OLLAMA_HOSTS = ' ';
    process.env.LMSTUDIO_HOSTS = ' ';
    process.env.AUTOBYTEUS_LLM_SERVER_HOSTS = ' ';

    const query = `
      query AvailableModels {
        availableLlmProvidersWithModels(runtimeKind: "autobyteus") {
          provider {
            id
          }
          models {
            modelIdentifier
            name
            value
            canonicalName
          }
        }
      }
    `;

    try {
      const result = await execGraphql<{
        availableLlmProvidersWithModels: Array<{
          provider: { id: string };
          models: Array<{
            modelIdentifier: string;
            name: string;
            value: string;
            canonicalName: string;
          }>;
        }>;
      }>(query);

      const minimaxModels = result.availableLlmProvidersWithModels
        .filter((row) => row.provider.id === 'MINIMAX')
        .flatMap((row) => row.models);
      const identifiers = minimaxModels.map((model) => model.modelIdentifier);
      const namesAndValues = minimaxModels.flatMap((model) => [
        model.name,
        model.value,
        model.canonicalName,
      ]);

      expect(identifiers).toContain('minimax-m3');
      expect(namesAndValues).toContain('MiniMax-M3');
      expect(identifiers).not.toContain('minimax-m2.7');
      expect(namesAndValues).not.toContain('MiniMax-M2.7');
    } finally {
      for (const [key, value] of Object.entries(previousDiscoveryEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  }, 20_000);

});
