/**
 * The GraphQL MCP mapping: input rows → server draft (shape only), and a saved server with its states → output
 * entries that never carry a secret value (not even an always-secret field stored plain). Dummy values only.
 */
import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { secretId } from "autobyteus-ts/secrets/vault/secret-id.js";
import { StdioMcpServerConfig, StreamableHttpMcpServerConfig, type McpSecretField } from "autobyteus-ts/tools/mcp/types.js";
import { McpServerInputMapper } from "../../../../../src/api/graphql/converters/mcp-server-input-mapper.js";
import { McpServerConverter } from "../../../../../src/api/graphql/converters/mcp-server-converter.js";
import { McpTransportTypeEnum } from "../../../../../src/api/graphql/types/mcp-server-config.js";
import type { McpSecretState } from "../../../../../src/mcp-server-management/domain/mcp-server-view.js";

const REF = { vaultSecretId: secretId("mcp.00000000-0000-4000-8000-0000000000a1") };
const httpInput = (streamableHttpConfig: Record<string, unknown>) => ({
  serverId: "remote", transportType: McpTransportTypeEnum.STREAMABLE_HTTP,
  streamableHttpConfig: { url: "http://127.0.0.1:9000/mcp", ...streamableHttpConfig },
}) as never;

describe("McpServerInputMapper.toDraft", () => {
  it("maps rows to plain, new secret and keep, forcing secret for an Authorization header", () => {
    const draft = McpServerInputMapper.toDraft(httpInput({
      headers: [
        { name: "Authorization", secret: false, value: "Bearer test-dummy-header-secret" },
        { name: "X-Api-Key", secret: true },
        { name: "X-Toolsets", secret: false, value: "repos" },
      ],
      token: null,
    }));

    expect(draft).toMatchObject({ serverId: "remote", enabled: true, toolNamePrefix: null, url: "http://127.0.0.1:9000/mcp", token: null });
    const headers = (draft as { headers: Array<{ name: string; value: { kind: string; value?: unknown } }> }).headers;
    expect(headers.map((entry) => [entry.name, entry.value.kind])).toEqual([["Authorization", "newSecret"], ["X-Api-Key", "keep"], ["X-Toolsets", "plain"]]);
    expect(headers[0]?.value.value?.toString()).toBe("<redacted-secret>");
    expect(JSON.stringify(draft)).not.toContain("test-dummy-header-secret");
  });

  it.each([
    [{ value: "test-dummy-token-secret" }, "newSecret"],
    [{ keep: true }, "keep"],
  ])("maps the token input %j to %s", (token, kind) => {
    expect((McpServerInputMapper.toDraft(httpInput({ token })) as { token: { kind: string } }).token.kind).toBe(kind);
  });

  it.each([
    [{ value: "test-dummy-token-secret", keep: true }],
    [{}],
  ])("refuses a token input with both or neither (%j)", (token) => {
    expect(() => McpServerInputMapper.toDraft(httpInput({ token }))).toThrow(
      "MCP server 'remote' token: give either a value or keep, not both or neither.",
    );
  });

  it("refuses a plain row without a value", () => {
    expect(() => McpServerInputMapper.toDraft({
      serverId: "local", transportType: McpTransportTypeEnum.STDIO, stdioConfig: { command: "node", env: [{ name: "LOG_LEVEL", secret: false }] },
    } as never)).toThrow("MCP server 'local' env:LOG_LEVEL needs a value.");
  });

  it("parses move selections and refuses anything that is not a field", () => {
    expect(McpServerInputMapper.toFields([{ serverId: "a", field: "env:API_KEY" }, { serverId: "b", field: "token" }]))
      .toEqual([{ serverId: "a", field: "env:API_KEY" }, { serverId: "b", field: "token" }]);
    expect(() => McpServerInputMapper.toFields([{ serverId: "a", field: "API_KEY" }])).toThrow("'API_KEY' is not an MCP server field");
  });
});

describe("McpServerConverter.toGraphql", () => {
  const view = (config: StdioMcpServerConfig | StreamableHttpMcpServerConfig, states: Array<[McpSecretField, McpSecretState]>) =>
    ({ config, states: new Map(states) });

  it("returns plain settings, and only states for secrets and always-secret fields stored plain", () => {
    const http = new StreamableHttpMcpServerConfig({
      server_id: "github-remote", url: "https://example.invalid/mcp",
      headers: { Authorization: "Bearer test-dummy-header-secret", "X-Api-Key": REF, "X-Toolsets": "repos,issues" },
    });

    expect(McpServerConverter.toGraphql(view(http, [
      ["header:Authorization", "PLAIN"], ["header:X-Api-Key", "MISSING"], ["header:X-Toolsets", "PLAIN"],
    ]))).toEqual({
      serverId: "github-remote", transportType: McpTransportTypeEnum.STREAMABLE_HTTP, enabled: true, toolNamePrefix: null,
      url: "https://example.invalid/mcp", tokenState: null,
      headers: [
        { name: "Authorization", value: null, state: "PLAIN" },
        { name: "X-Api-Key", value: null, state: "MISSING" },
        { name: "X-Toolsets", value: "repos,issues", state: "PLAIN" },
      ],
    });
  });

  it("returns the token's state, never its value, and reports a reference without a state as MISSING", () => {
    const tokened = new StreamableHttpMcpServerConfig({ server_id: "t", url: "https://example.invalid/mcp", token: "test-dummy-token-secret" });
    expect(McpServerConverter.toGraphql(view(tokened, [["token", "PLAIN"]]))).toMatchObject({ tokenState: "PLAIN" });
    expect(JSON.stringify(McpServerConverter.toGraphql(view(tokened, [["token", "PLAIN"]])))).not.toContain("test-dummy-token-secret");

    const stdio = new StdioMcpServerConfig({ server_id: "s", command: "node", env: { API_KEY: REF, LOG_LEVEL: "debug" } });
    expect(McpServerConverter.toGraphql(view(stdio, []))).toMatchObject({
      env: [{ name: "API_KEY", value: null, state: "MISSING" }, { name: "LOG_LEVEL", value: "debug", state: "PLAIN" }],
    });
  });
});
