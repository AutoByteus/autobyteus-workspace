import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { PrismaClient } from "@prisma/client";
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
import { TokenUsageLedgerStore } from "../../../src/token-usage/providers/token-usage-ledger-store.js";
import { initializeTestAppConfig, type TestAppConfigHandle } from "../../setup/initialize-test-app-config.js";

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
  outputTokens: number;
  estimatedApiInputCost: number | null;
  estimatedApiStandardInputCost: number | null;
  estimatedApiCacheReadInputCost: number | null;
  estimatedApiCacheCreationInputCost: number | null;
  estimatedApiOutputCost: number | null;
  estimatedApiTotalCost: number | null;
  apiCostStatus: string;
  selectedPricingTierId: string | null;
  latestModelIdentifier: string | null;
  unitPrices: {
    standardInput: UnitPrice;
    cacheReadInput: UnitPrice;
    cacheCreationInput: UnitPrice;
    output: UnitPrice;
  };
};

const prisma = new PrismaClient();
const store = new TokenUsageLedgerStore();
const createdRunIds = new Set<string>();

describe("GPT-5.6 token usage accounting and GraphQL convergence", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let appConfig: TestAppConfigHandle;

  beforeAll(async () => {
    appConfig = initializeTestAppConfig();
    LLMFactory.resetForTests();
    (LLMFactory as unknown as { initialized: boolean }).initialized = true;
    const gpt56Sol = supportedModelDefinitions.find((definition) => definition.name === "gpt-5.6-sol");
    if (!gpt56Sol) throw new Error("gpt-5.6-sol must exist in the built-in model catalog");
    LLMFactory.registerModel(new LLMModel(gpt56Sol));
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
      await prisma.tokenUsageLedgerEvent.deleteMany({ where: { runId: { in: runIds } } });
    }
    createdRunIds.clear();
    appConfig.cleanup();
    await prisma.$disconnect();
  });

  const buildPricedPayload = async (input: {
    runId: string;
    grossInputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    outputTokens: number;
  }): Promise<TokenUsageUpdatedPayload> => {
    const rawPayload = createTokenUsageUpdatedPayload({
      runId: input.runId,
      payload: {
        usage_event_id: `gpt56-accounting-${randomUUID()}`,
        idempotency_key: `gpt56-accounting:${randomUUID()}`,
        observed_at: "2042-07-10T12:00:00.000Z",
        runtime_kind: "autobyteus",
        ingestion_kind: "autobyteus_llm_phase",
        usage_scope: "per_call",
        input_token_semantic: "gross_includes_cache",
        model_provider: "OPENAI",
        model_identifier: "gpt-5.6-sol",
        model_value: "gpt-5.6-sol",
        reported_input_tokens: input.grossInputTokens,
        reported_output_tokens: input.outputTokens,
        reported_total_tokens: input.grossInputTokens + input.outputTokens,
        cache_read_input_tokens: input.cacheReadTokens,
        cache_creation_input_tokens: input.cacheWriteTokens,
        cache_creation_5m_input_tokens: 0,
        cache_creation_1h_input_tokens: 0,
        cache_state: "positive",
        billable_output_tokens: input.outputTokens,
        agent_name: "GPT-5.6 accounting E2E",
        run_summary: "Deterministic accounting fixture",
        run_created_at: "2042-07-10T11:59:00.000Z",
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
        query Gpt56Accounting($runId: String!) {
          getAgentRunTokenUsageSummary(runId: $runId) {
            runId
            grossInputTokens
            standardInputTokens
            cacheReadInputTokens
            cacheCreationInputTokens
            outputTokens
            estimatedApiInputCost
            estimatedApiStandardInputCost
            estimatedApiCacheReadInputCost
            estimatedApiCacheCreationInputCost
            estimatedApiOutputCost
            estimatedApiTotalCost
            apiCostStatus
            selectedPricingTierId
            latestModelIdentifier
            unitPrices {
              standardInput { status pricePerMillion }
              cacheReadInput { status pricePerMillion }
              cacheCreationInput { status pricePerMillion }
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
      label: "standard <=272K tier",
      grossInputTokens: 1_000,
      cacheReadTokens: 200,
      cacheWriteTokens: 300,
      outputTokens: 100,
      tierId: "standard_le_272k",
      prices: { input: 5, cacheRead: 0.5, cacheWrite: 6.25, output: 30 },
      costs: { standard: 0.0025, cacheRead: 0.0001, cacheWrite: 0.001875, input: 0.004475, output: 0.003, total: 0.007475 },
    },
    {
      label: "long-context >272K tier",
      grossInputTokens: 300_000,
      cacheReadTokens: 20_000,
      cacheWriteTokens: 30_000,
      outputTokens: 1_000,
      tierId: "long_context_gt_272k",
      prices: { input: 10, cacheRead: 1, cacheWrite: 12.5, output: 45 },
      costs: { standard: 2.5, cacheRead: 0.02, cacheWrite: 0.375, input: 2.895, output: 0.045, total: 2.94 },
    },
  ])("preserves exact generic components and costs through the $label", async (testCase) => {
    const runId = `gpt56-accounting-${randomUUID()}`;
    createdRunIds.add(runId);
    const standardInputTokens = testCase.grossInputTokens - testCase.cacheReadTokens - testCase.cacheWriteTokens;
    const priced = await buildPricedPayload({ runId, ...testCase });

    expect(priced).toMatchObject({
      accounting_input_tokens: testCase.grossInputTokens,
      standard_input_tokens: standardInputTokens,
      cache_read_input_tokens: testCase.cacheReadTokens,
      cache_creation_input_tokens: testCase.cacheWriteTokens,
      meter_delta_input_tokens: testCase.grossInputTokens,
      input_price_per_million: testCase.prices.input,
      cached_input_read_price_per_million: testCase.prices.cacheRead,
      cached_input_write_price_per_million: testCase.prices.cacheWrite,
      output_price_per_million: testCase.prices.output,
      selected_pricing_tier_id: testCase.tierId,
      api_cost_status: "estimated",
    });
    expect(priced.estimated_api_standard_input_cost).toBeCloseTo(testCase.costs.standard, 12);
    expect(priced.estimated_api_cache_read_input_cost).toBeCloseTo(testCase.costs.cacheRead, 12);
    expect(priced.estimated_api_cache_creation_input_cost).toBeCloseTo(testCase.costs.cacheWrite, 12);
    expect(priced.estimated_api_input_cost).toBeCloseTo(testCase.costs.input, 12);
    expect(priced.estimated_api_output_cost).toBeCloseTo(testCase.costs.output, 12);
    expect(priced.estimated_api_total_cost).toBeCloseTo(testCase.costs.total, 12);
    expect(priced.estimated_api_input_cost).toBeCloseTo(
      testCase.costs.standard + testCase.costs.cacheRead + testCase.costs.cacheWrite,
      12,
    );

    const liveMessage = new AgentRunEventMessageMapper().map({
      eventType: AgentRunEventType.TOKEN_USAGE_UPDATED,
      runId,
      payload: priced as unknown as Record<string, unknown>,
      statusHint: null,
    });
    expect(liveMessage.type).toBe(ServerMessageType.TOKEN_USAGE_UPDATED);
    expect(liveMessage.payload).toMatchObject({
      run_id: runId,
      cache_creation_input_tokens: testCase.cacheWriteTokens,
      cached_input_write_price_per_million: testCase.prices.cacheWrite,
      estimated_api_cache_creation_input_cost: testCase.costs.cacheWrite,
      estimated_api_input_cost: testCase.costs.input,
      estimated_api_total_cost: testCase.costs.total,
    });

    await store.appendTokenUsageEvent(priced);
    const hydrated = await execSummary(runId);
    expect(hydrated).toMatchObject({
      runId,
      grossInputTokens: testCase.grossInputTokens,
      standardInputTokens,
      cacheReadInputTokens: testCase.cacheReadTokens,
      cacheCreationInputTokens: testCase.cacheWriteTokens,
      outputTokens: testCase.outputTokens,
      apiCostStatus: "estimated",
      selectedPricingTierId: testCase.tierId,
      latestModelIdentifier: "gpt-5.6-sol",
      unitPrices: {
        standardInput: { status: "single", pricePerMillion: testCase.prices.input },
        cacheReadInput: { status: "single", pricePerMillion: testCase.prices.cacheRead },
        cacheCreationInput: { status: "single", pricePerMillion: testCase.prices.cacheWrite },
        output: { status: "single", pricePerMillion: testCase.prices.output },
      },
    });
    expect(hydrated.estimatedApiStandardInputCost).toBeCloseTo(testCase.costs.standard, 12);
    expect(hydrated.estimatedApiCacheReadInputCost).toBeCloseTo(testCase.costs.cacheRead, 12);
    expect(hydrated.estimatedApiCacheCreationInputCost).toBeCloseTo(testCase.costs.cacheWrite, 12);
    expect(hydrated.estimatedApiInputCost).toBeCloseTo(testCase.costs.input, 12);
    expect(hydrated.estimatedApiOutputCost).toBeCloseTo(testCase.costs.output, 12);
    expect(hydrated.estimatedApiTotalCost).toBeCloseTo(testCase.costs.total, 12);
  });
});
