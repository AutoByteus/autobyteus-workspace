import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { initializePrisma, rootPrismaClient, shutdownPrisma } from "repository_prisma";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { supportedModelDefinitions } from "autobyteus-ts/llm/supported-model-definitions.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import {
  createTokenUsageUpdatedPayload,
  type TokenUsageUpdatedPayload,
} from "../../../src/agent-execution/domain/agent-run-token-usage.js";
import { AgentRunEventMessageMapper } from "../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { ServerMessageType } from "../../../src/services/agent-streaming/models.js";
import { TokenCostCalculator } from "../../../src/token-usage/pricing/token-cost-calculator.js";
import { TokenUsageComponentBasisResolver } from "../../../src/token-usage/projections/token-usage-component-basis-resolver.js";
import { TokenUsageSnapshotDeltaNormalizer } from "../../../src/token-usage/projections/token-usage-snapshot-delta-normalizer.js";
import { configureTokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";
import { createCurrentTokenUsageTestHarness } from "../../helpers/token-usage-run-record-fixtures.js";

type UnitPrice = {
  status: string;
  pricePerMillion: number | null;
};

type Summary = {
  runId: string;
  grossInputTokens: number;
  standardInputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  cacheCreation5mInputTokens: number;
  cacheCreation1hInputTokens: number;
  outputTokens: number;
  estimatedApiInputCost: number | null;
  estimatedApiStandardInputCost: number | null;
  estimatedApiCacheReadInputCost: number | null;
  estimatedApiCacheCreationInputCost: number | null;
  estimatedApiCacheCreation5mInputCost: number | null;
  estimatedApiCacheCreation1hInputCost: number | null;
  estimatedApiOutputCost: number | null;
  estimatedApiTotalCost: number | null;
  apiCostStatus: string;
  currency: string | null;
  pricingPolicyKey: string | null;
  selectedPricingTierId: string | null;
  latestModelIdentifier: string | null;
  unitPrices: {
    standardInput: UnitPrice;
    cacheReadInput: UnitPrice;
    cacheCreationInput: UnitPrice;
    cacheCreation5mInput: UnitPrice;
    cacheCreation1hInput: UnitPrice;
    output: UnitPrice;
  };
};

const { store } = createCurrentTokenUsageTestHarness(rootPrismaClient);
const createdRunIds = new Set<string>();

describe("Astra and Fable 5.1 token usage accounting and GraphQL convergence", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeAll(async () => {
    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
    configureTokenUsageMigrationReadiness({ kind: "READY" });
    LLMFactory.resetForTests();
    (LLMFactory as unknown as { initialized: boolean }).initialized = true;
    for (const modelId of ["gpt-6-astra", "claude-fable-5-1"]) {
      const definition = supportedModelDefinitions.find((candidate) => candidate.name === modelId);
      if (!definition) throw new Error(`${modelId} must exist in the built-in model catalog`);
      LLMFactory.registerModel(new LLMModel(definition));
    }
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    const runIds = Array.from(createdRunIds);
    if (runIds.length > 0) {
      await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { in: runIds } } });
    }
    createdRunIds.clear();
    LLMFactory.resetForTests();
    await shutdownPrisma();
  });

  const buildPricedPayload = async (input: {
    runId: string;
    runtimeKind: string;
    ingestionKind: string;
    provider: string;
    modelId: string;
    grossInputTokens: number;
    cacheReadTokens: number;
    genericCacheWriteTokens?: number;
    cacheWrite5mTokens?: number;
    cacheWrite1hTokens?: number;
    outputTokens: number;
  }): Promise<TokenUsageUpdatedPayload> => {
    const genericCacheWriteTokens = input.genericCacheWriteTokens ?? 0;
    const cacheWrite5mTokens = input.cacheWrite5mTokens ?? 0;
    const cacheWrite1hTokens = input.cacheWrite1hTokens ?? 0;
    const cacheCreationTokens = genericCacheWriteTokens + cacheWrite5mTokens + cacheWrite1hTokens;
    const rawPayload = createTokenUsageUpdatedPayload({
      runId: input.runId,
      payload: {
        usage_event_id: `astra-fable-accounting-${randomUUID()}`,
        idempotency_key: `astra-fable-accounting:${randomUUID()}`,
        observed_at: "2042-09-22T12:00:00.000Z",
        runtime_kind: input.runtimeKind,
        ingestion_kind: input.ingestionKind,
        usage_scope: "per_call",
        input_token_semantic: "gross_includes_cache",
        model_provider: input.provider,
        model_identifier: input.modelId,
        model_value: input.modelId,
        reported_input_tokens: input.grossInputTokens,
        reported_output_tokens: input.outputTokens,
        reported_total_tokens: input.grossInputTokens + input.outputTokens,
        cache_read_input_tokens: input.cacheReadTokens,
        cache_creation_input_tokens: cacheCreationTokens,
        cache_creation_5m_input_tokens: cacheWrite5mTokens,
        cache_creation_1h_input_tokens: cacheWrite1hTokens,
        cache_state: "positive",
        billable_output_tokens: input.outputTokens,
        agent_name: "Astra/Fable accounting E2E",
        run_summary: "Deterministic non-network accounting fixture",
        run_created_at: "2042-09-22T11:59:00.000Z",
      },
    });
    const withComponents = new TokenUsageComponentBasisResolver().resolve(rawPayload);
    const withDelta = await new TokenUsageSnapshotDeltaNormalizer({
      getLatestCumulativeSnapshot: async () => null,
    } as never).normalizeAccountingDelta(withComponents);
    return new TokenCostCalculator().enrichCost(withDelta);
  };

  const execSummary = async (runId: string): Promise<Summary> => {
    const result = await graphql({
      schema,
      source: `
        query TargetAccounting($runId: String!) {
          getAgentRunTokenUsageSummary(runId: $runId) {
            runId
            grossInputTokens
            standardInputTokens
            cacheReadInputTokens
            cacheCreationInputTokens
            cacheCreation5mInputTokens
            cacheCreation1hInputTokens
            outputTokens
            estimatedApiInputCost
            estimatedApiStandardInputCost
            estimatedApiCacheReadInputCost
            estimatedApiCacheCreationInputCost
            estimatedApiCacheCreation5mInputCost
            estimatedApiCacheCreation1hInputCost
            estimatedApiOutputCost
            estimatedApiTotalCost
            apiCostStatus
            currency
            pricingPolicyKey
            selectedPricingTierId
            latestModelIdentifier
            unitPrices {
              standardInput { status pricePerMillion }
              cacheReadInput { status pricePerMillion }
              cacheCreationInput { status pricePerMillion }
              cacheCreation5mInput { status pricePerMillion }
              cacheCreation1hInput { status pricePerMillion }
              output { status pricePerMillion }
            }
          }
        }
      `,
      variableValues: { runId },
    });
    if (result.errors?.length) throw result.errors[0];
    return (result.data as { getAgentRunTokenUsageSummary: Summary }).getAgentRunTokenUsageSummary;
  };

  it.each([
    {
      label: "standard tier at exactly 272,000 input tokens",
      grossInputTokens: 272_000,
      cacheWriteTokens: 72_000,
      tierId: "standard_le_272k",
      prices: { input: 10, cacheRead: 1, cacheWrite: 12.5, output: 50 },
      costs: { standard: 1, cacheRead: 0.1, cacheWrite: 0.9, input: 2, output: 0.05, total: 2.05 },
    },
    {
      label: "long-context tier at 272,001 input tokens",
      grossInputTokens: 272_001,
      cacheWriteTokens: 72_001,
      tierId: "long_context_gt_272k",
      prices: { input: 20, cacheRead: 2, cacheWrite: 25, output: 75 },
      costs: { standard: 2, cacheRead: 0.2, cacheWrite: 1.800025, input: 4.000025, output: 0.075, total: 4.075025 },
    },
  ])("publishes an estimated Astra summary through the $label", async (testCase) => {
    const runId = `astra-accounting-${randomUUID()}`;
    createdRunIds.add(runId);
    const priced = await buildPricedPayload({
      runId,
      runtimeKind: "codex_app_server",
      ingestionKind: "codex_thread_token_usage",
      provider: "OPENAI",
      modelId: "gpt-6-astra",
      grossInputTokens: testCase.grossInputTokens,
      cacheReadTokens: 100_000,
      genericCacheWriteTokens: testCase.cacheWriteTokens,
      outputTokens: 1_000,
    });

    expect(priced).toMatchObject({
      standard_input_tokens: 100_000,
      cache_read_input_tokens: 100_000,
      cache_creation_input_tokens: testCase.cacheWriteTokens,
      selected_pricing_tier_id: testCase.tierId,
      pricing_status: "trusted",
      api_cost_status: "estimated",
      currency: "USD",
      input_price_per_million: testCase.prices.input,
      cached_input_read_price_per_million: testCase.prices.cacheRead,
      cached_input_write_price_per_million: testCase.prices.cacheWrite,
      output_price_per_million: testCase.prices.output,
      missing_price_dimensions: [],
    });
    expect(priced.estimated_api_standard_input_cost).toBeCloseTo(testCase.costs.standard, 12);
    expect(priced.estimated_api_cache_read_input_cost).toBeCloseTo(testCase.costs.cacheRead, 12);
    expect(priced.estimated_api_cache_creation_input_cost).toBeCloseTo(testCase.costs.cacheWrite, 12);
    expect(priced.estimated_api_input_cost).toBeCloseTo(testCase.costs.input, 12);
    expect(priced.estimated_api_output_cost).toBeCloseTo(testCase.costs.output, 12);
    expect(priced.estimated_api_total_cost).toBeCloseTo(testCase.costs.total, 12);

    const liveMessage = new AgentRunEventMessageMapper().map({
      eventType: AgentRunEventType.TOKEN_USAGE_UPDATED,
      runId,
      payload: priced as unknown as Record<string, unknown>,
      statusHint: null,
    });
    expect(liveMessage.type).toBe(ServerMessageType.TOKEN_USAGE_UPDATED);
    expect(liveMessage.payload).toMatchObject({
      run_id: runId,
      model_identifier: "gpt-6-astra",
      api_cost_status: "estimated",
      selected_pricing_tier_id: testCase.tierId,
    });

    await store.recordObservation(priced);
    const hydrated = await execSummary(runId);
    expect(hydrated).toMatchObject({
      runId,
      grossInputTokens: testCase.grossInputTokens,
      standardInputTokens: 100_000,
      cacheReadInputTokens: 100_000,
      cacheCreationInputTokens: testCase.cacheWriteTokens,
      outputTokens: 1_000,
      apiCostStatus: "estimated",
      currency: "USD",
      pricingPolicyKey: "autobyteus_model_catalog:OPENAI:gpt-6-astra",
      selectedPricingTierId: testCase.tierId,
      latestModelIdentifier: "gpt-6-astra",
      unitPrices: {
        standardInput: { status: "single", pricePerMillion: testCase.prices.input },
        cacheReadInput: { status: "single", pricePerMillion: testCase.prices.cacheRead },
        cacheCreationInput: { status: "single", pricePerMillion: testCase.prices.cacheWrite },
        output: { status: "single", pricePerMillion: testCase.prices.output },
      },
    });
    expect(hydrated.estimatedApiInputCost).toBeCloseTo(testCase.costs.input, 12);
    expect(hydrated.estimatedApiOutputCost).toBeCloseTo(testCase.costs.output, 12);
    expect(hydrated.estimatedApiTotalCost).toBeCloseTo(testCase.costs.total, 12);
  });

  it("publishes all Fable 5.1 cache price dimensions and calculated costs", async () => {
    const runId = `fable-51-accounting-${randomUUID()}`;
    createdRunIds.add(runId);
    const priced = await buildPricedPayload({
      runId,
      runtimeKind: "claude_agent_sdk",
      ingestionKind: "claude_session_token_usage",
      provider: "ANTHROPIC",
      modelId: "claude-fable-5-1",
      grossInputTokens: 100_000,
      cacheReadTokens: 10_000,
      cacheWrite5mTokens: 20_000,
      cacheWrite1hTokens: 30_000,
      outputTokens: 1_000,
    });

    expect(priced).toMatchObject({
      standard_input_tokens: 40_000,
      cache_read_input_tokens: 10_000,
      cache_creation_input_tokens: 50_000,
      cache_creation_5m_input_tokens: 20_000,
      cache_creation_1h_input_tokens: 30_000,
      pricing_status: "trusted",
      api_cost_status: "estimated",
      currency: "USD",
      input_price_per_million: 10,
      cached_input_read_price_per_million: 0.25,
      cached_input_write_5m_price_per_million: 12.5,
      cached_input_write_1h_price_per_million: 20,
      output_price_per_million: 50,
      missing_price_dimensions: [],
    });
    expect(priced.estimated_api_standard_input_cost).toBeCloseTo(0.4, 12);
    expect(priced.estimated_api_cache_read_input_cost).toBeCloseTo(0.0025, 12);
    expect(priced.estimated_api_cache_creation_5m_input_cost).toBeCloseTo(0.25, 12);
    expect(priced.estimated_api_cache_creation_1h_input_cost).toBeCloseTo(0.6, 12);
    expect(priced.estimated_api_cache_creation_input_cost).toBeCloseTo(0.85, 12);
    expect(priced.estimated_api_input_cost).toBeCloseTo(1.2525, 12);
    expect(priced.estimated_api_output_cost).toBeCloseTo(0.05, 12);
    expect(priced.estimated_api_total_cost).toBeCloseTo(1.3025, 12);

    await store.recordObservation(priced);
    const hydrated = await execSummary(runId);
    expect(hydrated).toMatchObject({
      runId,
      grossInputTokens: 100_000,
      standardInputTokens: 40_000,
      cacheReadInputTokens: 10_000,
      cacheCreationInputTokens: 50_000,
      cacheCreation5mInputTokens: 20_000,
      cacheCreation1hInputTokens: 30_000,
      outputTokens: 1_000,
      apiCostStatus: "estimated",
      currency: "USD",
      pricingPolicyKey: "autobyteus_model_catalog:ANTHROPIC:claude-fable-5-1",
      selectedPricingTierId: null,
      latestModelIdentifier: "claude-fable-5-1",
      unitPrices: {
        standardInput: { status: "single", pricePerMillion: 10 },
        cacheReadInput: { status: "single", pricePerMillion: 0.25 },
        cacheCreationInput: { status: "not_applicable", pricePerMillion: null },
        cacheCreation5mInput: { status: "single", pricePerMillion: 12.5 },
        cacheCreation1hInput: { status: "single", pricePerMillion: 20 },
        output: { status: "single", pricePerMillion: 50 },
      },
    });
    expect(hydrated.estimatedApiCacheCreation5mInputCost).toBeCloseTo(0.25, 12);
    expect(hydrated.estimatedApiCacheCreation1hInputCost).toBeCloseTo(0.6, 12);
    expect(hydrated.estimatedApiInputCost).toBeCloseTo(1.2525, 12);
    expect(hydrated.estimatedApiTotalCost).toBeCloseTo(1.3025, 12);
  });

  it("keeps an unsupported near-match price-missing through the public summary", async () => {
    const runId = `fable-alias-missing-${randomUUID()}`;
    createdRunIds.add(runId);
    const priced = await buildPricedPayload({
      runId,
      runtimeKind: "autobyteus",
      ingestionKind: "autobyteus_llm_phase",
      provider: "ANTHROPIC",
      modelId: "claude-fable-5.1",
      grossInputTokens: 1_000,
      cacheReadTokens: 0,
      outputTokens: 100,
    });

    expect(priced).toMatchObject({
      pricing_status: "missing",
      pricing_missing_reason: "model_not_found",
      api_cost_status: "price_missing",
      currency: null,
      estimated_api_total_cost: null,
    });

    await store.recordObservation(priced);
    const hydrated = await execSummary(runId);
    expect(hydrated).toMatchObject({
      runId,
      latestModelIdentifier: "claude-fable-5.1",
      apiCostStatus: "price_missing",
      currency: null,
      pricingPolicyKey: "autobyteus_model_catalog:ANTHROPIC:claude-fable-5.1",
      selectedPricingTierId: null,
      estimatedApiInputCost: null,
      estimatedApiOutputCost: null,
      estimatedApiTotalCost: null,
    });
  });
});
