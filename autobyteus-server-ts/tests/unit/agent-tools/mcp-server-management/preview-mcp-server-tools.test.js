import { beforeEach, describe, expect, it, vi } from "vitest";
const mockService = {
    previewMcpServerTools: vi.fn(),
};
vi.mock("../../../../src/mcp-server-management/services/mcp-config-service.js", () => ({
    McpConfigService: {
        getInstance: () => mockService,
    },
}));
import { registerPreviewMcpServerToolsTool } from "../../../../src/agent-tools/mcp-server-management/preview-mcp-server-tools.js";
describe("previewMcpServerToolsTool", () => {
    beforeEach(() => {
        mockService.previewMcpServerTools.mockReset();
    });
    it("handles partial failures across multiple servers", async () => {
        const mockTool = {
            name: "tool1",
            description: "desc1",
            category: "cat1",
            argumentSchema: {
                toJsonSchemaDict: () => ({}),
            },
        };
        mockService.previewMcpServerTools.mockImplementation(async (config) => {
            if (config.server_id === "server1") {
                return [mockTool];
            }
            if (config.server_id === "server2") {
                throw new Error("Connection failed");
            }
            return [];
        });
        const tool = registerPreviewMcpServerToolsTool();
        const jsonInput = JSON.stringify({
            mcpServers: {
                server1: { transport_type: "stdio", command: "cmd1" },
                server2: { transport_type: "stdio", command: "cmd2" },
            },
        });
        const result = await tool.execute({ agentId: "test-agent" }, { configurations_json: jsonInput });
        const data = JSON.parse(result);
        expect(data.results.server1.status).toBe("success");
        expect(data.results.server1.tools).toHaveLength(1);
        expect(data.results.server2.status).toBe("error");
        expect(data.results.server2.message).toContain("Connection failed");
    });
    it("throws on invalid JSON", async () => {
        const tool = registerPreviewMcpServerToolsTool();
        await expect(tool.execute({ agentId: "test-agent" }, { configurations_json: "not-json" })).rejects.toThrow("Invalid JSON provided");
    });
});
