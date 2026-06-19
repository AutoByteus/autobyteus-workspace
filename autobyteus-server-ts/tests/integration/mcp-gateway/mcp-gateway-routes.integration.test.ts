import fs from "node:fs/promises";
import path from "node:path";
import fastify from "fastify";
import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { McpConfigService } from "autobyteus-ts/tools/mcp/config-service.js";
import { McpServerInstanceManager } from "autobyteus-ts/tools/mcp/server-instance-manager.js";
import { StdioMcpServerConfig } from "autobyteus-ts/tools/mcp/types.js";
import { McpToolRegistrar } from "autobyteus-ts/tools/mcp/tool-registrar.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { registerMcpGatewayRoutes } from "../../../src/mcp-gateway/mcp-gateway-routes.js";
import { McpGatewayAccessGate } from "../../../src/mcp-gateway/mcp-gateway-access.js";
import { McpGatewayMethodDispatcher } from "../../../src/mcp-gateway/mcp-gateway-method-dispatcher.js";
import { McpGatewayToolCatalog } from "../../../src/mcp-gateway/mcp-gateway-tool-catalog.js";
import { McpGatewayToolExecutor, MCP_GATEWAY_EXECUTION_SCOPE_ID } from "../../../src/mcp-gateway/mcp-gateway-tool-executor.js";

type CallRecord = {
  agentId: string | null;
  args: Record<string, unknown>;
};

class FakeMcpTool extends BaseTool<unknown, Record<string, unknown>, unknown> {
  constructor(private readonly calls: CallRecord[]) {
    super();
  }
  static getDescription(): string { return "Fake MCP tool"; }
  static getArgumentSchema(): ParameterSchema | null { return new ParameterSchema(); }
  protected async _execute(context: unknown, args: Record<string, unknown> = {}): Promise<unknown> {
    this.calls.push({
      agentId: typeof (context as { agentId?: unknown })?.agentId === "string"
        ? (context as { agentId: string }).agentId
        : null,
      args,
    });
    return {
      content: [{ type: "text", text: `rows for ${String(args.sql ?? "")}` }],
      structuredContent: { ok: true },
      _meta: { remoteToolName: "query" },
    };
  }
}

class BlockedLocalTool extends BaseTool {
  static getDescription(): string { return "Internal local tool"; }
  static getArgumentSchema(): ParameterSchema | null { return new ParameterSchema(); }
  protected async _execute(): Promise<unknown> {
    throw new Error("Local tool executor must not be reached by MCP gateway.");
  }
}

class FakeToolRegistry {
  private readonly definitions = new Map<string, ToolDefinition>();
  register(definition: ToolDefinition): void { this.definitions.set(definition.name, definition); }
  listTools(): ToolDefinition[] { return Array.from(this.definitions.values()); }
  getToolDefinition(name: string): ToolDefinition | undefined { return this.definitions.get(name); }
  createTool(name: string): BaseTool {
    const definition = this.definitions.get(name);
    if (!definition) {
      throw new Error(`No definition for ${name}`);
    }
    const tool = definition.customFactory!();
    tool.definition = definition;
    return tool;
  }
}

const buildMcpDefinition = (name: string, serverId: string, calls: CallRecord[]) => new ToolDefinition(
  name,
  `Description for ${name}`,
  ToolOrigin.MCP,
  "MCP",
  () => new ParameterSchema(),
  () => null,
  { customFactory: () => new FakeMcpTool(calls), metadata: { mcp_server_id: serverId } },
);

const buildLocalDefinition = (name: string) => new ToolDefinition(
  name,
  `Description for ${name}`,
  ToolOrigin.LOCAL,
  "Local",
  () => new ParameterSchema(),
  () => null,
  { customFactory: () => new BlockedLocalTool() },
);

