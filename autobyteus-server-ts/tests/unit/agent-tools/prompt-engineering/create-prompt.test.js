import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerCreatePromptTool } from "../../../../src/agent-tools/prompt-engineering/create-prompt.js";
const mockCreatePrompt = vi.fn();
vi.mock("../../../../src/prompt-engineering/services/prompt-service.js", () => ({
    PromptService: class PromptServiceMock {
        createPrompt = mockCreatePrompt;
    },
}));
describe("createPromptTool", () => {
    beforeEach(() => {
        mockCreatePrompt.mockReset();
    });
    it("creates a prompt and returns success message", async () => {
        mockCreatePrompt.mockResolvedValue({ id: "123" });
        const tool = registerCreatePromptTool();
        const result = await tool.execute({ agentId: "test-agent" }, {
            name: "New Family",
            category: "Test",
            prompt_content: "Content here",
            suitable_for_models: "gpt-4",
        });
        expect(mockCreatePrompt).toHaveBeenCalledOnce();
        expect(mockCreatePrompt).toHaveBeenCalledWith({
            name: "New Family",
            category: "Test",
            promptContent: "Content here",
            description: null,
            suitableForModels: "gpt-4",
        });
        expect(result).toContain("created successfully");
        expect(result).toContain("123");
    });
    it("propagates errors from the service", async () => {
        mockCreatePrompt.mockRejectedValue(new Error("Already exists"));
        const tool = registerCreatePromptTool();
        await expect(tool.execute({ agentId: "test-agent" }, {
            name: "Fail",
            category: "Test",
            prompt_content: "Content",
        })).rejects.toThrow("Already exists");
    });
});
