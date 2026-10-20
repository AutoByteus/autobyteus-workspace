import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig,
} from "autobyteus-ts/tools/mcp/types.js";
import { McpConfigService } from "../../../../src/mcp-server-management/services/mcp-config-service.js";
import { McpServerResolver } from "../../../../src/api/graphql/types/mcp-server.js";

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
      .mockResolvedValue({} as any);

    const result = await service.importConfigsFromJson(VALID_JSON_IMPORT_STRING);

    expect(result).toEqual({ imported_count: 2, failed_count: 0, failures: [] });
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
      .mockResolvedValue({} as any);

    const result = await service.importConfigsFromJson(PARTIAL_FAILURE_JSON_IMPORT_STRING);

    expect(result).toMatchObject({ imported_count: 1, failed_count: 1 });
    expect(result.failures).toEqual([{ server_id: "invalid-server-no-command", reason: expect.stringContaining("'command' must be a non-empty string") }]);
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
    await expect(service.importConfigsFromJson('{"servers": {}}')).rejects.toThrow(
      "JSON must contain a top-level 'mcpServers' object.",
    );
  });

  it("returns zero counts for empty configs", async () => {
    const service = new McpConfigService();
    const configureSpy = vi
      .spyOn(service, "configureMcpServer")
      .mockResolvedValue({} as any);

    const result = await service.importConfigsFromJson('{"mcpServers": {}}');

    expect(result).toEqual({ imported_count: 0, failed_count: 0, failures: [] });
    expect(configureSpy).not.toHaveBeenCalled();
  });

  it("accepts camelCase transportType/toolNamePrefix", async () => {
    const service = new McpConfigService();
    const configureSpy = vi
      .spyOn(service, "configureMcpServer")
      .mockResolvedValue({} as any);

    const result = await service.importConfigsFromJson(CAMEL_CASE_JSON_IMPORT_STRING);

    expect(result).toEqual({ imported_count: 1, failed_count: 0, failures: [] });
    expect(configureSpy).toHaveBeenCalledTimes(1);

    const call = configureSpy.mock.calls[0]?.[0];
    expect(call).toBeInstanceOf(StdioMcpServerConfig);
    expect(call.server_id).toBe("camel-server");
    expect(call.command).toBe("node");
    expect(call.tool_name_prefix).toBe("camel");
  });

  it("reports each failed entry with its server id and a reason that carries no secret values", async () => {
    const service = new McpConfigService();
    const configureSpy = vi.spyOn(service, "configureMcpServer").mockResolvedValue({} as any);
    const json = JSON.stringify({
      mcpServers: {
        ok: { command: "node", args: ["server.js"], env: { API_KEY: "test-dummy-env-secret" } },
        bad: { transport_type: "websocket", url: "ws://127.0.0.1:8765/mcp", headers: { Authorization: "Bearer test-dummy-header-secret" } },
        empty: {},
        both: { url: "http://127.0.0.1:9000/mcp", token: "test-dummy-token-secret", headers: { authorization: "Basic test-dummy-basic-secret" } },
        notObject: "test-dummy-string-secret",
      },
    });

    const result = await service.importConfigsFromJson(json);

    expect(result.imported_count).toBe(1);
    expect(result.failed_count).toBe(4);
    expect(configureSpy).toHaveBeenCalledTimes(1);
    expect(configureSpy.mock.calls[0]?.[0]).toBeInstanceOf(StdioMcpServerConfig);
    expect(result.failures).toEqual([
      { server_id: "bad", reason: "Invalid 'transport_type' string 'websocket' for server 'bad'. Valid types are: stdio, streamable_http." },
      { server_id: "empty", reason: "Config for server 'empty' needs 'command' (stdio) or 'url' (streamable_http), or an explicit 'transport_type'." },
      { server_id: "both", reason: expect.stringContaining("sets both 'token' and an 'Authorization' header") },
      { server_id: "notObject", reason: "Configuration for server 'notObject' must be a dictionary." },
    ]);
    expect(JSON.stringify(result)).not.toMatch(/test-dummy-[a-z]+-secret/);
  });
});

describe("McpServerResolver.importMcpServerConfigs", () => {
  beforeEach(() => {
    McpConfigService.resetInstance();
  });

  it("maps the failed entries into the GraphQL result", async () => {
    vi.spyOn(McpConfigService.prototype, "configureMcpServer").mockResolvedValue({} as any);
    const result = await new McpServerResolver().importMcpServerConfigs(
      JSON.stringify({ mcpServers: { ok: { command: "node" }, empty: {} } }),
    );
    expect(result).toEqual({
      success: false,
      message: "Import complete. Imported: 1, Failed: 1",
      importedCount: 1,
      failedCount: 1,
      failures: [{ serverId: "empty", reason: expect.stringContaining("needs 'command' (stdio) or 'url'") }],
    });
  });

  it.each([
    ["malformed JSON", '{"mcpServers": {"key": "value",}}'],
    ["a missing mcpServers object", '{"servers": {}}'],
  ])("reports %s as before, with an empty failure list", async (_label, json) => {
    const result = await new McpServerResolver().importMcpServerConfigs(json);
    expect(result).toMatchObject({ success: false, importedCount: 0, failedCount: 0, failures: [] });
    expect(result.message).toBeTruthy();
  });
});
