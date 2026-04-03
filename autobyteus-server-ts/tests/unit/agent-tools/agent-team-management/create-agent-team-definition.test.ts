import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerCreateAgentTeamDefinitionTool } from "../../../../src/agent-tools/agent-team-management/create-agent-team-definition.js";
import { AgentTeamDefinition } from "../../../../src/agent-team-definition/domain/models.js";

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
        ref: "1",
        ref_type: "agent",
        ref_scope: "shared",
      },
    ]);

    const tool = registerCreateAgentTeamDefinitionTool();
    const result = await tool.execute(
      { agentId: "test-agent" } as any,
      {
        name: "TestTeam",
        description: "A team for testing",
        instructions: "Coordinate team members for tests.",
        nodes: nodesJson,
        coordinator_member_name: "coder",
        category: "TestCategory",
      },
    );

    expect(mockService.createDefinition).toHaveBeenCalledOnce();
    const createdDef = mockService.createDefinition.mock.calls[0]?.[0] as AgentTeamDefinition;
    expect(createdDef.name).toBe("TestTeam");
    expect(createdDef.nodes).toHaveLength(1);
    expect(createdDef.nodes[0].memberName).toBe("coder");
    expect(createdDef.nodes[0].refType).toBe("agent");
    expect(createdDef.nodes[0].refScope).toBe("shared");
    expect(result).toContain("created successfully");
    expect(result).toContain("456");
  });

  it("throws on invalid JSON", async () => {
    const tool = registerCreateAgentTeamDefinitionTool();
    await expect(
      tool.execute(
        { agentId: "test-agent" } as any,
        {
          name: "TestTeam",
          description: "A team",
          instructions: "Coordinate team members for tests.",
          nodes: "this is not json",
          coordinator_member_name: "coder",
        },
      ),
    ).rejects.toThrow(/Invalid input/);
  });
});
