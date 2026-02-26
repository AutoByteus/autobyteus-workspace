import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerGetAgentDefinitionTool } from "../../../../src/agent-tools/agent-management/get-agent-definition.js";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
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
describe("getAgentDefinitionTool", () => {
    beforeEach(() => {
        mockService.getAgentDefinitionById.mockReset();
    });
    it("returns JSON for an agent definition", async () => {
        const def = new AgentDefinition({
            id: "1",
            name: "TestAgent",
            role: "Role",
            description: "Desc",
            toolNames: ["Tool1"],
        });
        mockService.getAgentDefinitionById.mockResolvedValue(def);
        const tool = registerGetAgentDefinitionTool();
        const result = await tool.execute({ agentId: "test-agent" }, { definition_id: "1" });
        const data = JSON.parse(result);
        expect(data.name).toBe("TestAgent");
        expect(data.tool_names).toEqual(["Tool1"]);
    });
    it("throws when the definition is not found", async () => {
        mockService.getAgentDefinitionById.mockResolvedValue(null);
        const tool = registerGetAgentDefinitionTool();
        await expect(tool.execute({ agentId: "test-agent" }, { definition_id: "99" })).rejects.toThrow("Agent definition with ID 99 not found.");
    });
});
