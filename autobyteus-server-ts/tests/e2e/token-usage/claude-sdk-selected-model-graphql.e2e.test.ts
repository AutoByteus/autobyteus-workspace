import 'reflect-metadata';
import { createRequire } from 'node:module';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { graphql as graphqlFn, GraphQLSchema } from 'graphql';
import { initializePrisma, rootPrismaClient, shutdownPrisma } from 'repository_prisma';
import { buildGraphqlSchema } from '../../../src/api/graphql/schema.js';
import { buildClaudeTokenUsageEvent } from '../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';
import { createTokenUsageUpdatedPayload } from '../../../src/agent-execution/domain/agent-run-token-usage.js';
import { configureTokenUsageMigrationReadiness } from '../../../src/token-usage/providers/token-usage-migration-readiness.js';
import { SqlTokenUsageRunRepository } from '../../../src/token-usage/repositories/sql/token-usage-run-repository.js';
import { TokenUsageRunAccumulator } from '../../../src/token-usage/services/token-usage-run-accumulator.js';

const raw = 'claude-opus-5-5[1m]';
const canonical = 'claude-opus-5-5';
const row = (input: number, output: number, read: number, write: number) => ({
  provider: 'firstParty', canonicalModel: canonical, inputTokens: input,
  outputTokens: output, cacheReadInputTokens: read, cacheCreationInputTokens: write,
  costUSD: 999, // SDK money must never determine the configured estimate.
});
const eventFor = (runId: string, id: string, kind: 'create' | 'resume',
  selected: ReturnType<typeof row>, haikuInput: number, exactSplit: boolean) => {
  const chunk = { type: 'result', uuid: id, total_cost_usd: 9999,
    modelUsage: { 'claude-haiku-4-5': { ...row(haikuInput, 5, 0, 0), canonicalModel: 'claude-haiku-4-5' }, [raw]: selected },
    usage: { input_tokens: exactSplit ? selected.inputTokens : 99,
      output_tokens: exactSplit ? selected.outputTokens : 99,
      cache_read_input_tokens: exactSplit ? selected.cacheReadInputTokens : 99,
      cache_creation_input_tokens: exactSplit ? selected.cacheCreationInputTokens : 99,
      cache_creation: { ephemeral_5m_input_tokens: 0,
        ephemeral_1h_input_tokens: exactSplit ? selected.cacheCreationInputTokens : 99 } },
  };
  const event = buildClaudeTokenUsageEvent({ chunk, runId, turnId: id, sessionId: 'selected-session',
    model: 'opus[1m]', queryKind: kind, selectedBinding: { selectedModelValue: 'opus[1m]',
      selectedResolvedRawModelId: raw, resolution: 'resolved' } });
  expect(event).not.toBeNull();
  return createTokenUsageUpdatedPayload({ runId, payload: event!.params });
};

