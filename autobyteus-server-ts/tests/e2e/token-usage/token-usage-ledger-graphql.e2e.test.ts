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
  totalCost: number | null;
  status: 'estimated' | 'price_missing' | 'partial_price_missing';
  model?: string;
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
      pricing_status: input.status === 'estimated' ? 'trusted' : 'missing',
      api_cost_status: input.status,
      currency: input.totalCost === null ? null : 'USD',
      estimated_api_input_cost: input.totalCost === null ? null : input.totalCost / 2,
      estimated_api_output_cost: input.totalCost === null ? null : input.totalCost / 2,
      estimated_api_total_cost: input.totalCost,
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
      totalCost: 0.004,
      status: 'estimated',
      model: 'gpt-5.4-mini',
    }));
    await store.appendTokenUsageEvent(buildEvent({
      runId: memberRunId,
      rootTeamRunId: teamRunId,
      memberRouteKey: 'worker',
      observedAt: '2026-06-24T10:02:00.000Z',
      inputTokens: 30,
      outputTokens: 10,
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
          estimatedApiTotalCost
          currency
          apiCostStatus
          eventCount
        }
        getTeamRunTokenUsageSummary(teamRunId: $teamRunId) {
          runId
          rootTeamRunId
          inputTokens
          outputTokens
          totalTokens
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
          estimatedApiTotalCost
          apiCostStatus
        }
        totalCostInPeriod(startTime: $start, endTime: $end)
        usageStatisticsInPeriod(startTime: $start, endTime: $end) {
          llmModel
          promptTokens
          assistantTokens
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
      estimatedApiTotalCost: 0.004,
      currency: 'USD',
      apiCostStatus: 'estimated',
      eventCount: 1,
    });
    expect(result.getTeamRunTokenUsageSummary).toMatchObject({
      rootTeamRunId: teamRunId,
      inputTokens: 30,
      outputTokens: 10,
      totalTokens: 40,
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
      estimatedApiTotalCost: null,
      apiCostStatus: 'price_missing',
    });
    expect(result.totalCostInPeriod).toBe(0.004);
    expect(result.usageStatisticsInPeriod).toEqual(expect.arrayContaining([
      expect.objectContaining({
        llmModel: 'gpt-5.4-mini',
        promptTokens: 100,
        assistantTokens: 25,
        totalCost: 0.004,
        currency: 'USD',
        apiCostStatus: 'estimated',
      }),
      expect.objectContaining({
        llmModel: 'unknown-model',
        promptTokens: 30,
        assistantTokens: 10,
        totalCost: null,
        currency: null,
        apiCostStatus: 'price_missing',
      }),
    ]));
  });
});
