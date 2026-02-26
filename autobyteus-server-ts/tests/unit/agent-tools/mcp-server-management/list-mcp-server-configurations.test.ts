import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig,
} from "autobyteus-ts/tools/mcp/types.js";

const mockService = {
  getAllMcpServers: vi.fn(),
};

vi.mock("../../../../src/mcp-server-management/services/mcp-config-service.js", () => ({
  McpConfigService: {
    getInstance: () => mockService,
  },
}));

import { registerListMcpServerConfigurationsTool } from "../../../../src/agent-tools/mcp-server-management/list-mcp-server-configurations.js";

describe("listMcpServerConfigurationsTool", () => {
  beforeEach(() => {
    mockService.getAllMcpServers.mockReset();
  });

  it("returns JSON list of configurations", async () => {
    const config1 = new StdioMcpServerConfig({
      server_id: "server1",
      command: "cmd1",
    });
    const config2 = new StreamableHttpMcpServerConfig({
      server_id: "server2",
      url: "http://localhost:3000",
    });

    mockService.getAllMcpServers.mockResolvedValue([config1, config2]);

    const tool = registerListMcpServerConfigurationsTool();
    const result = await tool.execute({ agentId: "test-agent" } as any, {});

    const data = JSON.parse(result) as Array<Record<string, unknown>>;
    expect(data).toHaveLength(2);
    expect(data[0].server_id).toBe("server1");
    expect(data[1].transport_type).toBe("streamable_http");
  });

  it("returns empty array string when no configs", async () => {
    mockService.getAllMcpServers.mockResolvedValue([]);

    const tool = registerListMcpServerConfigurationsTool();
    const result = await tool.execute({ agentId: "test-agent" } as any, {});

    expect(result).toBe("[]");
  });
});
