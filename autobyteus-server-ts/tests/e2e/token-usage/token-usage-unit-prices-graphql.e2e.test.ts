import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { initializePrisma, rootPrismaClient, shutdownPrisma } from "repository_prisma";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { createTokenUsageUpdatedPayload } from "../../../src/agent-execution/domain/agent-run-token-usage.js";
import { createCurrentTokenUsageTestHarness } from "../../helpers/token-usage-run-record-fixtures.js";
import { configureTokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";
import type { TokenUsageUpdatedPayload } from "../../../src/agent-execution/domain/agent-run-token-usage.js";
import { TokenCostCalculator } from "../../../src/token-usage/pricing/token-cost-calculator.js";

const { store } = createCurrentTokenUsageTestHarness(rootPrismaClient);
const createdRunIds = new Set<string>();

type UnitPriceSummary = {
  status: string;
  pricePerMillion: number | null;
};

type UnitPrices = {
  standardInput: UnitPriceSummary;
  cacheReadInput: UnitPriceSummary;
  cacheCreationInput: UnitPriceSummary;
  cacheCreation5mInput: UnitPriceSummary;
  cacheCreation1hInput: UnitPriceSummary;
  output: UnitPriceSummary;
  reasoningOutput: UnitPriceSummary;
};

type SummaryResult = {
  runId: string;
  rootTeamRunId: string | null;
  standardInputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  cacheCreation5mInputTokens: number;
  cacheCreation1hInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  apiCostStatus: string;
  currency: string | null;
  pricingPolicyKey: string | null;
  unitPrices: UnitPrices;
};

type AggregateResult = {
  standardInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  apiCostStatus: string;
  unitPrices: UnitPrices;
};

const unitPrice = (status: string, pricePerMillion: number | null): UnitPriceSummary => ({
  status,
  pricePerMillion,
});

const costFor = (tokens: number, pricePerMillion: number | null): number | null => (
  typeof pricePerMillion === "number" ? (tokens / 1_000_000) * pricePerMillion : null
);

const sumNullable = (...values: Array<number | null>): number | null => {
  if (values.every((value) => value === null)) return null;
  return values.reduce((sum, value) => sum + (value ?? 0), 0);
};

const buildEvent = (input: {
  runId: string;
  observedAt: string;
  rootTeamRunId?: string | null;
  grossInputTokens: number;
  standardInputTokens?: number | null;
  cacheReadTokens?: number | null;
  cacheCreationTokens?: number | null;
  cacheCreation5mTokens?: number | null;
  cacheCreation1hTokens?: number | null;
  outputTokens: number;
  billableOutputTokens?: number | null;
  reasoningTokens?: number | null;
  status?: TokenUsageUpdatedPayload["api_cost_status"];
  pricingStatus?: TokenUsageUpdatedPayload["pricing_status"];
  inputPricePerMillion?: number | null;
  cachedInputReadPricePerMillion?: number | null;
  cachedInputWritePricePerMillion?: number | null;
  cachedInputWrite5mPricePerMillion?: number | null;
  cachedInputWrite1hPricePerMillion?: number | null;
  outputPricePerMillion?: number | null;
  currency?: string | null;
  model?: string | null;
  runtimeKind?: string | null;
  modelProvider?: string | null;
  pricingPolicyKey?: string | null;
  missingPriceDimensions?: string[];
  teamName?: string | null;
  memberName?: string | null;
}) => {
  createdRunIds.add(input.runId);
  const status = input.status ?? "estimated";
  const trusted = status === "estimated" || status === "partial_price_missing";
  const local = status === "local_no_api_bill";
  const cacheCreation5mTokens = input.cacheCreation5mTokens ?? 0;
  const cacheCreation1hTokens = input.cacheCreation1hTokens ?? 0;
  const cacheCreationTokens = input.cacheCreationTokens ?? (cacheCreation5mTokens + cacheCreation1hTokens);
  const cacheReadTokens = input.cacheReadTokens ?? 0;
  const standardInputTokens = input.standardInputTokens ?? Math.max(input.grossInputTokens - cacheReadTokens - cacheCreationTokens, 0);
  const genericCacheCreationTokens = Math.max(cacheCreationTokens - cacheCreation5mTokens - cacheCreation1hTokens, 0);
  const billableOutputTokens = input.billableOutputTokens ?? input.outputTokens;
  const inputPrice = input.inputPricePerMillion === undefined ? (trusted ? 5 : null) : input.inputPricePerMillion;
  const cacheReadPrice = input.cachedInputReadPricePerMillion === undefined ? (cacheReadTokens > 0 && trusted ? 0.5 : null) : input.cachedInputReadPricePerMillion;
  const cacheWritePrice = input.cachedInputWritePricePerMillion === undefined ? (genericCacheCreationTokens > 0 && trusted ? 6 : null) : input.cachedInputWritePricePerMillion;
  const cacheWrite5mPrice = input.cachedInputWrite5mPricePerMillion === undefined ? (cacheCreation5mTokens > 0 && trusted ? 3 : null) : input.cachedInputWrite5mPricePerMillion;
  const cacheWrite1hPrice = input.cachedInputWrite1hPricePerMillion === undefined ? (cacheCreation1hTokens > 0 && trusted ? 4 : null) : input.cachedInputWrite1hPricePerMillion;
  const outputPrice = input.outputPricePerMillion === undefined ? (trusted ? 30 : null) : input.outputPricePerMillion;
  const standardCost = costFor(standardInputTokens, inputPrice);
  const cacheReadCost = costFor(cacheReadTokens, cacheReadPrice);
  const cacheWriteCost = costFor(genericCacheCreationTokens, cacheWritePrice);
  const cacheWrite5mCost = costFor(cacheCreation5mTokens, cacheWrite5mPrice);
  const cacheWrite1hCost = costFor(cacheCreation1hTokens, cacheWrite1hPrice);
  const outputCost = costFor(billableOutputTokens, outputPrice);
  const reasoningCost = costFor(input.reasoningTokens ?? 0, outputPrice);
  const inputCost = sumNullable(standardCost, cacheReadCost, cacheWriteCost, cacheWrite5mCost, cacheWrite1hCost);
  const totalCost = local || status === "price_missing" ? null : sumNullable(inputCost, outputCost);

  return createTokenUsageUpdatedPayload({
    runId: input.runId,
    payload: {
      usage_event_id: `unit-price-graphql-${randomUUID()}`,
      idempotency_key: `unit-price-graphql:${randomUUID()}`,
      observed_at: input.observedAt,
      root_team_run_id: input.rootTeamRunId ?? null,
      runtime_kind: input.runtimeKind ?? "codex_app_server",
      ingestion_kind: "codex_thread_token_usage",
      usage_scope: "per_turn",
      model_provider: input.modelProvider ?? "OPENAI",
      model_identifier: input.model ?? "gpt-unit-price-test",
      input_token_semantic: "gross_includes_cache",
      reported_input_tokens: input.grossInputTokens,
      reported_output_tokens: input.outputTokens,
      reported_total_tokens: input.grossInputTokens + input.outputTokens,
      accounting_input_tokens: input.grossInputTokens,
      accounting_output_tokens: input.outputTokens,
      accounting_total_tokens: input.grossInputTokens + input.outputTokens,
      standard_input_tokens: standardInputTokens,
      cache_miss_input_tokens: standardInputTokens,
      cache_read_input_tokens: cacheReadTokens,
      cache_creation_input_tokens: cacheCreationTokens,
      cache_creation_5m_input_tokens: cacheCreation5mTokens,
      cache_creation_1h_input_tokens: cacheCreation1hTokens,
      cache_state: cacheReadTokens > 0 || cacheCreationTokens > 0 ? "positive" : "not_reported",
      reasoning_output_tokens: input.reasoningTokens ?? 0,
      billable_output_tokens: billableOutputTokens,
      pricing_status: input.pricingStatus ?? (local ? "local_no_api_bill" : trusted ? "trusted" : "missing"),
      api_cost_status: status,
      currency: input.currency === undefined ? (local || status === "price_missing" ? null : "USD") : input.currency,
      input_price_per_million: inputPrice,
      output_price_per_million: outputPrice,
      cached_input_read_price_per_million: cacheReadPrice,
      cached_input_write_price_per_million: cacheWritePrice,
      cached_input_write_5m_price_per_million: cacheWrite5mPrice,
      cached_input_write_1h_price_per_million: cacheWrite1hPrice,
      estimated_api_input_cost: inputCost,
      estimated_api_standard_input_cost: standardCost,
      estimated_api_cache_read_input_cost: cacheReadCost,
      estimated_api_cache_creation_input_cost: cacheWriteCost,
      estimated_api_cache_creation_5m_input_cost: cacheWrite5mCost,
      estimated_api_cache_creation_1h_input_cost: cacheWrite1hCost,
      estimated_api_output_cost: outputCost,
      estimated_api_reasoning_output_cost: reasoningCost,
      estimated_api_total_cost: totalCost,
      missing_price_dimensions: input.missingPriceDimensions ?? [],
      pricing_policy_key: input.pricingPolicyKey === undefined ? (input.model ? `catalog:openai:${input.model}` : null) : input.pricingPolicyKey,
      selected_pricing_tier_id: null,
      team_name: input.teamName ?? null,
      member_display_name: input.memberName ?? null,
    },
  });
};

describe("token usage unit-price GraphQL hydration", () => {
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
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    const runIds = Array.from(createdRunIds);
    if (runIds.length > 0) {
      await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { in: runIds } } });
    }
    createdRunIds.clear();
    await shutdownPrisma();
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  it("exposes display-safe unit prices on hydrated run, team, member, and aggregate statistics summaries", async () => {
    const suffix = randomUUID();
    const singleRunId = `unit-price-single-${suffix}`;
    const teamRunId = `unit-price-team-${suffix}`;
    const memberOneRunId = `unit-price-member-one-${suffix}`;
    const memberTwoRunId = `unit-price-member-two-${suffix}`;
    const partialRunId = `unit-price-partial-${suffix}`;
    const localRunId = `unit-price-local-${suffix}`;
    const start = "2042-07-02T09:00:00.000Z";
    const end = "2042-07-02T10:00:00.000Z";
    const singleModel = `gpt-unit-single-${suffix}`;
    const teamModel = `gpt-unit-team-${suffix}`;
    const partialModel = `gpt-unit-partial-${suffix}`;
    const localModel = `local-unit-${suffix}`;

    await store.recordObservation(buildEvent({
      runId: singleRunId,
      observedAt: "2042-07-02T09:01:00.000Z",
      grossInputTokens: 120,
      standardInputTokens: 65,
      cacheReadTokens: 20,
      cacheCreationTokens: 35,
      cacheCreation5mTokens: 10,
      cacheCreation1hTokens: 15,
      outputTokens: 30,
      reasoningTokens: 7,
      model: singleModel,
      pricingPolicyKey: `catalog:openai:${singleModel}:primary`,
    }));
    await store.recordObservation(buildEvent({
      runId: singleRunId,
      observedAt: "2042-07-02T09:02:00.000Z",
      grossInputTokens: 0,
      standardInputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      outputTokens: 0,
      billableOutputTokens: 0,
      inputPricePerMillion: 999,
      outputPricePerMillion: 999,
      cachedInputReadPricePerMillion: 999,
      cachedInputWritePricePerMillion: 999,
      model: singleModel,
      pricingPolicyKey: `catalog:openai:${singleModel}:zero-token-churn`,
    }));

    await store.recordObservation(buildEvent({
      runId: memberOneRunId,
      rootTeamRunId: teamRunId,
      observedAt: "2042-07-02T09:10:00.000Z",
      grossInputTokens: 100,
      standardInputTokens: 100,
      outputTokens: 20,
      reasoningTokens: 3,
      model: teamModel,
      inputPricePerMillion: 5,
      outputPricePerMillion: 30,
      teamName: "Unit Price Team",
      memberName: "Designer",
    }));
    await store.recordObservation(buildEvent({
      runId: memberTwoRunId,
      rootTeamRunId: teamRunId,
      observedAt: "2042-07-02T09:11:00.000Z",
      grossInputTokens: 80,
      standardInputTokens: 80,
      outputTokens: 15,
      reasoningTokens: 2,
      model: teamModel,
      inputPricePerMillion: 6,
      outputPricePerMillion: 30,
      teamName: "Unit Price Team",
      memberName: "Builder",
    }));

    await store.recordObservation(buildEvent({
      runId: partialRunId,
      observedAt: "2042-07-02T09:20:00.000Z",
      grossInputTokens: 50,
      standardInputTokens: 50,
      outputTokens: 0,
      status: "partial_price_missing",
      model: partialModel,
      inputPricePerMillion: 5,
      outputPricePerMillion: null,
      missingPriceDimensions: ["standard_input_price"],
    }));
    await store.recordObservation(buildEvent({
      runId: partialRunId,
      observedAt: "2042-07-02T09:21:00.000Z",
      grossInputTokens: 25,
      standardInputTokens: 25,
      outputTokens: 0,
      status: "partial_price_missing",
      model: partialModel,
      inputPricePerMillion: null,
      outputPricePerMillion: null,
      missingPriceDimensions: ["standard_input_price"],
    }));

    await store.recordObservation(buildEvent({
      runId: localRunId,
      observedAt: "2042-07-02T09:30:00.000Z",
      grossInputTokens: 40,
      standardInputTokens: 40,
      outputTokens: 10,
      status: "local_no_api_bill",
      model: localModel,
      runtimeKind: "autobyteus",
      modelProvider: "LOCAL",
      inputPricePerMillion: null,
      outputPricePerMillion: null,
      currency: null,
      pricingPolicyKey: null,
    }));

    const query = `
      fragment UnitPriceFields on TokenUsageUnitPricesGraphql {
        standardInput { status pricePerMillion }
        cacheReadInput { status pricePerMillion }
        cacheCreationInput { status pricePerMillion }
        cacheCreation5mInput { status pricePerMillion }
        cacheCreation1hInput { status pricePerMillion }
        output { status pricePerMillion }
        reasoningOutput { status pricePerMillion }
      }

      fragment SummaryFields on TokenUsageRunSummaryGraphql {
        runId
        rootTeamRunId
        standardInputTokens
        cacheReadInputTokens
        cacheCreationInputTokens
        cacheCreation5mInputTokens
        cacheCreation1hInputTokens
        outputTokens
        reasoningOutputTokens
        apiCostStatus
        currency
        pricingPolicyKey
        unitPrices { ...UnitPriceFields }
      }

      fragment AggregateFields on TokenUsageCostSummaryAggregateGraphql {
        standardInputTokens
        outputTokens
        reasoningOutputTokens
        apiCostStatus
        unitPrices { ...UnitPriceFields }
      }

      query UnitPriceHydration($singleRunId: String!, $teamRunId: String!, $memberRunId: String!, $partialRunId: String!, $localRunId: String!, $start: DateTime!, $end: DateTime!) {
        single: getAgentRunTokenUsageSummary(runId: $singleRunId) { ...SummaryFields }
        team: getTeamRunTokenUsageSummary(teamRunId: $teamRunId) { ...SummaryFields }
        member: getTeamMemberTokenUsageSummary(teamRunId: $teamRunId, agentRunId: $memberRunId) { ...SummaryFields }
        partial: getAgentRunTokenUsageSummary(runId: $partialRunId) { ...SummaryFields }
        local: getAgentRunTokenUsageSummary(runId: $localRunId) { ...SummaryFields }
        taskStats: tokenUsageTaskStatisticsInPeriod(startTime: $start, endTime: $end) {
          rows {
            rowId
            aggregate { ...AggregateFields }
            children {
              rowKind
              runId
              displayName
              aggregate { ...AggregateFields }
            }
          }
        }
        runtimeStats: usageStatisticsInPeriod(startTime: $start, endTime: $end) {
          runtimeKind
          llmModel
          aggregate { ...AggregateFields }
        }
      }
    `;

    const result = await execGraphql<{
      single: SummaryResult;
      team: SummaryResult;
      member: SummaryResult;
      partial: SummaryResult;
      local: SummaryResult;
      taskStats: {
        rows: Array<{
          rowId: string;
          aggregate: AggregateResult;
          children: Array<{
            rowKind: string;
            runId: string | null;
            displayName: string;
            aggregate: AggregateResult;
          }>;
        }>;
      };
      runtimeStats: Array<{ runtimeKind: string; llmModel: string; aggregate: AggregateResult }>;
    }>(query, {
      singleRunId,
      teamRunId,
      memberRunId: memberTwoRunId,
      partialRunId,
      localRunId,
      start: new Date(start),
      end: new Date(end),
    });

    expect(result.single.unitPrices).toMatchObject({
      standardInput: unitPrice("single", 5),
      cacheReadInput: unitPrice("single", 0.5),
      cacheCreationInput: unitPrice("single", 6),
      cacheCreation5mInput: unitPrice("single", 3),
      cacheCreation1hInput: unitPrice("single", 4),
      output: unitPrice("single", 30),
      reasoningOutput: unitPrice("single", 30),
    });
    expect(result.single.pricingPolicyKey).toBeNull();

    expect(result.team.unitPrices.standardInput).toEqual(unitPrice("mixed", null));
    expect(result.team.unitPrices.output).toEqual(unitPrice("single", 30));
    expect(result.team.unitPrices.reasoningOutput).toEqual(unitPrice("single", 30));
    expect(result.member).toMatchObject({
      runId: memberTwoRunId,
      rootTeamRunId: teamRunId,
    });
    expect(result.member.unitPrices.standardInput).toEqual(unitPrice("single", 6));
    expect(result.member.unitPrices.output).toEqual(unitPrice("single", 30));

    expect(result.partial.apiCostStatus).toBe("partial_price_missing");
    expect(result.partial.unitPrices.standardInput).toEqual(unitPrice("partial_missing", 5));
    expect(result.partial.unitPrices.output).toEqual(unitPrice("not_applicable", null));

    expect(result.local).toMatchObject({
      apiCostStatus: "local_no_api_bill",
      currency: null,
    });
    expect(result.local.unitPrices.standardInput).toEqual(unitPrice("local_no_api_bill", null));
    expect(result.local.unitPrices.output).toEqual(unitPrice("local_no_api_bill", null));

    const teamTaskRow = result.taskStats.rows.find((row) => row.rowId === `team:${teamRunId}`);
    expect(teamTaskRow?.aggregate.unitPrices.standardInput).toEqual(unitPrice("mixed", null));
    expect(teamTaskRow?.aggregate.unitPrices.output).toEqual(unitPrice("single", 30));
    const builderMember = teamTaskRow?.children.find((member) => member.runId === memberTwoRunId);
    expect(builderMember).toMatchObject({
      rowKind: "MEMBER_RUN",
      runId: memberTwoRunId,
      displayName: "Builder",
    });
    expect(builderMember?.aggregate.unitPrices.standardInput).toEqual(unitPrice("single", 6));
    expect(builderMember?.aggregate.unitPrices.output).toEqual(unitPrice("single", 30));

    const singleRuntimeStats = result.runtimeStats.find((row) => row.llmModel === singleModel);
    expect(singleRuntimeStats?.aggregate.unitPrices.standardInput).toEqual(unitPrice("single", 5));
    expect(singleRuntimeStats?.aggregate.unitPrices.cacheCreationInput).toEqual(unitPrice("single", 6));
    expect(singleRuntimeStats?.aggregate.unitPrices.reasoningOutput).toEqual(unitPrice("single", 30));

    const teamRuntimeStats = result.runtimeStats.find((row) => row.llmModel === teamModel);
    expect(teamRuntimeStats?.aggregate.unitPrices.standardInput).toEqual(unitPrice("mixed", null));
    expect(teamRuntimeStats?.aggregate.unitPrices.output).toEqual(unitPrice("single", 30));

    const partialRuntimeStats = result.runtimeStats.find((row) => row.llmModel === partialModel);
    expect(partialRuntimeStats?.aggregate.unitPrices.standardInput).toEqual(unitPrice("partial_missing", 5));

    const localRuntimeStats = result.runtimeStats.find((row) => row.llmModel === localModel);
    expect(localRuntimeStats?.aggregate.unitPrices.standardInput).toEqual(unitPrice("local_no_api_bill", null));
    expect(localRuntimeStats?.aggregate.unitPrices.output).toEqual(unitPrice("local_no_api_bill", null));
  });

  it("persists a DeepSeek policy selected from observed_at through the real pricing boundary", async () => {
    const runId = `deepseek-observed-at-${randomUUID()}`;
    createdRunIds.add(runId);
    const enriched = await new TokenCostCalculator().enrichCost(createTokenUsageUpdatedPayload({
      runId,
      payload: {
        usage_event_id: `deepseek-observed-at-${randomUUID()}`,
        idempotency_key: `deepseek-observed-at:${randomUUID()}`,
        observed_at: "2026-08-29T02:00:00Z",
        runtime_kind: "autobyteus",
        ingestion_kind: "codex_thread_token_usage",
        usage_scope: "per_turn",
        model_provider: "DEEPSEEK",
        model_identifier: "deepseek-v4-pro",
        input_token_semantic: "gross_includes_cache",
        reported_input_tokens: 0,
        reported_output_tokens: 1_000_000,
        reported_total_tokens: 1_000_000,
        accounting_input_tokens: 0,
        accounting_output_tokens: 1_000_000,
        accounting_total_tokens: 1_000_000,
        standard_input_tokens: 0,
        cache_miss_input_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_creation_5m_input_tokens: 0,
        cache_creation_1h_input_tokens: 0,
        cache_state: "not_reported",
        reasoning_output_tokens: 0,
        billable_output_tokens: 1_000_000,
        quality_flags: [],
      },
    }));
    await store.recordObservation(enriched);
    const persisted = await rootPrismaClient.tokenUsageRunRecord.findUnique({ where: { runId } });
    expect(persisted).not.toBeNull();
    if (!persisted) throw new Error("Expected DeepSeek token usage record to be persisted.");
    expect(JSON.parse(persisted.pricingSummaryJson)).toMatchObject({
      pricingPolicyKeys: {
        status: "single",
        value: "autobyteus_model_catalog:DEEPSEEK:deepseek-v4-pro:deepseek-v4-2026-08-23:off_peak",
      },
      unitPrices: { output: { status: "single", price_per_million: 1.98 } },
    });
    expect(persisted.estimatedApiOutputCost).toBe(1.98);
    expect(enriched.pricing_snapshot_json).toMatchObject({
      pricing_schedule_id: "deepseek-v4-2026-08-23",
      pricing_schedule_period_id: "off_peak",
      pricing_schedule_effective_from: "2026-08-22T16:00:00Z",
      pricing_schedule_window_timezone: "UTC",
      pricing_schedule_peak_days: [1, 2, 3, 4, 5],
      pricing_schedule_peak_days_timezone: "Asia/Shanghai",
    });
  });
});