describe('Claude SDK selected-only result to SQL and GraphQL', () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  const runIds = new Set<string>();
  beforeAll(async () => {
    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
    configureTokenUsageMigrationReadiness({ kind: 'READY' });
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve('type-graphql'));
    graphql = (await import(require.resolve('graphql', { paths: [typeGraphqlRoot] }))).graphql as typeof graphqlFn;
  });
  afterAll(async () => {
    if (runIds.size) await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { in: [...runIds] } } });
    await shutdownPrisma();
  });

  it('persists configured selected Opus estimate, hides Haiku, and marks a later 1h assumption', async () => {
    const runId = `sdk-selected-graphql-${randomUUID()}`;
    runIds.add(runId);
    const accumulator = new TokenUsageRunAccumulator(new SqlTokenUsageRunRepository(rootPrismaClient));
    const first = await accumulator.recordObservation(eventFor(runId, 'result-one', 'create',
      row(2, 63, 9617, 7140), 100_000, true));
    expect(first.api_cost_status).toBe('estimated');
    expect(first.estimated_api_total_cost).toBeCloseTo(0.0603114, 9);
    expect(first.quality_flags).not.toContain('claude_sdk_cache_write_1h_assumed');
    const second = await accumulator.recordObservation(eventFor(runId, 'result-two', 'resume',
      row(3, 64, 9617, 7145), 200_000, false));
    expect(second.standard_input_tokens).toBe(1);
    expect(second.cache_creation_1h_input_tokens).toBe(5);
    expect(second.quality_flags).toContain('claude_sdk_cache_write_1h_assumed');
    expect(second.estimated_api_total_cost).toBeCloseTo(0.000064, 9);
    const repeated = await accumulator.recordObservation(eventFor(runId, 'result-two', 'resume',
      row(3, 64, 9617, 7145), 200_000, false));
    expect(repeated.meter_delta_total_tokens).toBe(0);

    const result = await graphql({ schema, source: `query($runId: String!) {
      getAgentRunTokenUsageSummary(runId: $runId) {
        runId latestModelIdentifier latestSelectedRawModelId latestRuntimeKind
        standardInputTokens cacheReadInputTokens cacheCreation1hInputTokens outputTokens
        estimatedApiTotalCost apiCostStatus usageReportCount observedModelIdentifiers
        hasCacheWriteRateAssumption
      }
    }`, variableValues: { runId } });
    expect(result.errors).toBeUndefined();
    const summary = (result.data as unknown as { getAgentRunTokenUsageSummary: Record<string, unknown> }).getAgentRunTokenUsageSummary;
    expect(summary).toMatchObject({ runId, latestModelIdentifier: canonical,
      latestSelectedRawModelId: raw, latestRuntimeKind: 'claude_agent_sdk',
      standardInputTokens: 3, cacheReadInputTokens: 9617, cacheCreation1hInputTokens: 7145,
      outputTokens: 64, apiCostStatus: 'estimated', usageReportCount: 2,
      observedModelIdentifiers: [canonical], hasCacheWriteRateAssumption: true });
    expect(summary.estimatedApiTotalCost).toBeCloseTo(0.0603754, 9);
    expect(JSON.stringify(summary)).not.toContain('haiku');
    const persisted = await new SqlTokenUsageRunRepository(rootPrismaClient).getByRunId(runId);
    expect(persisted?.claudeSdkUsageStateJson).toContain('claude-haiku'); // private checkpoint only
  });

  it('projects known Claude context and derives a stored null percent without mutation', async () => {
    const runId = `sdk-context-graphql-${randomUUID()}`;
    runIds.add(runId);
    const event = buildClaudeTokenUsageEvent({
      chunk: { type: 'result', uuid: 'context-result',
        usage: { input_tokens: 2, output_tokens: 1, cache_read_input_tokens: 0,
          cache_creation_input_tokens: 22_133,
          cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 22_133 } },
        modelUsage: { 'claude-haiku-4-5': { ...row(100, 5, 0, 0), canonicalModel: 'claude-haiku-4-5', contextWindow: 10_000 },
          [raw]: { ...row(2, 1, 0, 22_133), contextWindow: 1_000_000 } } },
      runId, turnId: 'context-one', sessionId: 'context-session', model: 'opus[1m]', queryKind: 'create',
      selectedBinding: { selectedModelValue: 'opus[1m]', selectedResolvedRawModelId: raw,
        resolution: 'resolved' },
    });
    expect(event?.params).toMatchObject({ latest_prompt_tokens: 22_135,
      effective_context_window_tokens: 1_000_000, context_window_usage_percent: 2.2135 });
    const accumulator = new TokenUsageRunAccumulator(new SqlTokenUsageRunRepository(rootPrismaClient));
    const recorded = await accumulator.recordObservation(createTokenUsageUpdatedPayload({ runId, payload: event!.params }));
    expect(recorded.run_summary_after_event).toMatchObject({ latest_prompt_tokens: 22_135,
      effective_context_window_tokens: 1_000_000, context_window_usage_percent: 2.2135,
      latest_model_identifier: canonical });
    const query = `query($runId: String!) { getAgentRunTokenUsageSummary(runId: $runId) {
      latestPromptTokens effectiveContextWindowTokens contextWindowUsagePercent
      latestModelIdentifier latestSelectedRawModelId estimatedApiTotalCost
    } }`;
    const execute = async () => {
      const result = await graphql({ schema, source: query, variableValues: { runId } });
      expect(result.errors).toBeUndefined();
      return (result.data as unknown as { getAgentRunTokenUsageSummary: Record<string, unknown> })
        .getAgentRunTokenUsageSummary;
    };
    const current = await execute();
    expect(current).toMatchObject({ latestPromptTokens: 22_135,
      effectiveContextWindowTokens: 1_000_000, contextWindowUsagePercent: 2.2135,
      latestModelIdentifier: canonical, latestSelectedRawModelId: raw });
    const amount = current.estimatedApiTotalCost;
    await rootPrismaClient.tokenUsageRunRecord.update({ where: { runId },
      data: { contextWindowUsagePercent: null } });
    expect(await execute()).toMatchObject({ latestPromptTokens: 22_135,
      effectiveContextWindowTokens: 1_000_000, contextWindowUsagePercent: 2.2135,
      estimatedApiTotalCost: amount });
    const stored = await rootPrismaClient.tokenUsageRunRecord.findUniqueOrThrow({ where: { runId } });
    expect(stored.contextWindowUsagePercent).toBeNull();
  });
});
