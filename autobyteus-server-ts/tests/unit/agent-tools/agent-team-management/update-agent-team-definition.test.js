import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerUpdateAgentTeamDefinitionTool } from "../../../../src/agent-tools/agent-team-management/update-agent-team-definition.js";
import { AgentTeamDefinitionUpdate } from "../../../../src/agent-team-definition/domain/models.js";
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
describe("updateAgentTeamDefinitionTool", () => {
    beforeEach(() => {
        mockService.updateDefinition.mockReset();
    });
    it("updates a team definition", async () => {
        mockService.updateDefinition.mockResolvedValue(undefined);
        const tool = registerUpdateAgentTeamDefinitionTool();
        const result = await tool.execute({ agentId: "test-agent" }, { definition_id: "1", description: "New Description" });
        expect(mockService.updateDefinition).toHaveBeenCalledOnce();
        const [definitionIdArg, updateDataArg] = mockService.updateDefinition.mock.calls[0];
        expect(definitionIdArg).toBe("1");
        expect(updateDataArg).toBeInstanceOf(AgentTeamDefinitionUpdate);
        expect(updateDataArg.description).toBe("New Description");
        expect(updateDataArg.name).toBeNull();
        expect(result).toContain("updated successfully");
    });
    it("throws when no update fields are provided", async () => {
        const tool = registerUpdateAgentTeamDefinitionTool();
        await expect(tool.execute({ agentId: "test-agent" }, { definition_id: "1" })).rejects.toThrow("At least one field must be provided");
    });
    it("propagates service errors", async () => {
        mockService.updateDefinition.mockRejectedValue(new Error("Definition not found"));
        const tool = registerUpdateAgentTeamDefinitionTool();
        await expect(tool.execute({ agentId: "test-agent" }, { definition_id: "99", name: "New Name" })).rejects.toThrow(/Definition not found/);
    });
});
