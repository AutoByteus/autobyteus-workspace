import { beforeEach, describe, expect, it, vi } from "vitest";
import { StdioMcpServerConfig, StreamableHttpMcpServerConfig, } from "autobyteus-ts/tools/mcp/types.js";
import { McpConfigService } from "../../../../src/mcp-server-management/services/mcp-config-service.js";
const VALID_JSON_IMPORT_STRING = JSON.stringify({
    mcpServers: {
        "stdio-serv-1": {
            transport_type: "stdio",
            command: "node",
            args: ["index.js"],
            tool_name_prefix: "stdio1",
        },
        "http-serv-1": {
            transport_type: "streamable_http",
            url: "http://localhost:8000",
            tool_name_prefix: "http1",
        },
    },
});
const PARTIAL_FAILURE_JSON_IMPORT_STRING = JSON.stringify({
    mcpServers: {
        "valid-server": {
            transport_type: "stdio",
            command: "node",
            args: ["index.js"],
        },
        "invalid-server-no-command": {
            transport_type: "stdio",
            args: ["index.js"],
        },
    },
});
const CAMEL_CASE_JSON_IMPORT_STRING = JSON.stringify({
    mcpServers: {
        "camel-server": {
            transportType: "stdio",
            command: "node",
            args: ["index.js"],
            toolNamePrefix: "camel",
        },
    },
});
vi.mock("../../../../src/mcp-server-management/providers/cached-provider.js", () => {
    return {
        CachedMcpServerConfigProvider: class {
            getAll = vi.fn().mockResolvedValue([]);
            getByServerId = vi.fn().mockResolvedValue(null);
            create = vi.fn();
            update = vi.fn();
            deleteByServerId = vi.fn();
        },
    };
});
describe("McpConfigService import", () => {
    beforeEach(() => {
        McpConfigService.resetInstance();
    });
    it("imports valid JSON configs", async () => {
        const service = new McpConfigService();
        const configureSpy = vi
            .spyOn(service, "configureMcpServer")
            .mockResolvedValue({});
        const result = await service.importConfigsFromJson(VALID_JSON_IMPORT_STRING);
        expect(result).toEqual({ imported_count: 2, failed_count: 0 });
        expect(configureSpy).toHaveBeenCalledTimes(2);
        const stdioCall = configureSpy.mock.calls[0]?.[0];
        const httpCall = configureSpy.mock.calls[1]?.[0];
        expect(stdioCall).toBeInstanceOf(StdioMcpServerConfig);
        expect(stdioCall.server_id).toBe("stdio-serv-1");
        expect(stdioCall.command).toBe("node");
        expect(stdioCall.tool_name_prefix).toBe("stdio1");
        expect(httpCall).toBeInstanceOf(StreamableHttpMcpServerConfig);
        expect(httpCall.server_id).toBe("http-serv-1");
        expect(httpCall.url).toBe("http://localhost:8000");
        expect(httpCall.tool_name_prefix).toBe("http1");
    });
    it("handles partial failure during import", async () => {
        const service = new McpConfigService();
        const configureSpy = vi
            .spyOn(service, "configureMcpServer")
            .mockResolvedValue({});
        const result = await service.importConfigsFromJson(PARTIAL_FAILURE_JSON_IMPORT_STRING);
        expect(result).toEqual({ imported_count: 1, failed_count: 1 });
        expect(configureSpy).toHaveBeenCalledTimes(1);
        const validCall = configureSpy.mock.calls[0]?.[0];
        expect(validCall).toBeInstanceOf(StdioMcpServerConfig);
        expect(validCall.server_id).toBe("valid-server");
    });
    it("throws for malformed JSON", async () => {
        const service = new McpConfigService();
        await expect(service.importConfigsFromJson('{"mcpServers": {"key": "value",}}')).rejects.toThrow();
    });
    it("throws for invalid structure", async () => {
        const service = new McpConfigService();
        await expect(service.importConfigsFromJson('{"servers": {}}')).rejects.toThrow("JSON must contain a top-level 'mcpServers' object.");
    });
    it("returns zero counts for empty configs", async () => {
        const service = new McpConfigService();
        const configureSpy = vi
            .spyOn(service, "configureMcpServer")
            .mockResolvedValue({});
        const result = await service.importConfigsFromJson('{"mcpServers": {}}');
        expect(result).toEqual({ imported_count: 0, failed_count: 0 });
        expect(configureSpy).not.toHaveBeenCalled();
    });
    it("accepts camelCase transportType/toolNamePrefix", async () => {
        const service = new McpConfigService();
        const configureSpy = vi
            .spyOn(service, "configureMcpServer")
            .mockResolvedValue({});
        const result = await service.importConfigsFromJson(CAMEL_CASE_JSON_IMPORT_STRING);
        expect(result).toEqual({ imported_count: 1, failed_count: 0 });
        expect(configureSpy).toHaveBeenCalledTimes(1);
        const call = configureSpy.mock.calls[0]?.[0];
        expect(call).toBeInstanceOf(StdioMcpServerConfig);
        expect(call.server_id).toBe("camel-server");
        expect(call.command).toBe("node");
        expect(call.tool_name_prefix).toBe("camel");
    });
});
