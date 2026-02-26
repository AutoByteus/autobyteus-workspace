import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerListPromptsTool } from "../../../../src/agent-tools/prompt-engineering/list-prompts.js";
import { Prompt } from "../../../../src/prompt-engineering/domain/models.js";
const mockFindPrompts = vi.fn();
vi.mock("../../../../src/prompt-engineering/services/prompt-service.js", () => ({
    PromptService: class PromptServiceMock {
        findPrompts = mockFindPrompts;
    },
}));
describe("listPromptsTool", () => {
    beforeEach(() => {
        mockFindPrompts.mockReset();
    });
    it("returns a JSON summary list without prompt content", async () => {
        const prompt = new Prompt({
            id: "1",
            name: "Test",
            category: "Dev",
            promptContent: "Secret content",
            version: 1,
            isActive: true,
            parentId: null,
            suitableForModels: "gpt-4",
            description: "Desc",
            createdAt: new Date("2024-01-01T00:00:00Z"),
            updatedAt: new Date("2024-01-02T00:00:00Z"),
        });
        mockFindPrompts.mockResolvedValue([prompt]);
        const tool = registerListPromptsTool();
        const result = await tool.execute({ agentId: "test-agent" }, { name: "Test" });
        expect(mockFindPrompts).toHaveBeenCalledOnce();
        expect(mockFindPrompts).toHaveBeenCalledWith({ name: "Test", category: undefined, isActive: true });
        const parsed = JSON.parse(result);
        expect(parsed).toHaveLength(1);
        expect(parsed[0]?.name).toBe("Test");
        expect(parsed[0]).not.toHaveProperty("prompt_content");
        expect(parsed[0]).toHaveProperty("parent_id");
    });
    it("returns empty array string when no prompts found", async () => {
        mockFindPrompts.mockResolvedValue([]);
        const tool = registerListPromptsTool();
        const result = await tool.execute({ agentId: "test-agent" }, {});
        expect(result).toBe("[]");
    });
});
