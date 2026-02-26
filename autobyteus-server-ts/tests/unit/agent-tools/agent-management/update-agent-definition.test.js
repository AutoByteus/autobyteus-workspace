import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerUpdateAgentDefinitionTool } from "../../../../src/agent-tools/agent-management/update-agent-definition.js";
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
describe("updateAgentDefinitionTool", () => {
    beforeEach(() => {
        mockService.updateAgentDefinition.mockReset();
    });
    it("updates an agent definition with parsed lists", async () => {
        mockService.updateAgentDefinition.mockResolvedValue(undefined);
        const tool = registerUpdateAgentDefinitionTool();
        const result = await tool.execute({ agentId: "test-agent" }, { definition_id: "1", role: "New Role", tool_names: "NewTool1, NewTool2" });
        expect(mockService.updateAgentDefinition).toHaveBeenCalledOnce();
        const [definitionIdArg, updateDataArg] = mockService.updateAgentDefinition.mock.calls[0];
        expect(definitionIdArg).toBe("1");
        expect(updateDataArg).toMatchObject({ role: "New Role", toolNames: ["NewTool1", "NewTool2"] });
        expect(result).toContain("updated successfully");
    });
    it("throws when no update fields are provided", async () => {
        const tool = registerUpdateAgentDefinitionTool();
        await expect(tool.execute({ agentId: "test-agent" }, { definition_id: "1" })).rejects.toThrow("At least one field must be provided");
    });
    it("propagates service errors", async () => {
        mockService.updateAgentDefinition.mockRejectedValue(new Error("Definition not found"));
        const tool = registerUpdateAgentDefinitionTool();
        await expect(tool.execute({ agentId: "test-agent" }, { definition_id: "99", name: "New Name" })).rejects.toThrow(/Definition not found/);
    });
});
