import 'reflect-metadata';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { graphql as graphqlFn, GraphQLSchema } from 'graphql';
import { initializePrisma, rootPrismaClient, shutdownPrisma } from 'repository_prisma';
import { buildGraphqlSchema } from '../../../src/api/graphql/schema.js';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import { createTokenUsageUpdatedPayload } from '../../../src/agent-execution/domain/agent-run-token-usage.js';
import { createCurrentTokenUsageTestHarness } from '../../helpers/token-usage-run-record-fixtures.js';
import { configureTokenUsageMigrationReadiness } from '../../../src/token-usage/providers/token-usage-migration-readiness.js';
import { TokenUsageRunRecordsV1AppDataMigration } from '../../../src/app-data-migrations/migrations/token-usage-run-records-v1/token-usage-run-records-v1-app-data-migration.js';
import { LegacyTokenUsageConsolidationRepository } from '../../../src/app-data-migrations/migrations/token-usage-run-records-v1/legacy-token-usage-consolidation-repository.js';
import type { TokenUsageUpdatedPayload } from '../../../src/agent-execution/domain/agent-run-token-usage.js';

const { store } = createCurrentTokenUsageTestHarness(rootPrismaClient);
const createdRunIds = new Set<string>();

const buildEvent = (input: {
  runId: string;
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
  inputCost?: number | null;
  standardInputCost?: number | null;
  cacheReadInputCost?: number | null;
  cacheCreationInputCost?: number | null;
  cacheCreation5mInputCost?: number | null;
  outputCost?: number | null;
  totalCost: number | null;
  status: TokenUsageUpdatedPayload['api_cost_status'];
  pricingStatus?: TokenUsageUpdatedPayload['pricing_status'];
  modelProvider?: string | null;
  model?: string;
  runtimeKind?: string;
  ingestionKind?: string;
  missingPriceDimensions?: string[];
  pricingPolicyKey?: string | null;
}) => {
  createdRunIds.add(input.runId);
  const cacheReadTokens = input.cacheReadTokens ?? 0;
  const cacheCreationTokens = input.cacheCreationTokens ?? ((input.cacheCreation5mTokens ?? 0) + (input.cacheCreation1hTokens ?? 0));
  const standardInputTokens = input.standardInputTokens ?? Math.max(input.grossInputTokens - cacheReadTokens - cacheCreationTokens, 0);
  const cacheMissInputTokens = input.cacheMissInputTokens ?? standardInputTokens;
  const inputTokenSemantic = input.inputTokenSemantic ?? 'gross_includes_cache';
  const reportedInputTokens = input.reportedInputTokens ?? (inputTokenSemantic === 'base_excludes_cache' ? standardInputTokens : input.grossInputTokens);
  return createTokenUsageUpdatedPayload({
    runId: input.runId,
    payload: {
      usage_event_id: `graphql-provider-${randomUUID()}`,
      idempotency_key: `graphql-provider:${randomUUID()}`,
      observed_at: input.observedAt,
      runtime_kind: input.runtimeKind ?? 'codex_app_server',
      ingestion_kind: input.ingestionKind ?? 'codex_thread_token_usage',
      usage_scope: 'per_turn',
      model_provider: input.modelProvider ?? 'OPENAI',
      model_identifier: input.model ?? 'gpt-5.4-mini',
      input_token_semantic: inputTokenSemantic,
      reported_input_tokens: reportedInputTokens,
      reported_output_tokens: input.outputTokens,
      reported_total_tokens: (reportedInputTokens ?? input.grossInputTokens) + input.outputTokens,
      accounting_input_tokens: input.grossInputTokens,
      accounting_output_tokens: input.outputTokens,
      accounting_total_tokens: input.grossInputTokens + input.outputTokens,
      standard_input_tokens: standardInputTokens,
      cache_miss_input_tokens: cacheMissInputTokens,
      cache_read_input_tokens: cacheReadTokens,
      cache_creation_input_tokens: cacheCreationTokens,
      cache_creation_5m_input_tokens: input.cacheCreation5mTokens ?? 0,
      cache_creation_1h_input_tokens: input.cacheCreation1hTokens ?? 0,
      cache_state: input.cacheState ?? (cacheReadTokens > 0 || cacheCreationTokens > 0 ? 'positive' : 'not_reported'),
      billable_output_tokens: input.outputTokens,
      pricing_status: input.pricingStatus ?? (input.status === 'local_no_api_bill' ? 'local_no_api_bill' : input.status === 'estimated' || input.status === 'partial_price_missing' ? 'trusted' : 'missing'),
      api_cost_status: input.status,
      currency: input.totalCost === null || input.status === 'local_no_api_bill' ? null : 'USD',
      estimated_api_input_cost: input.inputCost ?? null,
      estimated_api_standard_input_cost: input.standardInputCost ?? null,
      estimated_api_cache_read_input_cost: input.cacheReadInputCost ?? null,
      estimated_api_cache_creation_input_cost: input.cacheCreationInputCost ?? null,
      estimated_api_cache_creation_5m_input_cost: input.cacheCreation5mInputCost ?? null,
      estimated_api_output_cost: input.outputCost ?? null,
      estimated_api_total_cost: input.totalCost,
      missing_price_dimensions: input.missingPriceDimensions ?? [],
      pricing_policy_key: input.pricingPolicyKey ?? null,
    },
  });
};

