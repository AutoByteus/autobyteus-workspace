import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerDeleteAgentTeamDefinitionTool } from "../../../../src/agent-tools/agent-team-management/delete-agent-team-definition.js";
const mockService = {
    createDefinition: vi.fn(),
    getAllDefinitions: vi.fn(),
    getDefinitionById: vi.fn(),
    updateDefinition: vi.fn(),
    deleteDefinition: vi.fn(),
};
vi.mock("../../../../src/agent-team-definition/services/agent-team-definition-service.js", () => ({
    AgentTeamDefinitionService: {
        getInstance: () => mockService,
    },
}));
describe("deleteAgentTeamDefinitionTool", () => {
    beforeEach(() => {
        mockService.deleteDefinition.mockReset();
    });
    it("returns confirmation on success", async () => {
        mockService.deleteDefinition.mockResolvedValue(true);
        const tool = registerDeleteAgentTeamDefinitionTool();
        const result = await tool.execute({ agentId: "test-agent" }, { definition_id: "1" });
        expect(mockService.deleteDefinition).toHaveBeenCalledWith("1");
        expect(result).toContain("deleted successfully");
    });
    it("returns message when deletion fails", async () => {
        mockService.deleteDefinition.mockResolvedValue(false);
        const tool = registerDeleteAgentTeamDefinitionTool();
        const result = await tool.execute({ agentId: "test-agent" }, { definition_id: "1" });
        expect(result).toContain("could not be deleted");
    });
    it("propagates service errors", async () => {
        mockService.deleteDefinition.mockRejectedValue(new Error("Definition not found"));
        const tool = registerDeleteAgentTeamDefinitionTool();
        await expect(tool.execute({ agentId: "test-agent" }, { definition_id: "1" })).rejects.toThrow(/Definition not found/);
    });
});
