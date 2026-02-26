import { beforeEach, describe, expect, it, vi } from "vitest";
import { StdioMcpServerConfig } from "autobyteus-ts/tools/mcp/types.js";

const mockService = {
  getMcpServerById: vi.fn(),
};

vi.mock("../../../../src/mcp-server-management/services/mcp-config-service.js", () => ({
  McpConfigService: {
    getInstance: () => mockService,
  },
}));

import { registerGetMcpServerConfigurationTool } from "../../../../src/agent-tools/mcp-server-management/get-mcp-server-configuration.js";

describe("getMcpServerConfigurationTool", () => {
  beforeEach(() => {
    mockService.getMcpServerById.mockReset();
  });

  it("returns JSON for a server configuration", async () => {
    const config = new StdioMcpServerConfig({
      server_id: "server1",
      command: "cmd1",
    });
    mockService.getMcpServerById.mockResolvedValue(config);

    const tool = registerGetMcpServerConfigurationTool();
    const result = await tool.execute(
      { agentId: "test-agent" } as any,
      { server_id: "server1" },
    );

    expect(mockService.getMcpServerById).toHaveBeenCalledWith("server1");
    const data = JSON.parse(result) as Record<string, unknown>;
    expect(data.server_id).toBe("server1");
    expect(data.transport_type).toBe("stdio");
  });

  it("throws when configuration is not found", async () => {
    mockService.getMcpServerById.mockResolvedValue(null);

    const tool = registerGetMcpServerConfigurationTool();
    await expect(
      tool.execute({ agentId: "test-agent" } as any, { server_id: "missing" }),
    ).rejects.toThrow("MCP server configuration with ID 'missing' not found.");
  });
});
