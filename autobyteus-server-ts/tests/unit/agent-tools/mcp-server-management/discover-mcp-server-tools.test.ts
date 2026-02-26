import { beforeEach, describe, expect, it, vi } from "vitest";

const mockService = {
  discoverAndRegisterToolsForServer: vi.fn(),
};

vi.mock("../../../../src/mcp-server-management/services/mcp-config-service.js", () => ({
  McpConfigService: {
    getInstance: () => mockService,
  },
}));

import { registerDiscoverMcpServerToolsTool } from "../../../../src/agent-tools/mcp-server-management/discover-mcp-server-tools.js";

describe("discoverMcpServerToolsTool", () => {
  beforeEach(() => {
    mockService.discoverAndRegisterToolsForServer.mockReset();
  });

  it("returns JSON list of tool summaries", async () => {
    const mockTool = {
      name: "tool1",
      description: "desc1",
      category: "cat1",
      argumentSchema: {
        toJsonSchemaDict: () => ({ type: "object" }),
      },
    };

    mockService.discoverAndRegisterToolsForServer.mockResolvedValue([mockTool]);

    const tool = registerDiscoverMcpServerToolsTool();
    const result = await tool.execute(
      { agentId: "test-agent" } as any,
      { server_id: "server1" },
    );

    const data = JSON.parse(result) as Array<Record<string, unknown>>;
    expect(mockService.discoverAndRegisterToolsForServer).toHaveBeenCalledWith("server1");
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("tool1");
  });

  it("throws when service reports missing config", async () => {
    mockService.discoverAndRegisterToolsForServer.mockRejectedValue(
      new Error("No configuration found"),
    );

    const tool = registerDiscoverMcpServerToolsTool();
    await expect(
      tool.execute({ agentId: "test-agent" } as any, { server_id: "missing" }),
    ).rejects.toThrow("No configuration found");
  });
});
