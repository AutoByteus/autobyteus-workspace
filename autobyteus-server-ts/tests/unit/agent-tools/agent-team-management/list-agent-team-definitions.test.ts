import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerListAgentTeamDefinitionsTool } from "../../../../src/agent-tools/agent-team-management/list-agent-team-definitions.js";
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

describe("listAgentTeamDefinitionsTool", () => {
  beforeEach(() => {
    mockService.getAllDefinitions.mockReset();
  });

  it("returns JSON list of team definitions", async () => {
    const definition = new AgentTeamDefinition({
      id: "1",
      name: "Team1",
      description: "Desc1",
      role: "Role1",
      avatarUrl: "http://localhost:8000/rest/files/images/team-avatar-1.png",
      nodes: [
        new TeamMember({
          memberName: "coord1",
          referenceId: "agent1",
          referenceType: NodeType.AGENT,
        }),
      ],
      coordinatorMemberName: "coord1",
    });
    mockService.getAllDefinitions.mockResolvedValue([definition]);

    const tool = registerListAgentTeamDefinitionsTool();
    const result = await tool.execute({ agentId: "test-agent" } as any, {});

    const data = JSON.parse(result) as Array<Record<string, unknown>>;
    expect(data).toHaveLength(1);
    expect(data[0]?.name).toBe("Team1");
    expect(data[0]?.avatar_url).toBe("http://localhost:8000/rest/files/images/team-avatar-1.png");
    const nodes = data[0]?.nodes as Array<Record<string, unknown>>;
    expect(nodes[0]?.member_name).toBe("coord1");
  });

  it("returns empty array string when no definitions exist", async () => {
    mockService.getAllDefinitions.mockResolvedValue([]);

    const tool = registerListAgentTeamDefinitionsTool();
    const result = await tool.execute({ agentId: "test-agent" } as any, {});

    expect(result).toBe("[]");
  });
});