describe('token usage ledger GraphQL provider semantics', () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let appDataDir: string;

  beforeAll(async () => {
    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
    configureTokenUsageMigrationReadiness({ kind: 'READY' });
    appDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-token-usage-graphql-'));
    fs.writeFileSync(
      path.join(appDataDir, '.env'),
      [
        'AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000',
        'APP_ENV=test',
        'DB_TYPE=sqlite',
        `DATABASE_URL=${process.env.DATABASE_URL ?? ''}`,
      ].join('\n') + '\n',
      'utf8',
    );
    appConfigProvider.resetForTests();
    const config = appConfigProvider.initialize({ appDataDir });
    config.initialize();
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
      await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { in: runIds } } });
    }
    createdRunIds.clear();
    appConfigProvider.resetForTests();
    fs.rmSync(appDataDir, { recursive: true, force: true });
    await shutdownPrisma();
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  it('surfaces current provider/local semantics and a historical unknown row after real consolidation', async () => {
    const suffix = randomUUID();
    const anthropicRunId = `graphql-anthropic-${suffix}`;
    const customRunId = `graphql-custom-${suffix}`;
    const localRunId = `graphql-local-${suffix}`;
    const unknownRunId = `graphql-unknown-${suffix}`;

    await store.recordObservation(buildEvent({
      runId: anthropicRunId,
      observedAt: '2026-06-24T11:01:00.000Z',
      inputTokenSemantic: 'base_excludes_cache',
      grossInputTokens: 10_447,
      reportedInputTokens: 11,
      standardInputTokens: 11,
      cacheMissInputTokens: 11,
      cacheReadTokens: 10_436,
      outputTokens: 5,
      inputCost: 0.0031638,
      standardInputCost: 0.000033,
      cacheReadInputCost: 0.0031308,
      outputCost: 0.000075,
      totalCost: 0.0032388,
      status: 'estimated',
      modelProvider: 'ANTHROPIC',
      model: 'claude-sonnet-4-6',
      pricingPolicyKey: 'catalog:anthropic:claude-sonnet-4-6',
    }));
    await store.recordObservation(buildEvent({
      runId: anthropicRunId,
      observedAt: '2026-06-24T11:02:00.000Z',
      inputTokenSemantic: 'base_excludes_cache',
      grossInputTokens: 10_447,
      reportedInputTokens: 11,
      standardInputTokens: 11,
      cacheMissInputTokens: 11,
      cacheCreationTokens: 10_436,
      cacheCreation5mTokens: 10_436,
      outputTokens: 5,
      inputCost: 0.039168,
      standardInputCost: 0.000033,
      cacheCreationInputCost: 0.039135,
      cacheCreation5mInputCost: 0.039135,
      outputCost: 0.000075,
      totalCost: 0.039243,
      status: 'estimated',
      modelProvider: 'ANTHROPIC',
      model: 'claude-sonnet-4-6',
      pricingPolicyKey: 'catalog:anthropic:claude-sonnet-4-6',
    }));
    await store.recordObservation(buildEvent({
      runId: customRunId,
      observedAt: '2026-06-24T11:03:00.000Z',
      grossInputTokens: 80,
      outputTokens: 20,
      totalCost: null,
      status: 'price_missing',
      pricingStatus: 'missing',
      modelProvider: 'OPENAI_COMPATIBLE',
      model: 'custom-paid-model',
      runtimeKind: 'autobyteus',
      ingestionKind: 'autobyteus_llm_phase',
      missingPriceDimensions: ['custom_endpoint_pricing'],
    }));
    await store.recordObservation(buildEvent({
      runId: localRunId,
      observedAt: '2026-06-24T11:04:00.000Z',
      grossInputTokens: 40,
      outputTokens: 10,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      status: 'local_no_api_bill',
      pricingStatus: 'local_no_api_bill',
      cacheState: 'unsupported_or_local',
      modelProvider: 'OLLAMA',
      model: 'local-model',
      runtimeKind: 'autobyteus',
      ingestionKind: 'autobyteus_llm_phase',
    }));
    createdRunIds.add(unknownRunId);
    await rootPrismaClient.tokenUsageLedgerEvent.create({
      data: {
        usageEventId: `graphql-provider-legacy-${suffix}`,
        idempotencyKey: `graphql-provider-legacy:${suffix}`,
        observedAt: new Date('2026-06-24T11:05:00.000Z'),
        runId: unknownRunId,
        runtimeKind: 'codex_app_server',
        ingestionKind: 'codex_thread_token_usage',
        usageScope: 'per_turn',
        inputTokenSemantic: 'unknown',
        modelProvider: 'OPENAI',
        modelIdentifier: 'legacy-unknown',
        reportedInputTokens: 1_000,
        reportedOutputTokens: 20,
        reportedTotalTokens: 1_020,
        accountingInputTokens: 1_000,
        accountingOutputTokens: 20,
        accountingTotalTokens: 1_020,
        standardInputTokens: 200,
        cacheMissInputTokens: 200,
        cacheReadInputTokens: 800,
        cacheCreationInputTokens: 0,
        cacheCreation5mInputTokens: 0,
        cacheCreation1hInputTokens: 0,
        cacheState: 'positive',
        billableInputTokens: 1_000,
        billableOutputTokens: 20,
        currency: 'USD',
        inputPricePerMillion: 10,
        outputPricePerMillion: 20,
        cachedInputReadPricePerMillion: 5,
        pricingStatus: 'trusted',
        missingPriceDimensionsJson: '[]',
        estimatedApiInputCost: 0.01,
        estimatedApiStandardInputCost: 0.002,
        estimatedApiCacheReadInputCost: 0.008,
        estimatedApiOutputCost: 0.004,
        estimatedApiTotalCost: 0.014,
        apiCostStatus: 'estimated',
      },
    });
    const migration = new TokenUsageRunRecordsV1AppDataMigration(
      new LegacyTokenUsageConsolidationRepository(rootPrismaClient),
    );
    await expect(migration.execute()).resolves.toMatchObject({
      status: 'SUCCEEDED',
      summary: { scannedCount: 1, migratedCount: 1, failedCount: 0 },
      errorMessage: null,
    });
    await expect(rootPrismaClient.tokenUsageLedgerEvent.count()).resolves.toBe(0);

    const query = `
      query ProviderSemantics($anthropicRunId: String!, $customRunId: String!, $localRunId: String!, $unknownRunId: String!) {
        anthropic: getAgentRunTokenUsageSummary(runId: $anthropicRunId) {
          grossInputTokens
          standardInputTokens
          cacheReadInputTokens
          cacheCreationInputTokens
          cacheCreation5mInputTokens
          cacheCreation1hInputTokens
          cacheReadInputTokenRate
          cacheCreationInputTokenRate
          estimatedApiCacheCreation5mInputCost
          estimatedApiTotalCost
          apiCostStatus
          latestModelProvider
          usageReportCount
        }
        custom: getAgentRunTokenUsageSummary(runId: $customRunId) {
          grossInputTokens
          estimatedApiTotalCost
          currency
          apiCostStatus
          missingPriceDimensions
          latestModelProvider
        }
        local: getAgentRunTokenUsageSummary(runId: $localRunId) {
          grossInputTokens
          estimatedApiTotalCost
          currency
          apiCostStatus
          cacheState
          latestModelProvider
        }
        unknown: getAgentRunTokenUsageSummary(runId: $unknownRunId) {
          grossInputTokens
          standardInputTokens
          cacheReadInputTokens
          cacheState
          estimatedApiInputCost
          estimatedApiOutputCost
          estimatedApiTotalCost
          apiCostStatus
          missingPriceDimensions
        }
      }
    `;

    const result = await execGraphql<{
      anthropic: Record<string, unknown>;
      custom: Record<string, unknown>;
      local: Record<string, unknown>;
      unknown: Record<string, unknown>;
    }>(query, { anthropicRunId, customRunId, localRunId, unknownRunId });

    expect(result.anthropic).toMatchObject({
      grossInputTokens: 20_894,
      standardInputTokens: 22,
      cacheReadInputTokens: 10_436,
      cacheCreationInputTokens: 10_436,
      cacheCreation5mInputTokens: 10_436,
      cacheCreation1hInputTokens: 0,
      estimatedApiCacheCreation5mInputCost: 0.039135,
      apiCostStatus: 'estimated',
      latestModelProvider: 'ANTHROPIC',
      usageReportCount: 2,
    });
    expect(result.anthropic.cacheReadInputTokenRate).toBeCloseTo(10_436 / 20_894, 8);
    expect(result.anthropic.cacheCreationInputTokenRate).toBeCloseTo(10_436 / 20_894, 8);
    expect(result.anthropic.estimatedApiTotalCost).toBeCloseTo(0.0424818, 10);

    expect(result.custom).toMatchObject({
      grossInputTokens: 80,
      estimatedApiTotalCost: null,
      currency: null,
      apiCostStatus: 'price_missing',
      missingPriceDimensions: ['custom_endpoint_pricing'],
      latestModelProvider: 'OPENAI_COMPATIBLE',
    });
    expect(result.local).toMatchObject({
      grossInputTokens: 40,
      estimatedApiTotalCost: 0,
      currency: null,
      apiCostStatus: 'local_no_api_bill',
      cacheState: 'unsupported_or_local',
      latestModelProvider: 'OLLAMA',
    });
    expect(result.unknown).toMatchObject({
      grossInputTokens: 1_000,
      standardInputTokens: 0,
      cacheReadInputTokens: 0,
      cacheState: 'unknown',
      estimatedApiInputCost: null,
      estimatedApiOutputCost: 0.004,
      estimatedApiTotalCost: 0.004,
      apiCostStatus: 'partial_price_missing',
      missingPriceDimensions: ['input_token_semantic', 'standard_input_tokens'],
    });
  });

  it('serializes safe-integer token aggregates above the GraphQL Int range', async () => {
    const suffix = randomUUID();
    const runId = `graphql-safe-int-${suffix}`;
    const start = '2026-06-25T11:00:00.000Z';
    const end = '2026-06-25T11:10:00.000Z';
    const firstEventInputTokens = 1_500_000_000;
    const secondEventInputTokens = 1_636_827_911;
    const expectedInputTokens = firstEventInputTokens + secondEventInputTokens;
    const expectedOutputTokens = 30;
    const expectedTotalTokens = expectedInputTokens + expectedOutputTokens;

    await store.recordObservation(buildEvent({
      runId,
      observedAt: '2026-06-25T11:01:00.000Z',
      grossInputTokens: firstEventInputTokens,
      outputTokens: 10,
      totalCost: null,
      status: 'price_missing',
      model: `safe-int-${suffix}`,
      runtimeKind: 'safe-int-runtime',
    }));
    await store.recordObservation(buildEvent({
      runId,
      observedAt: '2026-06-25T11:02:00.000Z',
      grossInputTokens: secondEventInputTokens,
      outputTokens: 20,
      totalCost: null,
      status: 'price_missing',
      model: `safe-int-${suffix}`,
      runtimeKind: 'safe-int-runtime',
    }));

    const query = `
      query SafeIntegerTokenUsage($runId: String!, $start: DateTime!, $end: DateTime!) {
        tokenUsageTaskStatisticsInPeriod(startTime: $start, endTime: $end) {
          rows {
            rowId
            rowKind
            aggregate {
              grossInputTokens
              standardInputTokens
              outputTokens
              totalTokens
              usageReportCount
            }
          }
        }
        usageStatisticsInPeriod(startTime: $start, endTime: $end) {
          runtimeKind
          llmModel
          inputTokens
          promptTokens
          outputTokens
          aggregate {
            grossInputTokens
            standardInputTokens
            outputTokens
            totalTokens
            usageReportCount
          }
        }
        getAgentRunTokenUsageSummary(runId: $runId) {
          grossInputTokens
          standardInputTokens
          outputTokens
          totalTokens
          usageReportCount
        }
      }
    `;

    const result = await execGraphql<{
      tokenUsageTaskStatisticsInPeriod: { rows: Array<Record<string, unknown>> };
      usageStatisticsInPeriod: Array<Record<string, unknown>>;
      getAgentRunTokenUsageSummary: Record<string, unknown>;
    }>(query, {
      runId,
      start: new Date(start),
      end: new Date(end),
    });

    expect(result.tokenUsageTaskStatisticsInPeriod.rows).toEqual([
      expect.objectContaining({
        rowId: `agent:${runId}`,
        rowKind: 'AGENT_RUN',
        aggregate: expect.objectContaining({
          grossInputTokens: expectedInputTokens,
          standardInputTokens: expectedInputTokens,
          outputTokens: expectedOutputTokens,
          totalTokens: expectedTotalTokens,
          usageReportCount: 2,
        }),
      }),
    ]);
    expect(result.usageStatisticsInPeriod).toEqual([
      expect.objectContaining({
        runtimeKind: 'safe-int-runtime',
        llmModel: `safe-int-${suffix}`,
        inputTokens: expectedInputTokens,
        promptTokens: expectedInputTokens,
        outputTokens: expectedOutputTokens,
        aggregate: expect.objectContaining({
          grossInputTokens: expectedInputTokens,
          standardInputTokens: expectedInputTokens,
          outputTokens: expectedOutputTokens,
          totalTokens: expectedTotalTokens,
          usageReportCount: 2,
        }),
      }),
    ]);
    expect(result.getAgentRunTokenUsageSummary).toMatchObject({
      grossInputTokens: expectedInputTokens,
      standardInputTokens: expectedInputTokens,
      outputTokens: expectedOutputTokens,
      totalTokens: expectedTotalTokens,
      usageReportCount: 2,
    });
  });

  it('commits an unsafe aggregate exactly and rejects the live GraphQL projection without rounding', async () => {
    const suffix = randomUUID();
    const runId = `graphql-unsafe-int-${suffix}`;
    await store.recordObservation(buildEvent({
      runId,
      observedAt: '2026-06-25T12:01:00.000Z',
      grossInputTokens: Number.MAX_SAFE_INTEGER,
      outputTokens: 0,
      totalCost: null,
      status: 'price_missing',
      model: `unsafe-int-${suffix}`,
      runtimeKind: 'unsafe-int-runtime',
    }));

    await expect(store.recordObservation(buildEvent({
      runId,
      observedAt: '2026-06-25T12:02:00.000Z',
      grossInputTokens: 1,
      outputTokens: 0,
      totalCost: null,
      status: 'price_missing',
      model: `unsafe-int-${suffix}`,
      runtimeKind: 'unsafe-int-runtime',
    }))).rejects.toMatchObject({
      name: 'TokenUsageSafeIntegerExceededError',
      code: 'TOKEN_USAGE_SAFE_INTEGER_EXCEEDED',
      field: 'accounting_input_tokens',
    });

    const committed = await rootPrismaClient.tokenUsageRunRecord.findUnique({ where: { runId } });
    expect(committed).toMatchObject({
      accountingInputTokens: 9_007_199_254_740_992n,
      revision: 2n,
      usageReportCount: 2n,
    });

    const result = await graphql({
      schema,
      source: `query UnsafeIntegerTokenUsage($runId: String!) {
        getAgentRunTokenUsageSummary(runId: $runId) { grossInputTokens usageReportCount }
      }`,
      variableValues: { runId },
    });
    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.message).toBe('TOKEN_USAGE_SAFE_INTEGER_EXCEEDED:accounting_input_tokens');
  });

});
