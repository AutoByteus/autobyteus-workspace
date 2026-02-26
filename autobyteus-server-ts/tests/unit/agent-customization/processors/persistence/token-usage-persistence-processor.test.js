import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenUsagePersistenceProcessor } from "../../../../../src/agent-customization/processors/persistence/token-usage-persistence-processor.js";
import { LLMCompleteResponseReceivedEvent } from "autobyteus-ts/agent/events/agent-events.js";
import { CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";
const mockTokenUsageProxy = vi.hoisted(() => ({
    createConversationTokenUsageRecords: vi.fn(),
}));
vi.mock("../../../../../src/token-usage/providers/persistence-proxy.js", () => {
    class MockTokenUsageProxy {
        createConversationTokenUsageRecords = mockTokenUsageProxy.createConversationTokenUsageRecords;
    }
    return {
        PersistenceProxy: MockTokenUsageProxy,
    };
});
describe("TokenUsagePersistenceProcessor", () => {
    beforeEach(() => {
        mockTokenUsageProxy.createConversationTokenUsageRecords.mockReset();
    });
    it("persists detailed token usage", async () => {
        const processor = new TokenUsagePersistenceProcessor();
        const context = {
            agentId: "agent_xyz",
            llmInstance: { model: { value: "test-llm-v1" } },
        };
        const tokenUsage = {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
            prompt_cost: 0.001,
            completion_cost: 0.002,
            total_cost: 0.003,
        };
        const completeResponse = new CompleteResponse({
            content: "some response",
            usage: tokenUsage,
        });
        const triggeringEvent = new LLMCompleteResponseReceivedEvent(completeResponse);
        const result = await processor.processResponse(completeResponse, context, triggeringEvent);
        expect(result).toBe(false);
        expect(mockTokenUsageProxy.createConversationTokenUsageRecords).toHaveBeenCalledWith("agent_xyz", tokenUsage, "test-llm-v1");
    });
    it("skips persistence without usage", async () => {
        const processor = new TokenUsagePersistenceProcessor();
        const context = { agentId: "test_agent_xyz" };
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
        const completeResponse = new CompleteResponse({
            content: "response",
            usage: null,
        });
        const triggeringEvent = new LLMCompleteResponseReceivedEvent(completeResponse);
        const result = await processor.processResponse(completeResponse, context, triggeringEvent);
        expect(result).toBe(false);
        expect(mockTokenUsageProxy.createConversationTokenUsageRecords).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("No token usage data in response"));
        warnSpy.mockRestore();
    });
    it("exposes name", () => {
        expect(TokenUsagePersistenceProcessor.getName()).toBe("TokenUsagePersistenceProcessor");
    });
});
