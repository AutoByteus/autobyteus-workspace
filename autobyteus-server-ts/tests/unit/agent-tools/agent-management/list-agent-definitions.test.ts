import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerListAgentDefinitionsTool } from "../../../../src/agent-tools/agent-management/list-agent-definitions.js";
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

describe("listAgentDefinitionsTool", () => {
  beforeEach(() => {
    mockService.getAllAgentDefinitions.mockReset();
  });

  it("returns JSON list of agent definitions", async () => {
    const defs = [
      new AgentDefinition({
        id: "1",
        name: "Agent1",
        role: "Role1",
        description: "Desc1",
        toolNames: ["Tool1"],
      }),
      new AgentDefinition({
        id: "2",
        name: "Agent2",
        role: "Role2",
        description: "Desc2",
        toolNames: ["Tool2"],
      }),
    ];
    mockService.getAllAgentDefinitions.mockResolvedValue(defs);

    const tool = registerListAgentDefinitionsTool();
    const result = await tool.execute({ agentId: "test-agent" } as any, {});

    const data = JSON.parse(result) as Array<Record<string, unknown>>;
    expect(data).toHaveLength(2);
    expect(data[0]?.name).toBe("Agent1");
  });

  it("leaves out internal agents while \"Show internal agents\" is off (autobyteus-308 AC-004)", async () => {
    mockService.getAllAgentDefinitions.mockResolvedValue([
      new AgentDefinition({ id: "reviewer", name: "Code Reviewer", description: "Reviews", instructions: "x" }),
      new AgentDefinition({ id: "router", name: "Model Router", description: "Routes", instructions: "x", internal: true }),
    ]);
    const tool = registerListAgentDefinitionsTool();
    const listed = () => tool.execute({ agentId: "test-agent" } as any, {}).then((result: string) =>
      (JSON.parse(result) as Array<{ id: string }>).map((entry) => entry.id));
    vi.stubEnv("AUTOBYTEUS_SHOW_INTERNAL_AGENTS", "false");
    try {
      expect(await listed()).toEqual(["reviewer"]);
      vi.stubEnv("AUTOBYTEUS_SHOW_INTERNAL_AGENTS", "true");
      expect(await listed()).toEqual(["reviewer", "router"]);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("returns empty array string when no definitions exist", async () => {
    mockService.getAllAgentDefinitions.mockResolvedValue([]);

    const tool = registerListAgentDefinitionsTool();
    const result = await tool.execute({ agentId: "test-agent" } as any, {});

    expect(result).toBe("[]");
  });
});
