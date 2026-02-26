import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerDeletePromptTool } from "../../../../src/agent-tools/prompt-engineering/delete-prompt.js";
const mockDeletePrompt = vi.fn();
vi.mock("../../../../src/prompt-engineering/services/prompt-service.js", () => ({
    PromptService: class PromptServiceMock {
        deletePrompt = mockDeletePrompt;
    },
}));
describe("deletePromptTool", () => {
    beforeEach(() => {
        mockDeletePrompt.mockReset();
    });
    it("returns confirmation on successful delete", async () => {
        mockDeletePrompt.mockResolvedValue(true);
        const tool = registerDeletePromptTool();
        const result = await tool.execute({ agentId: "test-agent" }, { prompt_id: "1" });
        expect(mockDeletePrompt).toHaveBeenCalledOnce();
        expect(mockDeletePrompt).toHaveBeenCalledWith("1");
        expect(result).toContain("deleted successfully");
    });
    it("returns a not-found message when delete fails", async () => {
        mockDeletePrompt.mockResolvedValue(false);
        const tool = registerDeletePromptTool();
        const result = await tool.execute({ agentId: "test-agent" }, { prompt_id: "1" });
        expect(result).toContain("could not be deleted");
    });
    it("propagates errors from the service", async () => {
        mockDeletePrompt.mockRejectedValue(new Error("DB error"));
        const tool = registerDeletePromptTool();
        await expect(tool.execute({ agentId: "test-agent" }, { prompt_id: "1" })).rejects.toThrow("DB error");
    });
});
