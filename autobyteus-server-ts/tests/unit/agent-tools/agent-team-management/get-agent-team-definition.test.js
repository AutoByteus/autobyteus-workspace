import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerGetAgentTeamDefinitionTool } from "../../../../src/agent-tools/agent-team-management/get-agent-team-definition.js";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/models.js";
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
describe("getAgentTeamDefinitionTool", () => {
    beforeEach(() => {
        mockService.getDefinitionById.mockReset();
    });
    it("returns a JSON representation of a team definition", async () => {
        const definition = new AgentTeamDefinition({
            id: "1",
            name: "TestTeam",
            description: "Desc",
            nodes: [
                new TeamMember({
                    memberName: "coder",
                    referenceId: "1",
                    referenceType: NodeType.AGENT,
                }),
            ],
            coordinatorMemberName: "coder",
        });
        mockService.getDefinitionById.mockResolvedValue(definition);
        const tool = registerGetAgentTeamDefinitionTool();
        const result = await tool.execute({ agentId: "test-agent" }, { definition_id: "1" });
        const data = JSON.parse(result);
        expect(data.name).toBe("TestTeam");
        const nodes = data.nodes;
        expect(nodes[0]?.member_name).toBe("coder");
    });
    it("throws when the definition is not found", async () => {
        mockService.getDefinitionById.mockResolvedValue(null);
        const tool = registerGetAgentTeamDefinitionTool();
        await expect(tool.execute({ agentId: "test-agent" }, { definition_id: "99" })).rejects.toThrow("Agent team definition with ID 99 not found.");
    });
});
