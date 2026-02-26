import { beforeEach, describe, expect, it, vi } from "vitest";

const mockService = {
  deleteMcpServer: vi.fn(),
};

vi.mock("../../../../src/mcp-server-management/services/mcp-config-service.js", () => ({
  McpConfigService: {
    getInstance: () => mockService,
  },
}));

import { registerDeleteMcpServerConfigurationTool } from "../../../../src/agent-tools/mcp-server-management/delete-mcp-server-configuration.js";

describe("deleteMcpServerConfigurationTool", () => {
  beforeEach(() => {
    mockService.deleteMcpServer.mockReset();
  });

  it("returns success message when deleted", async () => {
    mockService.deleteMcpServer.mockResolvedValue(true);

    const tool = registerDeleteMcpServerConfigurationTool();
    const result = await tool.execute(
      { agentId: "test-agent" } as any,
      { server_id: "server1" },
    );

    expect(mockService.deleteMcpServer).toHaveBeenCalledWith("server1");
    expect(result).toContain("deleted successfully");
  });

  it("returns not found message when delete fails", async () => {
    mockService.deleteMcpServer.mockResolvedValue(false);

    const tool = registerDeleteMcpServerConfigurationTool();
    const result = await tool.execute(
      { agentId: "test-agent" } as any,
      { server_id: "missing" },
    );

    expect(result).toContain("not found or could not be deleted");
  });

  it("propagates errors from the service", async () => {
    mockService.deleteMcpServer.mockRejectedValue(new Error("Database connection lost"));

    const tool = registerDeleteMcpServerConfigurationTool();
    await expect(
      tool.execute({ agentId: "test-agent" } as any, { server_id: "server1" }),
    ).rejects.toThrow("Database connection lost");
  });
});
