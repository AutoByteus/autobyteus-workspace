import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import { TokenUsageStats } from "../../../../src/token-usage/domain/models.js";
import { TokenUsageStatisticsProvider } from "../../../../src/token-usage/providers/statistics-provider.js";
import type { TokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";

const mockStore = {
  listEventsInPeriod: vi.fn(),
};

const buildEvent = (input: {
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  inputCost: number | null;
  outputCost: number | null;
  totalCost: number | null;
  reasoningTokens?: number | null;
  reasoningCost?: number | null;
  status: TokenUsageUpdatedPayload["api_cost_status"];
  currency?: string | null;
}): TokenUsageUpdatedPayload => ({
  ...createTokenUsageUpdatedPayload({
    runId: `stats_${input.model ?? "unknown"}`,
    payload: {
      idempotency_key: `stats:${input.model ?? "unknown"}:${Math.random()}`,
      model_identifier: input.model,
      reported_input_tokens: input.inputTokens,
      reported_output_tokens: input.outputTokens,
      reported_total_tokens: (input.inputTokens ?? 0) + (input.outputTokens ?? 0),
      accounting_input_tokens: input.inputTokens,
      accounting_output_tokens: input.outputTokens,
      accounting_total_tokens: (input.inputTokens ?? 0) + (input.outputTokens ?? 0),
      reasoning_output_tokens: input.reasoningTokens ?? null,
      pricing_status: input.status === "estimated" ? "trusted" : "missing",
      api_cost_status: input.status,
      estimated_api_input_cost: input.inputCost,
      estimated_api_output_cost: input.outputCost,
      estimated_api_reasoning_output_cost: input.reasoningCost ?? null,
      estimated_api_total_cost: input.totalCost,
      currency: input.currency ?? null,
    },
  }),
  accounting_input_tokens: input.inputTokens,
  accounting_output_tokens: input.outputTokens,
  accounting_total_tokens: (input.inputTokens ?? 0) + (input.outputTokens ?? 0),
  reasoning_output_tokens: input.reasoningTokens ?? null,
  estimated_api_input_cost: input.inputCost,
  estimated_api_output_cost: input.outputCost,
  estimated_api_reasoning_output_cost: input.reasoningCost ?? null,
  estimated_api_total_cost: input.totalCost,
  api_cost_status: input.status,
  currency: input.currency ?? null,
});

describe("TokenUsageStatisticsProvider", () => {
  beforeEach(() => {
    mockStore.listEventsInPeriod.mockReset();
  });

  it("gets nullable total cost via ledger events without turning missing price into zero", async () => {
    const start = new Date("2023-01-01T00:00:00.000Z");
    const end = new Date("2023-01-02T00:00:00.000Z");
    mockStore.listEventsInPeriod.mockResolvedValue([
      buildEvent({ model: "unknown-model", inputTokens: 10, outputTokens: 5, inputCost: null, outputCost: null, totalCost: null, status: "price_missing" }),
    ]);

    const provider = new TokenUsageStatisticsProvider(mockStore as never);
    const totalCost = await provider.getTotalCost(start, end);

    expect(mockStore.listEventsInPeriod).toHaveBeenCalledWith(start, end);
    expect(totalCost).toBeNull();
  });

  it("aggregates stats per model with mixed price status", async () => {
    const now = new Date();
    mockStore.listEventsInPeriod.mockResolvedValue([
      buildEvent({ model: "gpt-test", inputTokens: 10, outputTokens: 0, inputCost: 1.0, outputCost: 0, totalCost: 1.0, reasoningTokens: 3, reasoningCost: 0.3, status: "estimated", currency: "USD" }),
      buildEvent({ model: "gpt-test", inputTokens: 0, outputTokens: 5, inputCost: null, outputCost: null, totalCost: null, status: "price_missing" }),
      buildEvent({ model: null, inputTokens: 0, outputTokens: 20, inputCost: null, outputCost: null, totalCost: null, status: "price_missing" }),
    ]);

    const provider = new TokenUsageStatisticsProvider(mockStore as never);
    const stats = await provider.getStatisticsPerModel(
      new Date(now.getTime() - 24 * 60 * 60 * 1000),
      new Date(now.getTime() + 24 * 60 * 60 * 1000),
    );

    expect(Object.keys(stats).sort()).toEqual(["gpt-test", "unknown"]);
    expect(stats["gpt-test"]).toBeInstanceOf(TokenUsageStats);
    expect(stats["gpt-test"]?.promptTokens).toBe(10);
    expect(stats["gpt-test"]?.assistantTokens).toBe(5);
    expect(stats["gpt-test"]?.reasoningTokens).toBe(3);
    expect(stats["gpt-test"]?.reasoningTokenCost).toBe(0.3);
    expect(stats["gpt-test"]?.totalCost).toBe(1.0);
    expect(stats["gpt-test"]?.apiCostStatus).toBe("mixed");
    expect(stats["gpt-test"]?.currency).toBe("USD");
    expect(stats.unknown?.assistantTokens).toBe(20);
    expect(stats.unknown?.totalCost).toBeNull();
    expect(stats.unknown?.apiCostStatus).toBe("price_missing");
  });




  it("returns null aggregate cost and mixed status for mixed currencies", async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 1_000);
    const end = new Date(now.getTime() + 1_000);
    mockStore.listEventsInPeriod.mockResolvedValue([
      buildEvent({
        model: "glm-direct",
        inputTokens: 100,
        outputTokens: 10,
        inputCost: 0.001,
        outputCost: 0.002,
        totalCost: 0.003,
        reasoningTokens: 1,
        reasoningCost: 0.0002,
        status: "estimated",
        currency: "USD",
      }),
      buildEvent({
        model: "glm-direct",
        inputTokens: 200,
        outputTokens: 20,
        inputCost: 0.02,
        outputCost: 0.04,
        totalCost: 0.06,
        reasoningTokens: 2,
        reasoningCost: 0.004,
        status: "estimated",
        currency: "CNY",
      }),
    ]);

    const provider = new TokenUsageStatisticsProvider(mockStore as never);

    await expect(provider.getTotalCost(start, end)).resolves.toBeNull();
    const stats = await provider.getStatisticsPerModel(start, end);

    expect(stats["glm-direct"]?.promptTokens).toBe(300);
    expect(stats["glm-direct"]?.assistantTokens).toBe(30);
    expect(stats["glm-direct"]?.reasoningTokens).toBe(3);
    expect(stats["glm-direct"]?.totalCost).toBeNull();
    expect(stats["glm-direct"]?.reasoningTokenCost).toBeNull();
    expect(stats["glm-direct"]?.currency).toBeNull();
    expect(stats["glm-direct"]?.apiCostStatus).toBe("mixed");
  });

  it("preserves partial-price-missing statistics instead of coercing missing dimensions to zero", async () => {
    const now = new Date();
    mockStore.listEventsInPeriod.mockResolvedValue([
      buildEvent({
        model: "gpt-cache-partial",
        inputTokens: 1000,
        outputTokens: 200,
        inputCost: 0.0012,
        outputCost: 0.002,
        totalCost: 0.0032,
        status: "partial_price_missing",
        currency: "USD",
      }),
    ]);

    const provider = new TokenUsageStatisticsProvider(mockStore as never);
    const stats = await provider.getStatisticsPerModel(
      new Date(now.getTime() - 1_000),
      new Date(now.getTime() + 1_000),
    );

    expect(stats["gpt-cache-partial"]?.totalCost).toBe(0.0032);
    expect(stats["gpt-cache-partial"]?.apiCostStatus).toBe("partial_price_missing");
    expect(stats["gpt-cache-partial"]?.currency).toBe("USD");
  });
});
