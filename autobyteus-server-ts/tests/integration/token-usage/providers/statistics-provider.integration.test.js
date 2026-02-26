import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenUsageStatisticsProvider } from "../../../../src/token-usage/providers/statistics-provider.js";
import { TokenUsageRecord, TokenUsageStats } from "../../../../src/token-usage/domain/models.js";
const mockProxy = vi.hoisted(() => ({
    getTotalCostInPeriod: vi.fn(),
    getUsageRecordsInPeriod: vi.fn(),
}));
vi.mock("../../../../src/token-usage/providers/persistence-proxy.js", () => {
    class MockPersistenceProxy {
        getTotalCostInPeriod = mockProxy.getTotalCostInPeriod;
        getUsageRecordsInPeriod = mockProxy.getUsageRecordsInPeriod;
    }
    return {
        PersistenceProxy: MockPersistenceProxy,
    };
});
describe("TokenUsageStatisticsProvider", () => {
    beforeEach(() => {
        mockProxy.getTotalCostInPeriod.mockReset();
        mockProxy.getUsageRecordsInPeriod.mockReset();
    });
    it("gets total cost via persistence proxy", async () => {
        mockProxy.getTotalCostInPeriod.mockResolvedValue(15.75);
        const provider = new TokenUsageStatisticsProvider();
        const start = new Date("2023-01-01T00:00:00.000Z");
        const end = new Date("2023-01-02T00:00:00.000Z");
        const totalCost = await provider.getTotalCost(start, end);
        expect(mockProxy.getTotalCostInPeriod).toHaveBeenCalledWith(start, end);
        expect(totalCost).toBe(15.75);
    });
    it("aggregates stats per model", async () => {
        const now = new Date();
        mockProxy.getUsageRecordsInPeriod.mockResolvedValue([
            new TokenUsageRecord({
                agentId: "agent1",
                role: "user",
                tokenCount: 10,
                cost: 1.0,
                createdAt: now,
                llmModel: "gpt-3.5",
            }),
            new TokenUsageRecord({
                agentId: "agent2",
                role: "assistant",
                tokenCount: 5,
                cost: 0.5,
                createdAt: now,
                llmModel: "gpt-3.5",
            }),
            new TokenUsageRecord({
                agentId: "agent3",
                role: "assistant",
                tokenCount: 20,
                cost: 2.0,
                createdAt: now,
                llmModel: null,
            }),
        ]);
        const provider = new TokenUsageStatisticsProvider();
        const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const stats = await provider.getStatisticsPerModel(start, end);
        expect(mockProxy.getUsageRecordsInPeriod).toHaveBeenCalledWith(start, end);
        expect(Object.keys(stats).sort()).toEqual(["gpt-3.5", "unknown"]);
        const gptStats = stats["gpt-3.5"];
        expect(gptStats).toBeInstanceOf(TokenUsageStats);
        expect(gptStats.promptTokens).toBe(10);
        expect(gptStats.promptTokenCost).toBe(1.0);
        expect(gptStats.assistantTokens).toBe(5);
        expect(gptStats.assistantTokenCost).toBe(0.5);
        expect(gptStats.totalCost).toBe(1.5);
        const unknownStats = stats["unknown"];
        expect(unknownStats).toBeInstanceOf(TokenUsageStats);
        expect(unknownStats.promptTokens).toBe(0);
        expect(unknownStats.promptTokenCost).toBe(0);
        expect(unknownStats.assistantTokens).toBe(20);
        expect(unknownStats.assistantTokenCost).toBe(2.0);
        expect(unknownStats.totalCost).toBe(2.0);
    });
});
