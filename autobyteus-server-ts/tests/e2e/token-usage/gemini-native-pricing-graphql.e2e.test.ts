import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { initializePrisma, rootPrismaClient, shutdownPrisma } from "repository_prisma";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { supportedModelDefinitions } from "autobyteus-ts/llm/supported-model-definitions.js";
import { createGeminiTokenUsageObservation } from "autobyteus-ts/llm/api/gemini-token-usage-normalizer.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { TokenUsageUpdatedPayload } from "../../../src/agent-execution/domain/agent-run-token-usage.js";
import { TokenUsageEventEnrichmentTransformer } from "../../../src/agent-execution/events/processors/token-usage/token-usage-event-enrichment-transformer.js";
import { TokenUsageRunPersistenceTransformer } from "../../../src/agent-execution/events/processors/token-usage/token-usage-run-persistence-transformer.js";
import { configureTokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

// Native Gemini pricing through the server cost path (REQ-004, AC-005, AC-006). A Gemini `usageMetadata` object
// enters the production native usage normalizer with the real catalog model, then the server's production token
// usage enrichment (basis, delta, catalog price policy, tier selection, cost) and persistence transformers, and is
// read back through GraphQL as the Token Meter loads it. Only Google's response is stood in for.

type UnitPrice = { status: string; pricePerMillion: number | null };
type Summary = {
  grossInputTokens: number; standardInputTokens: number; cacheReadInputTokens: number; outputTokens: number;
  billableOutputTokens: number; reasoningOutputTokens: number; apiCostStatus: string; selectedPricingTierId: string | null;
  estimatedApiStandardInputCost: number | null; estimatedApiCacheReadInputCost: number | null;
  estimatedApiInputCost: number | null; estimatedApiOutputCost: number | null;
  estimatedApiReasoningOutputCost: number | null; estimatedApiTotalCost: number | null;
  unitPrices: { standardInput: UnitPrice; cacheReadInput: UnitPrice; output: UnitPrice; reasoningOutput: UnitPrice };
};

const createdRunIds = new Set<string>();
const models = new Map<string, LLMModel>();

const recordNativeGeminiCall = async (input: {
  modelId: string; observedAt: string; promptTokens: number; cachedTokens: number;
  candidatesTokens: number; thoughtsTokens: number;
}): Promise<{ runId: string; priced: TokenUsageUpdatedPayload }> => {
  const runId = `gemini-native-pricing-${randomUUID()}`;
  createdRunIds.add(runId);
  // The usage object Google returns on a generateContent(Stream) response.
  const usage = createGeminiTokenUsageObservation({
    promptTokenCount: input.promptTokens,
    cachedContentTokenCount: input.cachedTokens,
    candidatesTokenCount: input.candidatesTokens,
    thoughtsTokenCount: input.thoughtsTokens,
    totalTokenCount: input.promptTokens + input.candidatesTokens + input.thoughtsTokens,
  }, models.get(input.modelId)!);
  expect(usage).not.toBeNull();
  const runContext = new AgentRunContext({ runId, runtimeContext: null, config: new AgentRunConfig({
    agentDefinitionId: "gemini-pricing-agent", llmModelIdentifier: input.modelId, autoExecuteTools: true,
    workspaceId: null, runtimeKind: RuntimeKind.AUTOBYTEUS }) });
  // The payload the native LLM phase notifies and the AutoByteus stream converter forwards.
  const events = [{ eventType: AgentRunEventType.TOKEN_USAGE_UPDATED, runId, statusHint: null, payload: {
    usage, turn_id: "turn-1", llm_call_id: "call-1", call_sequence: 1, runtime_kind: "autobyteus",
    ingestion_kind: "autobyteus_llm_phase", idempotency_key: `${runId}:call-1`,
    latest_prompt_tokens: input.promptTokens, observed_at: input.observedAt,
  } }];
  const enriched = await new TokenUsageEventEnrichmentTransformer().transform({ runContext, events });
  const persisted = await new TokenUsageRunPersistenceTransformer().transform({ runContext, events: enriched });
  return { runId, priced: persisted[0]!.payload as unknown as TokenUsageUpdatedPayload };
};

describe("native Gemini catalog pricing through the server cost path", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeAll(async () => {
    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
    configureTokenUsageMigrationReadiness({ kind: "READY" });
    LLMFactory.resetForTests();
    (LLMFactory as unknown as { initialized: boolean }).initialized = true;
    for (const modelId of ["gemini-3.1-pro-preview", "gemini-3.8-flash"]) {
      const definition = supportedModelDefinitions.find((candidate) => candidate.name === modelId);
      if (!definition) throw new Error(`${modelId} must exist in the built-in model catalog`);
      const model = new LLMModel(definition);
      LLMFactory.registerModel(model);
      models.set(modelId, model);
    }
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    const runIds = Array.from(createdRunIds);
    if (runIds.length > 0) await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { in: runIds } } });
    createdRunIds.clear();
    LLMFactory.resetForTests();
    await shutdownPrisma();
  });

  const summary = async (runId: string): Promise<Summary> => {
    const result = await graphql({ schema, variableValues: { runId }, source: `
      query GeminiPricing($runId: String!) { getAgentRunTokenUsageSummary(runId: $runId) {
        grossInputTokens standardInputTokens cacheReadInputTokens outputTokens billableOutputTokens
        reasoningOutputTokens apiCostStatus selectedPricingTierId estimatedApiStandardInputCost
        estimatedApiCacheReadInputCost estimatedApiInputCost estimatedApiOutputCost
        estimatedApiReasoningOutputCost estimatedApiTotalCost
        unitPrices { standardInput { status pricePerMillion } cacheReadInput { status pricePerMillion }
          output { status pricePerMillion } reasoningOutput { status pricePerMillion } } } }` });
    if (result.errors?.length) throw result.errors[0];
    return (result.data as { getAgentRunTokenUsageSummary: Summary }).getAgentRunTokenUsageSummary;
  };

  it.each([
    {
      caseId: "AE-002", modelId: "gemini-3.1-pro-preview", label: "3.1 Pro, 150K prompt (<=200K tier)",
      observedAt: "2026-10-09T12:00:00Z", promptTokens: 150_000, cachedTokens: 100_000,
      tierId: "prompt_le_200k", prices: { input: 2, cacheRead: 0.2, output: 12 },
      costs: { standard: 0.1, cacheRead: 0.02, input: 0.12, output: 0.06, reasoning: 0.036, total: 0.18 },
    },
    {
      caseId: "AE-003", modelId: "gemini-3.1-pro-preview", label: "3.1 Pro, 250K prompt (>200K tier)",
      observedAt: "2026-10-09T12:00:00Z", promptTokens: 250_000, cachedTokens: 200_000,
      tierId: "prompt_gt_200k", prices: { input: 4, cacheRead: 0.4, output: 18 },
      costs: { standard: 0.2, cacheRead: 0.08, input: 0.28, output: 0.09, reasoning: 0.054, total: 0.37 },
    },
    {
      caseId: "AE-006", modelId: "gemini-3.8-flash", label: "3.8 Flash introductory prices (2026)",
      observedAt: "2026-10-09T12:00:00Z", promptTokens: 150_000, cachedTokens: 100_000,
      tierId: null, prices: { input: 0.75, cacheRead: 0.075, output: 3.75 },
      costs: { standard: 0.0375, cacheRead: 0.0075, input: 0.045, output: 0.01875, reasoning: 0.01125, total: 0.06375 },
    },
    {
      caseId: "AE-006", modelId: "gemini-3.8-flash", label: "3.8 Flash standard prices (from 2027)",
      observedAt: "2027-02-01T12:00:00Z", promptTokens: 150_000, cachedTokens: 100_000,
      tierId: null, prices: { input: 1.5, cacheRead: 0.15, output: 7.5 },
      costs: { standard: 0.075, cacheRead: 0.015, input: 0.09, output: 0.0375, reasoning: 0.0225, total: 0.1275 },
    },
  ])("$caseId prices $label at the official rates", async (testCase) => {
    // 2,000 visible output tokens + 3,000 thinking tokens: Gemini bills both at the output price.
    const { runId, priced } = await recordNativeGeminiCall({ ...testCase, candidatesTokens: 2_000, thoughtsTokens: 3_000 });
    expect(priced).toMatchObject({
      input_token_semantic: "gross_includes_cache",
      accounting_input_tokens: testCase.promptTokens,
      standard_input_tokens: testCase.promptTokens - testCase.cachedTokens,
      cache_read_input_tokens: testCase.cachedTokens,
      billable_output_tokens: 5_000,
      reasoning_output_tokens: 3_000,
      input_price_per_million: testCase.prices.input,
      cached_input_read_price_per_million: testCase.prices.cacheRead,
      output_price_per_million: testCase.prices.output,
      selected_pricing_tier_id: testCase.tierId,
      api_cost_status: "estimated",
    });

    const hydrated = await summary(runId);
    expect(hydrated).toMatchObject({
      grossInputTokens: testCase.promptTokens,
      standardInputTokens: testCase.promptTokens - testCase.cachedTokens,
      cacheReadInputTokens: testCase.cachedTokens,
      billableOutputTokens: 5_000,
      reasoningOutputTokens: 3_000,
      apiCostStatus: "estimated",
      selectedPricingTierId: testCase.tierId,
      unitPrices: {
        standardInput: { status: "single", pricePerMillion: testCase.prices.input },
        cacheReadInput: { status: "single", pricePerMillion: testCase.prices.cacheRead },
        output: { status: "single", pricePerMillion: testCase.prices.output },
        reasoningOutput: { status: "single", pricePerMillion: testCase.prices.output },
      },
    });
    expect(hydrated.estimatedApiStandardInputCost).toBeCloseTo(testCase.costs.standard, 12);
    expect(hydrated.estimatedApiCacheReadInputCost).toBeCloseTo(testCase.costs.cacheRead, 12);
    expect(hydrated.estimatedApiInputCost).toBeCloseTo(testCase.costs.input, 12);
    expect(hydrated.estimatedApiOutputCost).toBeCloseTo(testCase.costs.output, 12);
    expect(hydrated.estimatedApiReasoningOutputCost).toBeCloseTo(testCase.costs.reasoning, 12);
    expect(hydrated.estimatedApiTotalCost).toBeCloseTo(testCase.costs.total, 12);
  });

  it("AE-004 selects the 3.1 Pro tier at the 200K prompt boundary", async () => {
    for (const [promptTokens, tierId, inputPrice] of [[200_000, "prompt_le_200k", 2], [200_001, "prompt_gt_200k", 4]] as const) {
      const { runId } = await recordNativeGeminiCall({ modelId: "gemini-3.1-pro-preview", observedAt: "2026-10-09T12:00:00Z",
        promptTokens, cachedTokens: 0, candidatesTokens: 1_000, thoughtsTokens: 0 });
      const hydrated = await summary(runId);
      expect(hydrated.selectedPricingTierId, `${promptTokens} prompt tokens`).toBe(tierId);
      expect(hydrated.unitPrices.standardInput.pricePerMillion).toBe(inputPrice);
      expect(hydrated.estimatedApiStandardInputCost).toBeCloseTo((promptTokens / 1_000_000) * inputPrice, 12);
    }
  });
});
