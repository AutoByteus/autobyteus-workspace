import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { initializePrisma, rootPrismaClient, shutdownPrisma } from "repository_prisma";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { configureTokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";
import { SqlTokenUsageAnalyticsRepository } from "../../../src/token-usage/repositories/sql/token-usage-analytics-repository.js";
import {
  buildCurrentTokenUsagePayload,
  createCurrentTokenUsageTestHarness,
} from "../../helpers/token-usage-run-record-fixtures.js";

const PREFIX = "analytics-graphql-";
const HISTORICAL_GEMINI_MODEL = "gemini-3.7-flash";
const { store } = createCurrentTokenUsageTestHarness(rootPrismaClient);
const runIds = new Set<string>();

const remember = (runId: string): string => {
  runIds.add(runId);
  return runId;
};

const cleanup = async () => {
  await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { in: [...runIds] } } });
  runIds.clear();
  await rootPrismaClient.tokenUsageAnalyticsDailyFacet.deleteMany({
    where: {
      OR: [
        { modelIdentifier: { startsWith: PREFIX } },
        { modelIdentifier: HISTORICAL_GEMINI_MODEL },
      ],
    },
  });
  await rootPrismaClient.tokenUsageAnalyticsCoverage.deleteMany();
};

describe("token usage analytics GraphQL E2E", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeAll(async () => {
    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
    configureTokenUsageMigrationReadiness({ kind: "READY" });
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
    await cleanup();
  });

  afterEach(cleanup);
  afterAll(async () => {
    await cleanup();
    await shutdownPrisma();
  });

  const query = `
    query Analytics($input: TokenUsageAnalyticsInputGraphql!) {
      tokenUsageAnalytics(input: $input) {
        appliedRange { preset startTime endTimeExclusive granularity }
        comparisonRange { startTime endTimeExclusive }
        coverage { status coverageStart }
        comparisonCoverage { status coverageStart }
        appliedFilters { runtimeKind providerKey modelKey }
        selectedAggregate {
          grossInputTokens cacheReadInputTokens outputTokens reasoningOutputTokens totalTokens
          estimatedApiTotalCost currency apiCostStatus usageReportCount missingPriceDimensions
        }
        selectedCostQuality { kind currency missingPriceDimensions }
        comparisonAggregate { totalTokens estimatedApiTotalCost currency usageReportCount }
        activeDayCount
        trendBuckets {
          bucketStart bucketEndExclusive
          aggregate { totalTokens estimatedApiTotalCost usageReportCount }
          costQuality { kind currency missingPriceDimensions }
        }
        breakdownRows {
          rowKey identityKey providerKey modelKey runtimeKind modelProvider providerName
          providerDisplayName modelIdentifier modelValue modelDisplayName
          aggregate { totalTokens estimatedApiTotalCost currency apiCostStatus usageReportCount }
          costQuality { kind currency missingPriceDimensions }
        }
        filterOptions {
          runtimeKinds
          providers { key modelProvider providerName displayName }
          models { key modelIdentifier modelValue displayName }
        }
      }
    }
  `;

  const execute = async (input: Record<string, unknown>) => graphql({
    schema,
    source: query,
    variableValues: { input },
  });

  const write = async (input: Parameters<typeof buildCurrentTokenUsagePayload>[0]) => {
    const runId = remember(input.runId ?? `${PREFIX}${randomUUID()}`);
    return store.recordObservation(buildCurrentTokenUsagePayload({ ...input, runId }));
  };

  it("reconciles observation-time ranges, filters, buckets, exact rows, and mixed cost through GraphQL", async () => {
    await new SqlTokenUsageAnalyticsRepository(rootPrismaClient)
      .initializeCoverage(new Date("2026-07-01T00:00:00.000Z"));

    await write({
      runId: `${PREFIX}prior`,
      runCreatedAt: "2026-06-01T00:00:00.000Z",
      observedAt: "2026-07-10T12:00:00.000Z",
      inputTokens: 250,
      outputTokens: 50,
      modelProvider: "OPENAI",
      providerName: "API E2E OpenAI",
      modelIdentifier: `${PREFIX}usd-model`,
      totalCost: 0.3,
      inputCost: 0.25,
      outputCost: 0.05,
    });
    await write({
      runId: `${PREFIX}selected-usd`,
      runCreatedAt: "2026-07-15T00:00:00.000Z",
      observedAt: "2026-08-01T00:10:00.000Z",
      inputTokens: 1_000,
      cacheReadTokens: 800,
      outputTokens: 200,
      reasoningTokens: 100,
      modelProvider: "OPENAI",
      providerName: "API E2E OpenAI",
      modelIdentifier: `${PREFIX}usd-model`,
      totalCost: 1.2,
      inputCost: 1,
      outputCost: 0.2,
    });
    await write({
      runId: `${PREFIX}selected-local`,
      observedAt: "2026-08-15T08:00:00.000Z",
      inputTokens: 100,
      outputTokens: 20,
      runtimeKind: "ollama",
      modelProvider: "OLLAMA",
      providerName: "Local Ollama",
      modelIdentifier: `${PREFIX}local-model`,
      apiCostStatus: "local_no_api_bill",
      pricingStatus: "local_no_api_bill",
      totalCost: 0,
      inputCost: 0,
      outputCost: 0,
      currency: null,
    });
    await write({
      runId: `${PREFIX}selected-eur`,
      observedAt: "2026-08-20T17:00:00.000Z",
      inputTokens: 50,
      outputTokens: 10,
      runtimeKind: "claude_agent_sdk",
      modelProvider: "ANTHROPIC",
      providerName: "Anthropic",
      modelIdentifier: `${PREFIX}eur-model`,
      totalCost: 0.06,
      inputCost: 0.05,
      outputCost: 0.01,
      currency: "EUR",
    });
    await write({
      runId: `${PREFIX}september-only`,
      runCreatedAt: "2026-08-05T00:00:00.000Z",
      observedAt: "2026-09-01T00:00:00.000Z",
      inputTokens: 9_000,
      outputTokens: 1_000,
      modelIdentifier: `${PREFIX}september-model`,
      totalCost: 10,
      inputCost: 9,
      outputCost: 1,
    });

    const input = {
      rangePreset: "CUSTOM",
      startTime: "2026-08-01T00:00:00.000Z",
      endTimeExclusive: "2026-09-01T00:00:00.000Z",
      runtimeKind: null,
      providerKey: null,
      modelKey: null,
    };
    const response = await execute(input);
    expect(response.errors).toBeUndefined();
    const result = (response.data as any).tokenUsageAnalytics;

    expect(result.appliedRange).toEqual({
      preset: "CUSTOM",
      startTime: "2026-08-01T00:00:00.000Z",
      endTimeExclusive: "2026-09-01T00:00:00.000Z",
      granularity: "DAY",
    });
    expect(result.comparisonRange).toEqual({
      startTime: "2026-07-01T00:00:00.000Z",
      endTimeExclusive: "2026-08-01T00:00:00.000Z",
    });
    expect(result.coverage.status).toBe("FULL");
    expect(result.comparisonCoverage.status).toBe("FULL");
    expect(result.selectedAggregate).toMatchObject({
      grossInputTokens: 1_150,
      cacheReadInputTokens: 800,
      outputTokens: 230,
      reasoningOutputTokens: 100,
      totalTokens: 1_380,
      estimatedApiTotalCost: null,
      currency: null,
      apiCostStatus: "mixed",
      usageReportCount: 3,
    });
    expect(result.selectedCostQuality).toMatchObject({ kind: "MIXED_CURRENCY", currency: null });
    expect(result.comparisonAggregate).toMatchObject({ totalTokens: 300, estimatedApiTotalCost: 0.3, currency: "USD" });
    expect(result.activeDayCount).toBe(3);
    expect(result.trendBuckets).toHaveLength(31);
    expect(result.trendBuckets.reduce((sum: number, bucket: any) => sum + bucket.aggregate.totalTokens, 0)).toBe(1_380);
    expect(result.trendBuckets.find((bucket: any) => bucket.bucketStart === "2026-08-02T00:00:00.000Z"))
      .toMatchObject({ aggregate: { totalTokens: 0, estimatedApiTotalCost: null }, costQuality: { kind: "NO_USAGE", currency: null } });
    expect(result.breakdownRows.map((row: any) => row.aggregate.totalTokens)).toEqual([1_200, 120, 60]);
    expect(result.breakdownRows.reduce((sum: number, row: any) => sum + row.aggregate.totalTokens, 0)).toBe(1_380);
    expect(result.filterOptions.runtimeKinds).toEqual(["autobyteus", "claude_agent_sdk", "ollama"]);
    expect(result.filterOptions.providers).toHaveLength(3);
    expect(result.filterOptions.models).toHaveLength(3);

    const openAiKey = result.filterOptions.providers.find((option: any) => option.modelProvider === "OPENAI").key;
    const filteredResponse = await execute({ ...input, providerKey: openAiKey });
    expect(filteredResponse.errors).toBeUndefined();
    const filtered = (filteredResponse.data as any).tokenUsageAnalytics;
    expect(filtered.appliedFilters.providerKey).toBe(openAiKey);
    expect(filtered.selectedAggregate.totalTokens).toBe(1_200);
    expect(filtered.selectedCostQuality).toMatchObject({ kind: "COMPLETE", currency: "USD" });
    expect(filtered.breakdownRows).toHaveLength(1);
    expect(filtered.filterOptions.providers).toHaveLength(3);
  });

  it("returns priced and fully unpriced usage days as one partial-cost GraphQL result", async () => {
    await new SqlTokenUsageAnalyticsRepository(rootPrismaClient)
      .initializeCoverage(new Date("2026-08-01T00:00:00.000Z"));

    await write({
      runId: `${PREFIX}partial-priced`,
      observedAt: "2026-08-01T12:00:00.000Z",
      inputTokens: 100,
      outputTokens: 20,
      modelProvider: "ANTHROPIC",
      providerName: "Partial Cost Provider",
      modelIdentifier: `${PREFIX}partial-model`,
      totalCost: 0.12,
      inputCost: 0.1,
      outputCost: 0.02,
    });
    const missingRunId = remember(`${PREFIX}partial-unpriced`);
    await store.recordObservation({
      ...buildCurrentTokenUsagePayload({
        runId: missingRunId,
        observedAt: "2026-08-02T12:00:00.000Z",
        inputTokens: 200,
        outputTokens: 40,
        modelProvider: "ANTHROPIC",
        providerName: "Partial Cost Provider",
        modelIdentifier: `${PREFIX}partial-model`,
        apiCostStatus: "price_missing",
        pricingStatus: "missing",
        currency: null,
        totalCost: null,
        inputCost: null,
        outputCost: null,
      }),
      missing_price_dimensions: ["standard_input", "output"],
    });

    const response = await execute({
      rangePreset: "CUSTOM",
      startTime: "2026-08-01T00:00:00.000Z",
      endTimeExclusive: "2026-08-04T00:00:00.000Z",
      runtimeKind: null,
      providerKey: null,
      modelKey: null,
    });

    expect(response.errors).toBeUndefined();
    const result = (response.data as any).tokenUsageAnalytics;
    expect(result.selectedAggregate).toMatchObject({
      totalTokens: 360,
      estimatedApiTotalCost: 0.12,
      currency: "USD",
      apiCostStatus: "mixed",
      usageReportCount: 2,
      missingPriceDimensions: ["output", "standard_input"],
    });
    expect(result.selectedCostQuality).toEqual({
      kind: "PARTIAL",
      currency: "USD",
      missingPriceDimensions: ["output", "standard_input"],
    });
    expect(result.trendBuckets).toHaveLength(3);
    expect(result.trendBuckets[0]).toMatchObject({
      bucketStart: "2026-08-01T00:00:00.000Z",
      aggregate: { totalTokens: 120, estimatedApiTotalCost: 0.12, usageReportCount: 1 },
      costQuality: { kind: "COMPLETE", currency: "USD", missingPriceDimensions: [] },
    });
    expect(result.trendBuckets[1]).toMatchObject({
      bucketStart: "2026-08-02T00:00:00.000Z",
      aggregate: { totalTokens: 240, estimatedApiTotalCost: null, usageReportCount: 1 },
      costQuality: { kind: "MISSING", currency: null, missingPriceDimensions: ["output", "standard_input"] },
    });
    expect(result.trendBuckets[2]).toMatchObject({
      bucketStart: "2026-08-03T00:00:00.000Z",
      aggregate: { totalTokens: 0, estimatedApiTotalCost: null, usageReportCount: 0 },
      costQuality: { kind: "NO_USAGE", currency: null, missingPriceDimensions: [] },
    });
    expect(result.trendBuckets
      .reduce((sum: number, bucket: any) => sum + (bucket.aggregate.estimatedApiTotalCost ?? 0), 0))
      .toBe(result.selectedAggregate.estimatedApiTotalCost);
    expect(result.breakdownRows).toHaveLength(2);
    expect(result.breakdownRows.map((row: any) => row.costQuality.kind)).toEqual(["MISSING", "COMPLETE"]);
  });

  it("projects stored Gemini 3.7 identity and cost without current-catalog translation or repricing", async () => {
    await new SqlTokenUsageAnalyticsRepository(rootPrismaClient)
      .initializeCoverage(new Date("2026-09-01T00:00:00.000Z"));
    const runId = `${PREFIX}historical-gemini-3-7`;
    await write({
      runId,
      observedAt: "2026-09-02T12:00:00.000Z",
      inputTokens: 1_000,
      outputTokens: 100,
      modelProvider: "GEMINI",
      providerName: "Gemini",
      modelIdentifier: HISTORICAL_GEMINI_MODEL,
      modelValue: HISTORICAL_GEMINI_MODEL,
      inputPricePerMillion: 0.75,
      outputPricePerMillion: 3.75,
      inputCost: 0.00075,
      outputCost: 0.000375,
      totalCost: 0.001125,
    });

    const response = await execute({
      rangePreset: "CUSTOM",
      startTime: "2026-09-01T00:00:00.000Z",
      endTimeExclusive: "2026-09-04T00:00:00.000Z",
      runtimeKind: null,
      providerKey: null,
      modelKey: null,
    });

    expect(response.errors).toBeUndefined();
    const result = (response.data as any).tokenUsageAnalytics;
    expect(result.breakdownRows).toHaveLength(1);
    expect(result.breakdownRows[0]).toMatchObject({
      modelProvider: "GEMINI",
      providerName: "Gemini",
      modelIdentifier: HISTORICAL_GEMINI_MODEL,
      modelValue: HISTORICAL_GEMINI_MODEL,
      modelDisplayName: "Gemini:gemini-3.7-flash",
      aggregate: {
        totalTokens: 1_100,
        currency: "USD",
        apiCostStatus: "estimated",
        usageReportCount: 1,
      },
    });
    expect(result.breakdownRows[0].aggregate.estimatedApiTotalCost).toBeCloseTo(0.001125, 12);
    expect(result.filterOptions.models).toContainEqual(expect.objectContaining({
      modelIdentifier: HISTORICAL_GEMINI_MODEL,
      modelValue: HISTORICAL_GEMINI_MODEL,
      displayName: "Gemini:gemini-3.7-flash",
    }));
    expect(await rootPrismaClient.tokenUsageRunRecord.findUnique({ where: { runId } }))
      .toMatchObject({
        latestModelProvider: "GEMINI",
        latestProviderName: "Gemini",
        latestModelIdentifier: HISTORICAL_GEMINI_MODEL,
        latestModelValue: HISTORICAL_GEMINI_MODEL,
        estimatedApiTotalCost: 0.001125,
      });
  });

  it("keeps pre-feature run rows directly usable without analytics backfill and persists honest coverage", async () => {
    const runId = `${PREFIX}pre-feature-run`;
    await write({
      runId,
      runCreatedAt: "2026-07-10T00:00:00.000Z",
      observedAt: "2026-07-10T12:00:00.000Z",
      inputTokens: 100,
      outputTokens: 20,
      modelIdentifier: `${PREFIX}pre-feature-model`,
      totalCost: 0.12,
      inputCost: 0.1,
      outputCost: 0.02,
    });
    await rootPrismaClient.tokenUsageAnalyticsDailyFacet.deleteMany({
      where: { modelIdentifier: `${PREFIX}pre-feature-model` },
    });
    const coverage = new SqlTokenUsageAnalyticsRepository(rootPrismaClient);
    const firstStart = await coverage.initializeCoverage(new Date("2026-08-10T12:00:00.000Z"));
    const retainedStart = await coverage.initializeCoverage(new Date("2026-08-20T12:00:00.000Z"));

    const july = await execute({
      rangePreset: "CUSTOM",
      startTime: "2026-07-01T00:00:00.000Z",
      endTimeExclusive: "2026-08-01T00:00:00.000Z",
      runtimeKind: null,
      providerKey: null,
      modelKey: null,
    });
    const partialAugust = await execute({
      rangePreset: "CUSTOM",
      startTime: "2026-08-01T00:00:00.000Z",
      endTimeExclusive: "2026-09-01T00:00:00.000Z",
      runtimeKind: null,
      providerKey: null,
      modelKey: null,
    });

    expect(firstStart.toISOString()).toBe("2026-08-10T12:00:00.000Z");
    expect(retainedStart).toEqual(firstStart);
    expect(july.errors).toBeUndefined();
    expect(partialAugust.errors).toBeUndefined();
    expect((july.data as any).tokenUsageAnalytics).toMatchObject({
      coverage: { status: "UNAVAILABLE", coverageStart: "2026-08-10T12:00:00.000Z" },
      selectedAggregate: { totalTokens: 0, estimatedApiTotalCost: null, usageReportCount: 0 },
      breakdownRows: [],
    });
    expect((partialAugust.data as any).tokenUsageAnalytics.coverage.status).toBe("PARTIAL");
    expect(await rootPrismaClient.tokenUsageRunRecord.findUnique({ where: { runId } })).toMatchObject({
      accountingInputTokens: 100n,
      accountingOutputTokens: 20n,
      accountingTotalTokens: 120n,
      usageReportCount: 1n,
    });
    expect(await rootPrismaClient.tokenUsageAnalyticsDailyFacet.count({
      where: { modelIdentifier: `${PREFIX}pre-feature-model` },
    })).toBe(0);
  });

  it("rejects an aggregate beyond GraphQL SafeInt without rounding persisted BigInt values", async () => {
    await new SqlTokenUsageAnalyticsRepository(rootPrismaClient)
      .initializeCoverage(new Date("2026-08-01T00:00:00.000Z"));
    await write({
      runId: `${PREFIX}safe-max`,
      observedAt: "2026-08-20T10:00:00.000Z",
      inputTokens: Number.MAX_SAFE_INTEGER,
      outputTokens: 0,
      modelIdentifier: `${PREFIX}safe-model`,
      totalCost: null,
      apiCostStatus: "price_missing",
    });
    await write({
      runId: `${PREFIX}safe-overflow`,
      observedAt: "2026-08-20T11:00:00.000Z",
      inputTokens: 1,
      outputTokens: 0,
      modelIdentifier: `${PREFIX}safe-model`,
      totalCost: null,
      apiCostStatus: "price_missing",
    });

    const response = await execute({
      rangePreset: "CUSTOM",
      startTime: "2026-08-20T00:00:00.000Z",
      endTimeExclusive: "2026-08-21T00:00:00.000Z",
      runtimeKind: null,
      providerKey: null,
      modelKey: null,
    });
    const facet = await rootPrismaClient.tokenUsageAnalyticsDailyFacet.findFirstOrThrow({
      where: { modelIdentifier: `${PREFIX}safe-model` },
    });

    expect(response.data).toBeNull();
    expect(response.errors?.[0]?.message).toContain("TOKEN_USAGE_SAFE_INTEGER_EXCEEDED:accounting_input_tokens");
    expect(facet.accountingInputTokens).toBe(BigInt(Number.MAX_SAFE_INTEGER) + 1n);
    expect(facet.accountingTotalTokens).toBe(BigInt(Number.MAX_SAFE_INTEGER) + 1n);
    expect(facet.usageReportCount).toBe(2n);
  });
});