describe("MCP gateway route", () => {
  it("delegates calls through an actual configured stdio MCP server", async () => {
    await resetDefaultMcpState();
    const fixtureDir = await fs.mkdtemp(path.join(process.cwd(), "tests", ".tmp", "gateway-stdio-mcp-"));
    const fixtureScript = path.join(fixtureDir, "server.mjs");
    await fs.writeFile(fixtureScript, `
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "gateway-real-stdio-fixture", version: "0.0.1" });
server.registerTool(
  "echo",
  {
    description: "Echoes through a real configured stdio MCP server.",
    inputSchema: { message: z.string() },
  },
  async ({ message }) => ({
    content: [{ type: "text", text: \`remote:\${message}\` }],
    structuredContent: { echoed: message },
  }),
);

await server.connect(new StdioServerTransport());
`, "utf8");

    const registrar = McpToolRegistrar.getInstance();
    await registrar.registerServer(new StdioMcpServerConfig({
      server_id: "gateway-real-stdio-fixture",
      command: "node",
      args: [fixtureScript],
      cwd: process.cwd(),
      enabled: true,
      tool_name_prefix: "real",
    }));
    defaultToolRegistry.registerTool(buildLocalDefinition("send_message_to"));
    defaultToolRegistry.registerTool(buildLocalDefinition("publish_artifacts"));

    const app = fastify();
    await registerMcpGatewayRoutes(app);
    await app.ready();
    await app.listen({ host: "127.0.0.1", port: 0 });
    const gatewayAddress = app.server.address();
    if (!gatewayAddress || typeof gatewayAddress === "string") {
      throw new Error("Expected gateway app to listen on a loopback TCP port.");
    }

    const sdkClient = new Client({ name: "autobyteus-mcp-gateway-real-http-probe", version: "0.0.1" });
    const gatewayTransport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${gatewayAddress.port}/mcp/gateway`),
    );

    try {
      await sdkClient.connect(gatewayTransport);
      const tools = await sdkClient.listTools();
      expect(tools.tools.map((tool) => tool.name)).toEqual(["real_echo"]);
      expect(JSON.stringify(tools)).not.toContain("send_message_to");
      expect(JSON.stringify(tools)).not.toContain("publish_artifacts");

      await expect(sdkClient.callTool({
        name: "real_echo",
        arguments: { message: "hello-gateway" },
      })).resolves.toMatchObject({
        content: [{ type: "text", text: "remote:hello-gateway" }],
        structuredContent: { echoed: "hello-gateway" },
      });
    } finally {
      await sdkClient.close();
      await app.close();
      await resetDefaultMcpState();
      await fs.rm(fixtureDir, { recursive: true, force: true });
    }
  }, 30000);

  it("exposes and calls only MCP-origin tools over the official Streamable HTTP client", async () => {
    const app = fastify();
    const calls: CallRecord[] = [];
    const registry = new FakeToolRegistry();
    registry.register(buildMcpDefinition("db_query", "sqlite", calls));
    registry.register(buildLocalDefinition("send_message_to"));
    const catalog = new McpGatewayToolCatalog({ registry: registry as any });
    const dispatcher = new McpGatewayMethodDispatcher({
      catalog,
      toolExecutor: new McpGatewayToolExecutor({ catalog }),
    });
    await registerMcpGatewayRoutes(app, {
      dispatcher,
      accessGate: new McpGatewayAccessGate({ readConfiguredToken: () => null }),
    });
    await app.ready();
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected Fastify to listen on a loopback TCP port.");
    }
    const sdkClient = new Client({ name: "autobyteus-mcp-gateway-sdk-probe", version: "0.0.1" });
    const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp/gateway`));

    try {
      await sdkClient.connect(transport);
      const tools = await sdkClient.listTools();
      expect(tools.tools).toEqual([
        expect.objectContaining({
          name: "db_query",
          description: "Description for db_query",
          inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
        }),
      ]);

      await expect(sdkClient.callTool({
        name: "db_query",
        arguments: { sql: "select 1" },
      })).resolves.toMatchObject({
        content: [{ type: "text", text: "rows for select 1" }],
        structuredContent: { ok: true },
        _meta: { remoteToolName: "query" },
      });
      expect(calls).toEqual([{ agentId: MCP_GATEWAY_EXECUTION_SCOPE_ID, args: { sql: "select 1" } }]);

      const internalCall = await app.inject({
        method: "POST",
        url: "/mcp/gateway",
        headers: { "content-type": "application/json", accept: "application/json" },
        payload: JSON.stringify({
          jsonrpc: "2.0",
          id: "blocked-local",
          method: "tools/call",
          params: { name: "send_message_to", arguments: {} },
        }),
      });
      expect(internalCall.statusCode).toBe(200);
      expect(internalCall.json()).toMatchObject({ error: { code: -32602, message: "Unknown MCP tool" } });
      expect(calls).toHaveLength(1);
    } finally {
      await sdkClient.close();
      await app.close();
    }
  });

  it("keeps no-token mode local-only by rejecting remote-style requests without Origin headers", async () => {
    const app = fastify();
    const calls: CallRecord[] = [];
    const registry = new FakeToolRegistry();
    registry.register(buildMcpDefinition("db_query", "sqlite", calls));
    const catalog = new McpGatewayToolCatalog({ registry: registry as any });
    await registerMcpGatewayRoutes(app, {
      accessGate: new McpGatewayAccessGate({ readConfiguredToken: () => null }),
      dispatcher: new McpGatewayMethodDispatcher({
        catalog,
        toolExecutor: new McpGatewayToolExecutor({ catalog }),
      }),
    });
    await app.ready();

    const remoteNoOrigin = await app.inject({
      method: "POST",
      url: "/mcp/gateway",
      remoteAddress: "203.0.113.10",
      headers: { host: "autobyteus.example:8000", "content-type": "application/json", accept: "application/json" },
      payload: JSON.stringify({ jsonrpc: "2.0", id: "remote-list", method: "tools/list", params: {} }),
    });
    expect(remoteNoOrigin.statusCode).toBe(401);
    expect(remoteNoOrigin.json()).toMatchObject({ error: "unauthorized" });
    expect(remoteNoOrigin.body).not.toContain("db_query");

    const loopbackIpWithRemoteHost = await app.inject({
      method: "POST",
      url: "/mcp/gateway",
      remoteAddress: "127.0.0.1",
      headers: { host: "autobyteus.example:8000", "content-type": "application/json", accept: "application/json" },
      payload: JSON.stringify({ jsonrpc: "2.0", id: "remote-host", method: "tools/call", params: { name: "db_query", arguments: {} } }),
    });
    expect(loopbackIpWithRemoteHost.statusCode).toBe(401);
    expect(calls).toEqual([]);

    await app.close();
  });

  it("rejects missing or invalid bearer auth when a gateway token is configured", async () => {
    const app = fastify();
    await registerMcpGatewayRoutes(app, {
      accessGate: new McpGatewayAccessGate({ readConfiguredToken: () => "gateway-secret" }),
      dispatcher: new McpGatewayMethodDispatcher({ catalog: new McpGatewayToolCatalog({ registry: new FakeToolRegistry() as any }) }),
    });
    await app.ready();

    const payload = JSON.stringify({ jsonrpc: "2.0", id: "ping", method: "ping", params: {} });
    const missing = await app.inject({
      method: "POST",
      url: "/mcp/gateway",
      headers: { "content-type": "application/json", accept: "application/json" },
      payload,
    });
    expect(missing.statusCode).toBe(401);

    const wrong = await app.inject({
      method: "POST",
      url: "/mcp/gateway",
      headers: { authorization: "Bearer wrong", "content-type": "application/json", accept: "application/json" },
      payload,
    });
    expect(wrong.statusCode).toBe(401);

    const valid = await app.inject({
      method: "POST",
      url: "/mcp/gateway",
      remoteAddress: "203.0.113.10",
      headers: { authorization: "Bearer gateway-secret", host: "autobyteus.example:8000", "content-type": "application/json", accept: "application/json" },
      payload,
    });
    expect(valid.statusCode).toBe(200);
    expect(valid.json()).toMatchObject({ result: {} });
    expect(JSON.stringify(valid.json())).not.toContain("gateway-secret");

    await app.close();
  });
});

const resetDefaultMcpState = async (): Promise<void> => {
  try {
    await McpServerInstanceManager.getInstance().cleanupAllMcpServerInstances();
  } catch {
    // Best-effort cleanup for singleton state that may not have been initialized yet.
  }
  defaultToolRegistry.clear();
  try {
    McpConfigService.getInstance().clearConfigs();
  } catch {
    // Best-effort cleanup for singleton state that may not have been initialized yet.
  }
  (McpToolRegistrar as unknown as { instance?: McpToolRegistrar }).instance = undefined;
  (McpServerInstanceManager as unknown as { instance?: McpServerInstanceManager }).instance = undefined;
  (McpConfigService as unknown as { instance?: McpConfigService }).instance = undefined;
};
