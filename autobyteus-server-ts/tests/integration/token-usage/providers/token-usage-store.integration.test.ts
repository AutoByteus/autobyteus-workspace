import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { initializePrisma, rootPrismaClient, shutdownPrisma } from "repository_prisma";
import { configureTokenUsageMigrationReadiness } from "../../../../src/token-usage/providers/token-usage-migration-readiness.js";
import {
  buildCurrentTokenUsagePayload,
  createCurrentTokenUsageTestHarness,
} from "../../../helpers/token-usage-run-record-fixtures.js";

const runIds = new Set<string>();
const remember = (runId: string): string => {
  runIds.add(runId);
  return runId;
};

beforeAll(async () => {
  await shutdownPrisma();
  await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
  configureTokenUsageMigrationReadiness({ kind: "READY" });
});

afterEach(async () => {
  const ids = [...runIds];
  runIds.clear();
  if (ids.length > 0) await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { in: ids } } });
});

afterAll(async () => {
  await shutdownPrisma();
});

describe("TokenUsageRunStore", () => {
  it("summarizes exact current components, costs, context, and report count without an event list", async () => {
    const runId = remember("current-store-components");
    const { store } = createCurrentTokenUsageTestHarness(rootPrismaClient);
    await store.recordObservation(buildCurrentTokenUsagePayload({
      runId,
      inputTokens: 115_908,
      standardInputTokens: 13_444,
      cacheReadTokens: 102_464,
      outputTokens: 5_979,
      inputCost: 0.31248,
      outputCost: 0.167412,
      totalCost: 0.479892,
      inputPricePerMillion: 8,
      outputPricePerMillion: 28,
      currency: "CNY",
      pricingPolicyKey: "catalog:glm:glm-5.2:bigmodel-cn",
      latestPromptTokens: 13_206,
      effectiveContextWindowTokens: 1_000_000,
      contextWindowUsagePercent: 1.3206,
    }));

    const summary = await store.getAgentRunSummary(runId);
    expect(summary).toMatchObject({
      run_id: runId,
      gross_input_tokens: 115_908,
      standard_input_tokens: 13_444,
      cache_read_input_tokens: 102_464,
      output_tokens: 5_979,
      total_tokens: 121_887,
      cache_state: "positive",
      estimated_api_input_cost: 0.31248,
      estimated_api_output_cost: 0.167412,
      estimated_api_total_cost: 0.479892,
      currency: "CNY",
      api_cost_status: "estimated",
      latest_prompt_tokens: 13_206,
      effective_context_window_tokens: 1_000_000,
      context_window_usage_percent: 1.3206,
      usage_report_count: 1,
    });
    expect(summary.cache_read_input_token_rate).toBeCloseTo(102_464 / 115_908, 8);
    expect(await rootPrismaClient.tokenUsageRunRecord.count({ where: { runId } })).toBe(1);
  });

  it("keeps exact token totals but reports mixed currency and unit-price semantics truthfully", async () => {
    const runId = remember("current-store-mixed-pricing");
    const { store } = createCurrentTokenUsageTestHarness(rootPrismaClient);
    await store.recordObservation(buildCurrentTokenUsagePayload({
      runId,
      eventId: "usd-price",
      inputTokens: 10,
      outputTokens: 5,
      inputCost: 0.0005,
      outputCost: 0.0005,
      reasoningTokens: 2,
      reasoningCost: 0.0004,
      totalCost: 0.001,
      currency: "USD",
      inputPricePerMillion: 5,
      outputPricePerMillion: 30,
    }));
    await store.recordObservation(buildCurrentTokenUsagePayload({
      runId,
      eventId: "cny-price",
      inputTokens: 3,
      outputTokens: 7,
      inputCost: 0.01,
      outputCost: 0.01,
      reasoningTokens: 4,
      reasoningCost: 0.01,
      totalCost: 0.02,
      currency: "CNY",
      inputPricePerMillion: 6,
      outputPricePerMillion: 30,
    }));

    const summary = await store.getAgentRunSummary(runId);
    expect(summary.gross_input_tokens).toBe(13);
    expect(summary.output_tokens).toBe(12);
    expect(summary.reasoning_output_tokens).toBe(6);
    expect.soft(summary.currency).toBeNull();
    expect.soft(summary.api_cost_status).toBe("mixed");
    expect.soft(summary.estimated_api_input_cost).toBeNull();
    expect.soft(summary.estimated_api_total_cost).toBeNull();
    expect.soft(summary.unit_prices.standard_input).toEqual({ status: "mixed", price_per_million: null });
    expect.soft(summary.unit_prices.output).toEqual({ status: "mixed", price_per_million: null });
  });

  it("stores standalone, direct, nested, and delegated runs once and sums only concrete team rows", async () => {
    const rootTeamRunId = "root-team-current-store";
    const standaloneRunId = remember("standalone-current-store");
    const teamRunIds = [
      remember("direct-member-a"),
      remember("direct-member-b"),
      remember("nested-member"),
      remember("delegated-agent"),
    ];
    const { store } = createCurrentTokenUsageTestHarness(rootPrismaClient);
    await store.recordObservation(buildCurrentTokenUsagePayload({
      runId: standaloneRunId,
      inputTokens: 2,
      outputTokens: 1,
      agentName: "Standalone",
    }));
    for (const [index, runId] of teamRunIds.entries()) {
      await store.recordObservation(buildCurrentTokenUsagePayload({
        runId,
        rootTeamRunId,
        taskId: index === 3 ? "delegated-task" : null,
        inputTokens: index + 1,
        outputTokens: 1,
        agentName: ["Direct A", "Direct B", "Nested", "Delegated"][index],
      }));
    }

    const root = await store.getTeamRunSummary(rootTeamRunId);
    expect(root.run_id).toBe(rootTeamRunId);
    expect(root.gross_input_tokens).toBe(1 + 2 + 3 + 4);
    expect(root.output_tokens).toBe(4);
    expect(root.usage_report_count).toBe(4);
    expect(await rootPrismaClient.tokenUsageRunRecord.count({
      where: { OR: [{ runId: standaloneRunId }, { rootTeamRunId }] },
    })).toBe(5);
    expect(await rootPrismaClient.tokenUsageRunRecord.count({ where: { runId: rootTeamRunId } })).toBe(0);

    const member = await store.getTeamMemberSummary({ rootTeamRunId, agentRunId: teamRunIds[2]! });
    expect(member.gross_input_tokens).toBe(3);
    const mismatched = await store.getTeamMemberSummary({ rootTeamRunId: "other-root", agentRunId: teamRunIds[2]! });
    expect(mismatched.gross_input_tokens).toBe(0);
    const standalone = await store.getAgentRunSummary(standaloneRunId);
    expect(standalone.gross_input_tokens).toBe(2);
  });
});
