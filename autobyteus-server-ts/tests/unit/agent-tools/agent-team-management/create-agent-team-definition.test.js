import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerCreateAgentTeamDefinitionTool } from "../../../../src/agent-tools/agent-team-management/create-agent-team-definition.js";
import { NodeType } from "../../../../src/agent-team-definition/domain/enums.js";
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
describe("createAgentTeamDefinitionTool", () => {
    beforeEach(() => {
        mockService.createDefinition.mockReset();
    });
    it("creates a team definition and returns success message", async () => {
        mockService.createDefinition.mockResolvedValue({ id: "456" });
        const nodesJson = JSON.stringify([
            {
                member_name: "coder",
                reference_id: "1",
                reference_type: "AGENT",
            },
        ]);
        const tool = registerCreateAgentTeamDefinitionTool();
        const result = await tool.execute({ agentId: "test-agent" }, {
            name: "TestTeam",
            description: "A team for testing",
            nodes: nodesJson,
            coordinator_member_name: "coder",
            role: "TestRole",
        });
        expect(mockService.createDefinition).toHaveBeenCalledOnce();
        const createdDef = mockService.createDefinition.mock.calls[0]?.[0];
        expect(createdDef.name).toBe("TestTeam");
        expect(createdDef.nodes).toHaveLength(1);
        expect(createdDef.nodes[0].memberName).toBe("coder");
        expect(createdDef.nodes[0].referenceType).toBe(NodeType.AGENT);
        expect(result).toContain("created successfully");
        expect(result).toContain("456");
    });
    it("throws on invalid JSON", async () => {
        const tool = registerCreateAgentTeamDefinitionTool();
        await expect(tool.execute({ agentId: "test-agent" }, {
            name: "TestTeam",
            description: "A team",
            nodes: "this is not json",
            coordinator_member_name: "coder",
        })).rejects.toThrow(/Invalid input/);
    });
});
