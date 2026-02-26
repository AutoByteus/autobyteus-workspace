import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerActivatePromptTool } from "../../../../src/agent-tools/prompt-engineering/activate-prompt.js";
const mockGetPromptById = vi.fn();
const mockFindAllByNameAndCategory = vi.fn();
const mockMarkActivePrompt = vi.fn();
vi.mock("../../../../src/prompt-engineering/services/prompt-service.js", () => ({
    PromptService: class PromptServiceMock {
        getPromptById = mockGetPromptById;
        findAllByNameAndCategory = mockFindAllByNameAndCategory;
        markActivePrompt = mockMarkActivePrompt;
    },
}));
describe("activatePromptTool", () => {
    beforeEach(() => {
        mockGetPromptById.mockReset();
        mockFindAllByNameAndCategory.mockReset();
        mockMarkActivePrompt.mockReset();
    });
    it("reports prior active prompt when deactivated", async () => {
        const targetPrompt = {
            name: "FamilyName",
            category: "Test",
            suitableForModels: "gpt-4",
            id: "101",
        };
        const oldActive = { isActive: true, id: "100" };
        mockGetPromptById.mockResolvedValue(targetPrompt);
        mockFindAllByNameAndCategory.mockResolvedValue([oldActive, targetPrompt]);
        mockMarkActivePrompt.mockResolvedValue({ id: "101" });
        const tool = registerActivatePromptTool();
        const result = await tool.execute({ agentId: "test-agent" }, { prompt_id: "101" });
        expect(mockGetPromptById).toHaveBeenCalledOnce();
        expect(mockGetPromptById).toHaveBeenCalledWith("101");
        expect(mockFindAllByNameAndCategory).toHaveBeenCalledOnce();
        expect(mockMarkActivePrompt).toHaveBeenCalledWith("101");
        expect(result).toContain("ID 101 has been activated");
        expect(result).toContain("ID: 100) has been automatically deactivated");
    });
    it("reports when no prior active prompt exists", async () => {
        const targetPrompt = {
            name: "FamilyName",
            category: "Test",
            suitableForModels: "gpt-4",
            id: "101",
        };
        mockGetPromptById.mockResolvedValue(targetPrompt);
        mockFindAllByNameAndCategory.mockResolvedValue([targetPrompt]);
        mockMarkActivePrompt.mockResolvedValue({ id: "101" });
        const tool = registerActivatePromptTool();
        const result = await tool.execute({ agentId: "test-agent" }, { prompt_id: "101" });
        expect(mockMarkActivePrompt).toHaveBeenCalledWith("101");
        expect(result).toContain("no previously active prompt");
    });
    it("throws when prompt is not found", async () => {
        mockGetPromptById.mockResolvedValue(null);
        const tool = registerActivatePromptTool();
        await expect(tool.execute({ agentId: "test-agent" }, { prompt_id: "999" })).rejects.toThrow("Prompt with ID 999 not found.");
    });
});
