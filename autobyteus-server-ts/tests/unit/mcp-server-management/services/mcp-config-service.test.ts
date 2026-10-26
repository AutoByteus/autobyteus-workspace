import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { secretId } from "autobyteus-ts/secrets/vault/secret-id.js";
import { McpTransportType, StdioMcpServerConfig } from "autobyteus-ts/tools/mcp/types.js";
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

    const result = await service.importMcpServerConfigs(VALID_JSON_IMPORT_STRING);

    expect(result).toEqual({ imported_count: 2, failed_count: 0, failures: [], stored_secrets: [], needs_secret: [] });
    expect(configureSpy).toHaveBeenCalledTimes(2);

    const stdioCall = configureSpy.mock.calls[0]?.[0];
    const httpCall = configureSpy.mock.calls[1]?.[0];

    expect(stdioCall).toMatchObject({
      transportType: McpTransportType.STDIO, serverId: "stdio-serv-1", command: "node", args: ["index.js"], toolNamePrefix: "stdio1", env: [],
    });
    expect(httpCall).toMatchObject({
      transportType: McpTransportType.STREAMABLE_HTTP, serverId: "http-serv-1", url: "http://localhost:8000", toolNamePrefix: "http1", headers: [], token: null,
    });
  });

  it("handles partial failure during import", async () => {
    const service = new McpConfigService();
    const configureSpy = vi
      .spyOn(service, "configureMcpServer")
      .mockResolvedValue({} as any);

    const result = await service.importMcpServerConfigs(PARTIAL_FAILURE_JSON_IMPORT_STRING);

    expect(result).toMatchObject({ imported_count: 1, failed_count: 1 });
    expect(result.failures).toEqual([{ server_id: "invalid-server-no-command", reason: expect.stringContaining("'command' must be a non-empty string") }]);
    expect(configureSpy).toHaveBeenCalledTimes(1);

    const validCall = configureSpy.mock.calls[0]?.[0];
    expect(validCall).toMatchObject({ transportType: McpTransportType.STDIO, serverId: "valid-server" });
  });

  it("throws for malformed JSON", async () => {
    const service = new McpConfigService();
    await expect(service.importMcpServerConfigs('{"mcpServers": {"key": "value",}}')).rejects.toThrow();
  });

  it("throws for invalid structure", async () => {
    const service = new McpConfigService();
    await expect(service.importMcpServerConfigs('{"servers": {}}')).rejects.toThrow(
      "JSON must contain a top-level 'mcpServers' object.",
    );
  });

  it("returns zero counts for empty configs", async () => {
    const service = new McpConfigService();
    const configureSpy = vi
      .spyOn(service, "configureMcpServer")
      .mockResolvedValue({} as any);

    const result = await service.importMcpServerConfigs('{"mcpServers": {}}');

    expect(result).toEqual({ imported_count: 0, failed_count: 0, failures: [], stored_secrets: [], needs_secret: [] });
    expect(configureSpy).not.toHaveBeenCalled();
  });

  it("accepts camelCase transportType/toolNamePrefix", async () => {
    const service = new McpConfigService();
    const configureSpy = vi
      .spyOn(service, "configureMcpServer")
      .mockResolvedValue({} as any);

    const result = await service.importMcpServerConfigs(CAMEL_CASE_JSON_IMPORT_STRING);

    expect(result).toEqual({ imported_count: 1, failed_count: 0, failures: [], stored_secrets: [], needs_secret: [] });
    expect(configureSpy).toHaveBeenCalledTimes(1);

    const call = configureSpy.mock.calls[0]?.[0];
    expect(call).toMatchObject({ transportType: McpTransportType.STDIO, serverId: "camel-server", command: "node", toolNamePrefix: "camel" });
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

    const result = await service.importMcpServerConfigs(json);

    expect(result.imported_count).toBe(1);
    expect(result.failed_count).toBe(4);
    expect(configureSpy).toHaveBeenCalledTimes(1);
    expect(configureSpy.mock.calls[0]?.[0]).toMatchObject({ transportType: McpTransportType.STDIO, serverId: "ok" });
    expect(result.stored_secrets).toEqual([{ serverId: "ok", field: "env:API_KEY" }]);
    expect(result.failures).toEqual([
      { server_id: "bad", reason: "Invalid 'transport_type' string 'websocket' for server 'bad'. Valid types are: stdio, streamable_http." },
      { server_id: "empty", reason: "Config for server 'empty' needs 'command' (stdio) or 'url' (streamable_http), or an explicit 'transport_type'." },
      { server_id: "both", reason: expect.stringContaining("sets both 'token' and an 'Authorization' header") },
      { server_id: "notObject", reason: "Configuration for server 'notObject' must be a dictionary." },
    ]);
    expect(JSON.stringify(result)).not.toMatch(/test-dummy-[a-z]+-secret/);
  });

  it("stores always-secret values and values the rule matches as secrets, and lists them", async () => {
    const service = new McpConfigService();
    const configureSpy = vi.spyOn(service, "configureMcpServer").mockResolvedValue({} as any);
    const json = JSON.stringify({
      mcpServers: {
        local: { command: "node", env: { GITHUB_TOKEN: "test-dummy-env-secret", PLAIN_SETTING: "ghp_TESTDUMMYPREFIX", LOG_LEVEL: "debug", EMPTY_KEY: "" } },
        remote: { url: "http://127.0.0.1:9000/mcp", headers: { Authorization: "Bearer test-dummy-header-secret", "X-Toolsets": "repos" } },
        tokened: { url: "http://127.0.0.1:9001/mcp", token: "test-dummy-token-secret" },
      },
    });

    const result = await service.importMcpServerConfigs(json);

    expect(result).toMatchObject({ imported_count: 3, failed_count: 0, failures: [] });
    expect(result.stored_secrets).toEqual([
      { serverId: "local", field: "env:GITHUB_TOKEN" },
      { serverId: "local", field: "env:PLAIN_SETTING" },
      { serverId: "remote", field: "header:Authorization" },
      { serverId: "tokened", field: "token" },
    ]);
    const [local, remote, tokened] = configureSpy.mock.calls.map((call) => call[0]) as any[];
    expect(local.env.map((entry: any) => [entry.name, entry.value.kind])).toEqual([
      ["GITHUB_TOKEN", "newSecret"], ["PLAIN_SETTING", "newSecret"], ["LOG_LEVEL", "plain"], ["EMPTY_KEY", "plain"],
    ]);
    expect(remote.headers.map((entry: any) => [entry.name, entry.value.kind])).toEqual([["Authorization", "newSecret"], ["X-Toolsets", "plain"]]);
    expect(tokened.token.kind).toBe("newSecret");
    // A new secret value stays wrapped: drafts never serialize it.
    expect(JSON.stringify(configureSpy.mock.calls)).not.toMatch(/test-dummy-[a-z]+-secret|ghp_TESTDUMMYPREFIX/);
  });

  it("imports a foreign secret reference as needing a secret, and keeps the server's own reference at a field that holds one", async () => {
    const service = new McpConfigService();
    const configureSpy = vi.spyOn(service, "configureMcpServer").mockResolvedValue({} as any);
    // "mine" exists here and holds its own reference at env:API_KEY; "copied" does not exist here.
    const saved = new StdioMcpServerConfig({
      server_id: "mine", command: "node",
      env: { API_KEY: { vaultSecretId: secretId("mcp.00000000-0000-4000-8000-0000000000aa") }, LOG_LEVEL: "debug" },
    });
    (service as any).provider.getByServerId.mockImplementation(async (id: string) => (id === "mine" ? saved : null));
    const json = JSON.stringify({
      mcpServers: {
        copied: { command: "node", env: { API_KEY: { vaultSecretId: "mcp.00000000-0000-4000-8000-000000000001" } } },
        mine: { command: "node", env: {
          API_KEY: { vaultSecretId: "mcp.00000000-0000-4000-8000-0000000000bb" },
          LOG_LEVEL: { vaultSecretId: "mcp.00000000-0000-4000-8000-0000000000cc" },
        } },
      },
    });

    const result = await service.importMcpServerConfigs(json);

    expect(result).toEqual({
      imported_count: 2, failed_count: 0, failures: [], stored_secrets: [],
      needs_secret: [{ serverId: "copied", field: "env:API_KEY" }, { serverId: "mine", field: "env:LOG_LEVEL" }],
    });
    const [copied, mine] = configureSpy.mock.calls.map((call) => call[0]) as any[];
    expect(copied.env).toEqual([{ name: "API_KEY", value: { kind: "missingSecret" } }]);
    // The server keeps its own reference whatever the import carries; a field that holds a plain value here does not.
    expect(mine.env).toEqual([{ name: "API_KEY", value: { kind: "keep" } }, { name: "LOG_LEVEL", value: { kind: "missingSecret" } }]);
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
      storedSecrets: [],
      needsSecret: [],
    });
  });

  it.each([
    ["malformed JSON", '{"mcpServers": {"key": "value",}}'],
    ["a missing mcpServers object", '{"servers": {}}'],
  ])("reports %s as before, with an empty failure list", async (_label, json) => {
    const result = await new McpServerResolver().importMcpServerConfigs(json);
    expect(result).toMatchObject({ success: false, importedCount: 0, failedCount: 0, failures: [], storedSecrets: [], needsSecret: [] });
    expect(result.message).toBeTruthy();
  });
});
