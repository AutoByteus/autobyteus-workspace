import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerDeleteAgentDefinitionTool } from "../../../../src/agent-tools/agent-management/delete-agent-definition.js";
const mockService = {
    createAgentDefinition: vi.fn(),
    getAllAgentDefinitions: vi.fn(),
    getAgentDefinitionById: vi.fn(),
    updateAgentDefinition: vi.fn(),
    deleteAgentDefinition: vi.fn(),
};
vi.mock("../../../../src/agent-definition/services/agent-definition-service.js", () => ({
    AgentDefinitionService: {
        getInstance: () => mockService,
    },
}));
describe("deleteAgentDefinitionTool", () => {
    beforeEach(() => {
        mockService.deleteAgentDefinition.mockReset();
    });
    it("returns confirmation on success", async () => {
        mockService.deleteAgentDefinition.mockResolvedValue(true);
        const tool = registerDeleteAgentDefinitionTool();
        const result = await tool.execute({ agentId: "test-agent" }, { definition_id: "1" });
        expect(mockService.deleteAgentDefinition).toHaveBeenCalledWith("1");
        expect(result).toContain("deleted successfully");
    });
    it("returns message when deletion fails", async () => {
        mockService.deleteAgentDefinition.mockResolvedValue(false);
        const tool = registerDeleteAgentDefinitionTool();
        const result = await tool.execute({ agentId: "test-agent" }, { definition_id: "1" });
        expect(result).toContain("could not be deleted");
    });
    it("propagates service errors", async () => {
        mockService.deleteAgentDefinition.mockRejectedValue(new Error("Definition not found"));
        const tool = registerDeleteAgentDefinitionTool();
        await expect(tool.execute({ agentId: "test-agent" }, { definition_id: "1" })).rejects.toThrow(/Definition not found/);
    });
});
