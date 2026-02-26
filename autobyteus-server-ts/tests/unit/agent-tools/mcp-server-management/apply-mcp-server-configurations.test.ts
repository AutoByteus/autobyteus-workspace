import { beforeEach, describe, expect, it, vi } from "vitest";

const mockService = {
  applyAndRegisterConfigsFromJson: vi.fn(),
};

vi.mock("../../../../src/mcp-server-management/services/mcp-config-service.js", () => ({
  McpConfigService: {
    getInstance: () => mockService,
  },
}));

import { registerApplyMcpServerConfigurationsTool } from "../../../../src/agent-tools/mcp-server-management/apply-mcp-server-configurations.js";

describe("applyMcpServerConfigurationsTool", () => {
  beforeEach(() => {
    mockService.applyAndRegisterConfigsFromJson.mockReset();
  });

  it("returns serialized results from the service", async () => {
    const mockTool = {
      name: "tool1",
      description: "desc1",
      category: "cat1",
      argumentSchema: {
        toJsonSchemaDict: () => ({ type: "object" }),
      },
    };

    mockService.applyAndRegisterConfigsFromJson.mockResolvedValue({
      summary: { total_processed: 1, successful: 1, failed: 0 },
      results: {
        server1: {
          status: "success",
          message: "ok",
          registered_tools: [mockTool],
        },
      },
    });

    const tool = registerApplyMcpServerConfigurationsTool();
    const jsonInput = JSON.stringify({
      mcpServers: { server1: { transport_type: "stdio", command: "cmd" } },
    });
    const result = await tool.execute(
      { agentId: "test-agent" } as any,
      { configurations_json: jsonInput },
    );

    const data = JSON.parse(result) as Record<string, any>;
    expect(data.summary.successful).toBe(1);
    expect(data.results.server1.registered_tools[0].name).toBe("tool1");
  });

  it("throws on invalid JSON", async () => {
    const tool = registerApplyMcpServerConfigurationsTool();
    await expect(
      tool.execute(
        { agentId: "test-agent" } as any,
        { configurations_json: "not json" },
      ),
    ).rejects.toThrow("Invalid JSON provided");
  });

  it("propagates service errors", async () => {
    mockService.applyAndRegisterConfigsFromJson.mockRejectedValue(
      new Error("Missing transport_type"),
    );

    const tool = registerApplyMcpServerConfigurationsTool();
    const jsonInput = JSON.stringify({
      mcpServers: { server1: { transport_type: "stdio", command: "cmd" } },
    });

    await expect(
      tool.execute(
        { agentId: "test-agent" } as any,
        { configurations_json: jsonInput },
      ),
    ).rejects.toThrow("Missing transport_type");
  });
});
