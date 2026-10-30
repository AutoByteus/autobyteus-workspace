import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../../src/agent-communication/services/send-message-to-tool-contract.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { registerAgentToolsMcpRoutes } from "../../../../src/agent-tools/mcp/agent-tools-mcp-routes.js";
import { AgentToolMcpSessionRegistry } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionService } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { AgentToolsMcpMethodDispatcher } from "../../../../src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.js";
import { AgentToolMcpToolExecutor } from "../../../../src/agent-tools/mcp/agent-tool-mcp-tool-executor.js";
import { AgentToolsMcpLocalAccessGate } from "../../../../src/agent-tools/mcp/agent-tools-mcp-local-access.js";
import { AgentToolsMcpSessionStreams } from "../../../../src/agent-tools/mcp/agent-tools-mcp-session-streams.js";
import { toAgentToolMcpOperationResult } from "../../../../src/agent-tools/mcp/agent-tool-mcp-adapter.js";
import { PublishArtifactsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/publish-artifacts-mcp-adapter-provider.js";
import { PUBLISH_ARTIFACTS_TOOL_NAME } from "../../../../src/services/published-artifacts/published-artifact-tool-contract.js";
import { PublishedArtifactPublicationService } from "../../../../src/services/published-artifacts/published-artifact-publication-service.js";
import { PublishedArtifactProjectionStore } from "../../../../src/services/published-artifacts/published-artifact-projection-store.js";
import { PublishedArtifactSnapshotStore } from "../../../../src/services/published-artifacts/published-artifact-snapshot-store.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";

const sender = buildAgentRunMessageSenderContext({
  senderRunId: "mcp-sender-run",
  senderName: "sender",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

const requestHeaders = (extra: Record<string, string> = {}): Record<string, string> => ({
  "content-type": "application/json",
  accept: "application/json",
  ...extra,
});

const sessionUrl = (sessionId: string): string => "/mcp/agent-tools/" + sessionId;

type HttpExchange = { rpcMethod: string | null; status: number };

/** A test-owned fetch for the SDK transport that records each POST's JSON-RPC method and HTTP status. */
const recordingFetch = (exchanges: HttpExchange[]): typeof fetch => async (input, init) => {
  const response = await fetch(input, init);
  if (init?.method === "POST" && typeof init.body === "string") {
    const body = JSON.parse(init.body) as { method?: unknown };
    exchanges.push({ rpcMethod: typeof body.method === "string" ? body.method : null, status: response.status });
  }
  return response;
};

const registerRoutes = async (
  app: FastifyInstance,
  registry: AgentToolMcpSessionRegistry,
  dispatcher: AgentToolsMcpMethodDispatcher,
  streams: AgentToolsMcpSessionStreams = new AgentToolsMcpSessionStreams(),
): Promise<AgentToolsMcpSessionStreams> => {
  await registerAgentToolsMcpRoutes(app, {
    registry,
    dispatcher,
    localAccessGate: new AgentToolsMcpLocalAccessGate(),
    streams,
  });
  // Held GET streams keep Fastify from closing; the product host ends them first.
  app.addHook("preClose", async () => streams.closeAll());
  return streams;
};

const activateSession = (
  registry: AgentToolMcpSessionRegistry,
  runId: string,
  enabledTools: string[],
) => registry.activateSession({
  owner: { runId },
  sender,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  runtimeExposure: buildRuntimeAgentToolExposure(enabledTools),
  executionContext: {},
  executionCapabilities: {
    kind: "agent",
    publishedArtifactPublisher: { publishManyForRun: vi.fn(async () => []) },
    applicationAgentTools: null,
  },
  enabledTools,
  toolRoutes: Object.fromEntries(enabledTools.map((toolName) => [
    toolName,
    { kind: "static_adapter", toolName },
  ])) as never,
});

type ConfiguredMcpCall = {
  agentId: string | null;
  args: Record<string, unknown>;
};

class FakeConfiguredMcpTool extends BaseTool<unknown, Record<string, unknown>, unknown> {
  constructor(private readonly calls: ConfiguredMcpCall[]) {
    super();
  }

  static getDescription(): string { return "Fake configured MCP tool"; }
  static getArgumentSchema(): ParameterSchema | null { return new ParameterSchema(); }

  protected async _execute(context: unknown, args: Record<string, unknown> = {}): Promise<unknown> {
    this.calls.push({
      agentId: typeof (context as { agentId?: unknown })?.agentId === "string"
        ? (context as { agentId: string }).agentId
        : null,
      args,
    });
    if (args.mode === "error") {
      return {
        content: [{ type: "text", text: "remote failure" }],
        isError: true,
        structuredContent: { code: "REMOTE_FAILURE" },
        _meta: { traceId: "trace-safe" },
      };
    }
    return {
      content: [{ type: "text", text: "rows for " + String(args.sql ?? "") }],
      structuredContent: { rows: [{ value: 1 }] },
      _meta: { remoteToolName: "query" },
    };
  }
}

const buildMcpDefinition = (
  name: string,
  serverId: string,
  calls: ConfiguredMcpCall[],
): ToolDefinition => new ToolDefinition(
  name,
  "Description for " + name,
  ToolOrigin.MCP,
  "MCP",
  () => new ParameterSchema(),
  () => null,
  {
    customFactory: () => new FakeConfiguredMcpTool(calls),
    metadata: { mcp_server_id: serverId },
  },
);

class FakeToolRegistry {
  private readonly definitions = new Map<string, ToolDefinition>();
  register(definition: ToolDefinition): void { this.definitions.set(definition.name, definition); }
  getToolDefinition(name: string): ToolDefinition | undefined { return this.definitions.get(name); }
  createTool(name: string): BaseTool {
    const definition = this.definitions.get(name);
    if (!definition) throw new Error("No definition for " + name);
    const tool = definition.customFactory!();
    tool.definition = definition;
    return tool;
  }
}

describe("Agent Tools MCP tokenless route integration", () => {
  let app: FastifyInstance;
  let registry: AgentToolMcpSessionRegistry;
  let executeAgentToolMcpCall: ReturnType<typeof vi.fn>;
  let enabledSessionId: string;
  let unconfiguredSessionId: string;

  beforeEach(async () => {
    app = fastify();
    registry = new AgentToolMcpSessionRegistry();
    executeAgentToolMcpCall = vi.fn(async ({ rawArguments }: { rawArguments: Record<string, unknown> }) => {
      if (rawArguments.fail) {
        return toAgentToolMcpOperationResult({
          accepted: false,
          code: "INVALID_TOOL_ARGUMENTS",
          message: "Validation failed.",
        });
      }
      return toAgentToolMcpOperationResult({
        accepted: true,
        code: "DELIVERED",
        message: "Delivered via MCP.",
      });
    });
    const dispatcher = new AgentToolsMcpMethodDispatcher({
      catalog: new AgentToolMcpCatalog(),
      toolExecutor: { executeAgentToolMcpCall } as unknown as AgentToolMcpToolExecutor,
    });
    await registerRoutes(app, registry, dispatcher);
    await app.ready();
    enabledSessionId = activateSession(
      registry,
      "owner-send-message",
      [SEND_MESSAGE_TO_TOOL_NAME],
    ).sessionId;
    unconfiguredSessionId = activateSession(registry, "owner-none", []).sessionId;
  });

  afterEach(async () => {
    await app.close();
  });

  const post = (
    sessionId: string,
    payload: unknown,
    extraHeaders: Record<string, string> = {},
  ) => app.inject({
    method: "POST",
    url: sessionUrl(sessionId),
    headers: requestHeaders(extraHeaders),
    payload: JSON.stringify(payload),
  });

  it("serves headerless initialize, tools, resources, ping, notifications, SSE, and calls", async () => {
    const initialize = await post(enabledSessionId, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    });
    expect(initialize.statusCode).toBe(200);
    expect(initialize.json()).toMatchObject({
      result: {
        protocolVersion: "2025-03-26",
        capabilities: { tools: { listChanged: true } },
        serverInfo: { name: "autobyteus_agent_tools" },
      },
    });

    const tools = await post(enabledSessionId, {
      jsonrpc: "2.0",
      id: "tools",
      method: "tools/list",
      params: {},
    });
    expect(tools.json()).toMatchObject({
      result: {
        tools: [expect.objectContaining({ name: SEND_MESSAGE_TO_TOOL_NAME })],
      },
    });
    expect(tools.json().result.tools[0]).not.toHaveProperty("outputSchema");
    await expect(post(enabledSessionId, {
      jsonrpc: "2.0",
      id: 2,
      method: "resources/list",
      params: {},
    }).then((response) => response.json())).resolves.toMatchObject({ result: { resources: [] } });
    await expect(post(enabledSessionId, {
      jsonrpc: "2.0",
      id: 3,
      method: "resources/templates/list",
      params: {},
    }).then((response) => response.json())).resolves.toMatchObject({ result: { resourceTemplates: [] } });
    await expect(post(enabledSessionId, {
      jsonrpc: "2.0",
      id: 4,
      method: "ping",
      params: {},
    }).then((response) => response.json())).resolves.toMatchObject({ result: {} });

    const notification = await post(enabledSessionId, {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    });
    expect(notification.statusCode).toBe(202);

    const notAcceptable = await app.inject({
      method: "GET",
      url: sessionUrl(enabledSessionId),
      headers: { accept: "application/json" },
    });
    expect(notAcceptable.statusCode).toBe(406);

    const called = await post(enabledSessionId, {
      jsonrpc: "2.0",
      id: "call",
      method: "tools/call",
      params: {
        name: SEND_MESSAGE_TO_TOOL_NAME,
        arguments: { target_agent_run_id: "target-run", content: "hello" },
      },
    });
    expect(called.json()).toMatchObject({
      result: { content: [{ type: "text", text: "Delivered via MCP." }] },
    });
  });

  it.each(["2025-06-18", "2025-11-25"])(
    "advertises send_message_to outputSchema for negotiated MCP %s",
    async (protocolVersion) => {
      const tools = await post(enabledSessionId, {
        jsonrpc: "2.0",
        id: "tools-with-output",
        method: "tools/list",
        params: {},
      }, { "mcp-protocol-version": protocolVersion });

      expect(tools.statusCode).toBe(200);
      const [sendTool] = tools.json().result.tools;
      expect(sendTool.name).toBe(SEND_MESSAGE_TO_TOOL_NAME);
      expect(sendTool.outputSchema?.type).toBe("object");
      expect(sendTool.outputSchema?.oneOf).toEqual(expect.any(Array));
    },
  );

  it("is consumable by the official SDK over the real loopback listener without headers", async () => {
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected Fastify to listen on a loopback TCP port.");
    }
    const client = new Client({ name: "autobyteus-agent-tools-sdk-probe", version: "0.0.1" });
    const transport = new StreamableHTTPClientTransport(
      new URL("http://127.0.0.1:" + address.port + sessionUrl(enabledSessionId)),
    );
    try {
      await client.connect(transport);
      const listed = await client.listTools();
      expect(listed.tools).toHaveLength(1);
      const [sendTool] = listed.tools;
      expect(sendTool.name).toBe(SEND_MESSAGE_TO_TOOL_NAME);
      expect(sendTool.description).toContain("Send a self-contained request, result, question or blocker");
      expect(sendTool.description).not.toContain("ordinary message");
      expect(sendTool.inputSchema.properties).toMatchObject({
        content: { type: "string", description: expect.stringContaining("Self-contained work request, result, or specific blocker") },
        recipient_address: { type: "string", description: expect.stringContaining("An exact address beginning with '/'") },
        target_agent_run_id: { type: "string", description: expect.stringContaining("An agent's run id") },
      });
      expect(Object.keys(sendTool.inputSchema.properties ?? {}).sort()).toEqual([
        "content", "message_type", "recipient_address", "reference_files", "target_agent_run_id",
      ]);
      expect(sendTool.inputSchema.required).toEqual(["content"]);
      await expect(client.ping()).resolves.toEqual({});
      await expect(client.callTool({
        name: SEND_MESSAGE_TO_TOOL_NAME,
        arguments: { target_agent_run_id: "target-run", content: "hello-sdk" },
      })).resolves.toMatchObject({
        content: [{ type: "text", text: "Delivered via MCP." }],
      });
    } finally {
      await client.close();
    }
  });

  it("serves an SDK client in auto negotiation mode, which falls back to the 2025 handshake", async () => {
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected Fastify to listen on a loopback TCP port.");
    }
    const exchanges: HttpExchange[] = [];
    const client = new Client(
      { name: "autobyteus-agent-tools-auto-probe", version: "0.0.1" },
      { versionNegotiation: { mode: "auto" } },
    );
    const transport = new StreamableHTTPClientTransport(
      new URL("http://127.0.0.1:" + address.port + sessionUrl(enabledSessionId)),
      { fetch: recordingFetch(exchanges) },
    );
    try {
      await client.connect(transport);
      expect(client.getProtocolEra()).toBe("legacy");
      // The route answers initialize with the version of the request's mcp-protocol-version header; the
      // initialize request has none, so the route's default 2025-03-26 is negotiated, as for every client today.
      expect(client.getNegotiatedProtocolVersion()).toBe("2025-03-26");
      expect(exchanges.slice(0, 2)).toEqual([
        { rpcMethod: "server/discover", status: 400 },
        { rpcMethod: "initialize", status: 200 },
      ]);

      const listed = await client.listTools();
      expect(listed.tools.map((tool) => tool.name)).toEqual([SEND_MESSAGE_TO_TOOL_NAME]);
      await expect(client.callTool({
        name: SEND_MESSAGE_TO_TOOL_NAME,
        arguments: { target_agent_run_id: "target-run", content: "hello-auto" },
      })).resolves.toMatchObject({
        content: [{ type: "text", text: "Delivered via MCP." }],
      });
    } finally {
      await client.close();
    }
  });

  it("admits locally before lookup, ignores arbitrary Authorization, and preserves protocol errors", async () => {
    const extraHeader = await post(enabledSessionId, {
      jsonrpc: "2.0",
      id: "extra-header",
      method: "ping",
      params: {},
    }, { authorization: "Bearer arbitrary-non-authority" });
    expect(extraHeader.statusCode).toBe(200);

    const invalidOrigin = await post(enabledSessionId, {
      jsonrpc: "2.0",
      id: "origin",
      method: "ping",
      params: {},
    }, { origin: "https://evil.example" });
    expect(invalidOrigin.statusCode).toBe(403);

    const nonLocalHostBeforeLookup = await post("missing-session", {
      jsonrpc: "2.0",
      id: "host",
      method: "ping",
      params: {},
    }, { host: "example.com" });
    expect(nonLocalHostBeforeLookup.statusCode).toBe(403);
    expect(nonLocalHostBeforeLookup.json()).toEqual({ error: "forbidden", message: "Forbidden" });

    const nonLocalPeerBeforeLookup = await app.inject({
      method: "POST",
      url: sessionUrl("missing-session"),
      headers: requestHeaders({ host: "127.0.0.1" }),
      remoteAddress: "192.0.2.10",
      payload: JSON.stringify({ jsonrpc: "2.0", id: "peer", method: "ping", params: {} }),
    });
    expect(nonLocalPeerBeforeLookup.statusCode).toBe(403);

    const inactive = await post("agtrun_missing", {
      jsonrpc: "2.0",
      id: "inactive",
      method: "ping",
      params: {},
    });
    expect(inactive.statusCode).toBe(404);
    expect(inactive.json()).toEqual({
      error: "session_unavailable",
      message: "Agent tool MCP session is unavailable.",
    });
    expect(inactive.body).not.toContain("agtrun_missing");

    const unsupported = await app.inject({
      method: "PATCH",
      url: sessionUrl(enabledSessionId),
    });
    expect(unsupported.statusCode).toBe(405);
    const inactiveUnsupported = await app.inject({
      method: "CONNECT",
      url: sessionUrl("agtrun_missing"),
    });
    expect(inactiveUnsupported.statusCode).toBe(404);

    const wrongContent = await app.inject({
      method: "POST",
      url: sessionUrl(enabledSessionId),
      headers: { "content-type": "text/plain" },
      payload: "{}",
    });
    expect(wrongContent.statusCode).toBe(415);
    const wrongAccept = await post(enabledSessionId, {
      jsonrpc: "2.0",
      id: "accept",
      method: "ping",
      params: {},
    }, { accept: "text/plain" });
    expect(wrongAccept.statusCode).toBe(406);
    const wrongProtocol = await post(enabledSessionId, {
      jsonrpc: "2.0",
      id: "protocol",
      method: "ping",
      params: {},
    }, { "mcp-protocol-version": "1999-01-01" });
    expect(wrongProtocol.statusCode).toBe(400);
    expect(wrongProtocol.json()).toMatchObject({ error: { code: -32600 } });
  });

  it("deletes inactive records, returns redacted 404, and reactivates the same route with fresh context", async () => {
    const first = registry.getSession(enabledSessionId);
    expect(first).not.toBeNull();
    expect(registry.deactivateSession(enabledSessionId)).toBe(true);
    expect(registry.listSessions()).toHaveLength(1);

    const dormant = await post(enabledSessionId, {
      jsonrpc: "2.0",
      id: "dormant",
      method: "ping",
      params: {},
    });
    expect(dormant.statusCode).toBe(404);
    expect(dormant.body).not.toContain(enabledSessionId);
    expect(executeAgentToolMcpCall).not.toHaveBeenCalled();

    const restored = activateSession(
      registry,
      "owner-send-message",
      [SEND_MESSAGE_TO_TOOL_NAME],
    );
    expect(restored.sessionId).toBe(enabledSessionId);
    expect(restored).not.toBe(first);
    const activeAgain = await post(restored.sessionId, {
      jsonrpc: "2.0",
      id: "active-again",
      method: "ping",
      params: {},
    });
    expect(activeAgain.statusCode).toBe(200);
  });

  it("preserves tool errors, malformed input handling, and local OPTIONS without Authorization CORS", async () => {
    const semanticFailure = await post(enabledSessionId, {
      jsonrpc: "2.0",
      id: "semantic",
      method: "tools/call",
      params: { name: SEND_MESSAGE_TO_TOOL_NAME, arguments: { fail: true } },
    });
    expect(semanticFailure.json()).toMatchObject({
      result: { isError: true, content: [{ type: "text", text: "Validation failed." }] },
    });

    const unknown = await post(enabledSessionId, {
      jsonrpc: "2.0",
      id: "unknown",
      method: "tools/call",
      params: { name: "missing_tool", arguments: {} },
    });
    expect(unknown.json()).toMatchObject({ error: { code: -32602 } });
    const unconfigured = await post(unconfiguredSessionId, {
      jsonrpc: "2.0",
      id: "unconfigured",
      method: "tools/call",
      params: { name: SEND_MESSAGE_TO_TOOL_NAME, arguments: {} },
    });
    expect(unconfigured.json()).toMatchObject({ error: { code: -32602 } });

    const malformed = await app.inject({
      method: "POST",
      url: sessionUrl(enabledSessionId),
      headers: requestHeaders(),
      payload: "{not json",
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toMatchObject({ error: { code: -32700 } });

    const options = await app.inject({
      method: "OPTIONS",
      url: sessionUrl(enabledSessionId),
      headers: { origin: "http://127.0.0.1:3000" },
    });
    expect(options.statusCode).toBe(204);
    expect(options.headers["access-control-allow-headers"]).not.toContain("authorization");
    const rejected = await app.inject({
      method: "OPTIONS",
      url: sessionUrl(enabledSessionId),
      headers: { origin: "https://evil.example" },
    });
    expect(rejected.statusCode).toBe(403);
  });
});

describe("Agent Tools MCP route-backed execution", () => {
  it("publishes artifacts through an active tokenless run without leaking route identity", async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-tools-mcp-publish-workspace-"));
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-tools-mcp-publish-memory-"));
    const runId = "run-agent-tools-mcp-publish";
    const artifactRelativePath = path.join("reports", "mcp-published-artifact.md");
    const artifactAbsolutePath = path.join(workspaceRoot, artifactRelativePath);
    const artifactBody = "# Route-backed artifact\n\nPublished through Agent Tools MCP.";
    await fs.mkdir(path.dirname(artifactAbsolutePath), { recursive: true });
    await fs.writeFile(artifactAbsolutePath, artifactBody, "utf8");

    const localEvents: Array<{ eventType: string; payload: Record<string, unknown> }> = [];
    const projectionStore = new PublishedArtifactProjectionStore();
    const snapshotStore = new PublishedArtifactSnapshotStore();
    const publicationService = new PublishedArtifactPublicationService({
      activeRunReader: {
        getActiveRun: vi.fn().mockReturnValue({
          runId,
          config: { memoryDir, workspaceId: "workspace-agent-tools-mcp-publish" },
          publishEvent: async (event: { eventType: string; payload: Record<string, unknown> }) => {
            localEvents.push(event);
          },
        }),
      } as never,
      workspaceManager: {
        getOrCreateWorkspace: vi.fn().mockResolvedValue({ getBasePath: () => workspaceRoot }),
      } as never,
      projectionStore,
      snapshotStore,
    });
    const catalog = new AgentToolMcpCatalog({ providers: [new PublishArtifactsMcpAdapterProvider()] });
    const app = fastify();
    const registry = new AgentToolMcpSessionRegistry();
    const dispatcher = new AgentToolsMcpMethodDispatcher({
      catalog,
      toolExecutor: new AgentToolMcpToolExecutor({ catalog }),
    });
    await registerRoutes(app, registry, dispatcher);
    await app.ready();
    const session = registry.activateSession({
      owner: { runId },
      sender,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      runtimeExposure: buildRuntimeAgentToolExposure([PUBLISH_ARTIFACTS_TOOL_NAME]),
      executionContext: { workingDirectory: workspaceRoot, memoryDir },
      executionCapabilities: {
        kind: "agent",
        publishedArtifactPublisher: publicationService,
        applicationAgentTools: null,
      },
      enabledTools: [PUBLISH_ARTIFACTS_TOOL_NAME],
      toolRoutes: {
        [PUBLISH_ARTIFACTS_TOOL_NAME]: {
          kind: "static_adapter",
          toolName: PUBLISH_ARTIFACTS_TOOL_NAME,
        },
      },
    });
    const post = (payload: unknown) => app.inject({
      method: "POST",
      url: sessionUrl(session.sessionId),
      headers: requestHeaders(),
      payload: JSON.stringify(payload),
    });

    try {
      const published = await post({
        jsonrpc: "2.0",
        id: "publish",
        method: "tools/call",
        params: {
          name: PUBLISH_ARTIFACTS_TOOL_NAME,
          arguments: {
            artifacts: [{ path: artifactRelativePath, description: "Route-backed publication" }],
          },
        },
      });
      expect(published.statusCode).toBe(200);
      const publishedBody = published.json() as {
        result: { content: Array<{ type: "text"; text: string }> };
      };
      const payload = JSON.parse(publishedBody.result.content[0]!.text) as {
        success: boolean;
        artifacts: Array<Record<string, unknown>>;
      };
      const canonicalPath = (await fs.realpath(artifactAbsolutePath)).replace(/\\/g, "/");
      expect(payload).toMatchObject({
        success: true,
        artifacts: [{ runId, path: canonicalPath, status: "available" }],
      });
      const projection = await projectionStore.readProjection(memoryDir);
      expect(projection.summaries).toEqual(payload.artifacts);
      await expect(snapshotStore.readRevisionText(
        memoryDir,
        projection.revisions[0]!.snapshotRelativePath,
      )).resolves.toBe(artifactBody);
      expect(localEvents).toHaveLength(1);
      expect(localEvents[0]).toMatchObject({ eventType: AgentRunEventType.ARTIFACT_PERSISTED });
      expect(JSON.stringify({ payload, localEvents, projection })).not.toContain(session.sessionId);
      expect(JSON.stringify(publishedBody)).not.toContain("Authorization");
    } finally {
      await app.close();
      await fs.rm(workspaceRoot, { recursive: true, force: true });
      await fs.rm(memoryDir, { recursive: true, force: true });
    }
  });

  it("exposes configured MCP-origin tools over the official headerless client", async () => {
    const app = fastify();
    const registry = new AgentToolMcpSessionRegistry();
    const calls: ConfiguredMcpCall[] = [];
    const toolRegistry = new FakeToolRegistry();
    toolRegistry.register(buildMcpDefinition("db_query", "sqlite", calls));
    const catalog = new AgentToolMcpCatalog({ adapters: [], registry: toolRegistry as never });
    const dispatcher = new AgentToolsMcpMethodDispatcher({
      catalog,
      toolExecutor: new AgentToolMcpToolExecutor({ catalog }),
    });
    const streams = await registerRoutes(app, registry, dispatcher);
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected Fastify to listen on a loopback TCP port.");
    }
    const service = new AgentToolMcpSessionService({
      registry,
      catalog,
      streams,
      getLocalBaseUrl: () => "http://127.0.0.1:" + address.port,
      executionCapabilities: {
        publishedArtifactPublisher: { publishManyForRun: vi.fn(async () => []) },
        applicationAgentTools: null,
      },
    });
    const activation = service.activateForRun({
      owner: { runId: "run-configured-mcp" },
      sender,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      runtimeExposure: buildRuntimeAgentToolExposure(["db_query"]),
    });
    if (activation.kind !== "active") throw new Error("Expected configured MCP activation.");
    expect(activation.descriptor).not.toHaveProperty("headers");

    const client = new Client({ name: "autobyteus-configured-mcp-sdk-probe", version: "0.0.1" });
    const transport = new StreamableHTTPClientTransport(new URL(activation.descriptor.serverUrl));
    try {
      await client.connect(transport);
      await expect(client.listTools()).resolves.toMatchObject({
        tools: [expect.objectContaining({ name: "db_query" })],
      });
      await expect(client.callTool({
        name: "db_query",
        arguments: { sql: "select 1" },
      })).resolves.toMatchObject({
        content: [{ type: "text", text: "rows for select 1" }],
        structuredContent: { rows: [{ value: 1 }] },
      });
      expect(calls).toEqual([{ agentId: "run-configured-mcp", args: { sql: "select 1" } }]);
      await expect(client.callTool({
        name: "db_query",
        arguments: { mode: "error" },
      })).resolves.toMatchObject({
        content: [{ type: "text", text: "remote failure" }],
        isError: true,
        structuredContent: { code: "REMOTE_FAILURE" },
      });
    } finally {
      await client.close();
      await app.close();
    }
  });
});

describe("Agent Tools MCP live tool list", () => {
  const toolAdapter = (name: string, calls: string[]) => ({
    definition: {
      name,
      description: `Tool ${name}`,
      inputSchema: { type: "object" as const, properties: {}, required: [] },
    },
    isAvailable: () => true,
    execute: async () => {
      calls.push(name);
      return toAgentToolMcpOperationResult({ accepted: true, code: "OK", message: `${name} ran` });
    },
  });

  const startServer = async () => {
    const calls: string[] = [];
    const app = fastify();
    const registry = new AgentToolMcpSessionRegistry();
    const catalog = new AgentToolMcpCatalog({
      adapters: [toolAdapter("alpha", calls), toolAdapter("beta", calls)],
    });
    const dispatcher = new AgentToolsMcpMethodDispatcher({
      catalog,
      toolExecutor: new AgentToolMcpToolExecutor({ catalog }),
    });
    const streams = await registerRoutes(app, registry, dispatcher);
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected Fastify to listen on a loopback TCP port.");
    }
    const baseUrl = "http://127.0.0.1:" + address.port;
    const service = new AgentToolMcpSessionService({
      registry,
      catalog,
      streams,
      getLocalBaseUrl: () => baseUrl,
      executionCapabilities: {
        publishedArtifactPublisher: { publishManyForRun: vi.fn(async () => []) },
        applicationAgentTools: null,
      },
    });
    return { app, registry, streams, service, calls, baseUrl };
  };

  /** Reads SSE text from a held GET stream until `predicate` holds or the timeout passes. */
  const openStreamReader = async (url: string) => {
    const controller = new AbortController();
    const response = await fetch(url, {
      headers: { accept: "text/event-stream" },
      signal: controller.signal,
    });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let ended = false;
    const readUntil = async (predicate: (text: string) => boolean, timeoutMs = 3_000) => {
      const deadline = Date.now() + timeoutMs;
      while (!predicate(text)) {
        if (ended) throw new Error(`Stream ended before the expected frame. Got: ${text}`);
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error(`Timed out waiting for a frame. Got: ${text}`);
        const chunk = await Promise.race([
          reader.read(),
          new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), remaining)),
        ]);
        if (chunk === "timeout") continue;
        if (chunk.done) {
          ended = true;
          continue;
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
      return text;
    };
    const waitForEnd = async (timeoutMs = 3_000) => {
      const deadline = Date.now() + timeoutMs;
      while (!ended) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error("Timed out waiting for the stream to end.");
        const chunk = await Promise.race([
          reader.read().catch(() => ({ done: true as const, value: undefined })),
          new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), remaining)),
        ]);
        if (chunk !== "timeout" && chunk.done) ended = true;
      }
    };
    return {
      response,
      readUntil,
      waitForEnd,
      close: () => controller.abort(),
    };
  };

  const LIST_CHANGED_FRAME =
    'event: message\ndata: {"jsonrpc":"2.0","method":"notifications/tools/list_changed"}\n\n';

  it("holds the GET stream and sends tools/list_changed when the run's tools are replaced", async () => {
    const { app, service, streams } = await startServer();
    try {
      const activation = service.activateForRun({
        owner: { runId: "run-live" },
        sender,
        runtimeExposure: buildRuntimeAgentToolExposure(["alpha"]),
      });
      const stream = await openStreamReader(activation.descriptor.serverUrl);
      expect(stream.response.status).toBe(200);
      expect(stream.response.headers.get("content-type")).toContain("text/event-stream");
      await stream.readUntil((text) => text.startsWith(": open\n\n"));
      expect(streams.countOpenStreams(activation.sessionId)).toBe(1);

      service.replaceForRun({
        runId: "run-live",
        runtimeExposure: buildRuntimeAgentToolExposure(["alpha", "beta"]),
      });
      await stream.readUntil((text) => text.includes(LIST_CHANGED_FRAME));

      stream.close();
      await vi.waitFor(() => expect(streams.countOpenStreams(activation.sessionId)).toBe(0));
    } finally {
      await app.close();
    }
  });

  it("sends keepalive comments on a held stream and ends it when the session closes", async () => {
    const app = fastify();
    const registry = new AgentToolMcpSessionRegistry();
    const catalog = new AgentToolMcpCatalog({ adapters: [] });
    const streams = await registerRoutes(
      app,
      registry,
      new AgentToolsMcpMethodDispatcher({ catalog, toolExecutor: new AgentToolMcpToolExecutor({ catalog }) }),
      new AgentToolsMcpSessionStreams({ keepaliveIntervalMs: 50 }),
    );
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP port.");
    try {
      const session = activateSession(registry, "run-keepalive", []);
      const stream = await openStreamReader(
        "http://127.0.0.1:" + address.port + sessionUrl(session.sessionId),
      );
      await stream.readUntil((text) => text.includes(": keepalive\n\n"));
      streams.closeSession(session.sessionId);
      await stream.waitForEnd();
      expect(streams.countOpenStreams(session.sessionId)).toBe(0);
    } finally {
      await app.close();
    }
  });

  it("refuses a removed tool from the next request on, and serves an empty list", async () => {
    const { app, service, calls } = await startServer();
    try {
      const activation = service.activateForRun({
        owner: { runId: "run-remove" },
        sender,
        runtimeExposure: buildRuntimeAgentToolExposure([]),
      });
      expect(activation.descriptor.enabledTools).toEqual([]);
      const post = (payload: unknown) => fetch(activation.descriptor.serverUrl, {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify(payload),
      }).then((response) => response.json());
      const listNames = async () => ((await post({
        jsonrpc: "2.0", id: "list", method: "tools/list", params: {},
      })).result.tools as { name: string }[]).map((tool) => tool.name);
      const callTool = (name: string) => post({
        jsonrpc: "2.0", id: `call-${name}`, method: "tools/call", params: { name, arguments: {} },
      });

      expect(await listNames()).toEqual([]);
      expect((await callTool("alpha")).error).toMatchObject({
        message: expect.stringContaining("Tool is not enabled for this session"),
      });

      service.replaceForRun({ runId: "run-remove", runtimeExposure: buildRuntimeAgentToolExposure(["alpha"]) });
      expect(await listNames()).toEqual(["alpha"]);
      expect((await callTool("alpha")).result).toMatchObject({
        content: [{ type: "text", text: "alpha ran" }],
      });

      service.replaceForRun({ runId: "run-remove", runtimeExposure: buildRuntimeAgentToolExposure(["beta"]) });
      expect(await listNames()).toEqual(["beta"]);
      expect((await callTool("alpha")).error).toMatchObject({
        message: expect.stringContaining("Tool is not enabled for this session"),
      });
      expect((await callTool("beta")).result).toMatchObject({
        content: [{ type: "text", text: "beta ran" }],
      });

      service.replaceForRun({ runId: "run-remove", runtimeExposure: buildRuntimeAgentToolExposure([]) });
      expect(await listNames()).toEqual([]);
      expect(calls).toEqual(["alpha", "beta"]);
    } finally {
      await app.close();
    }
  });

  it("lets the official SDK client receive tools/list_changed and re-list", async () => {
    const { app, service } = await startServer();
    const changed = vi.fn();
    const client = new Client({ name: "autobyteus-live-tool-list-probe", version: "0.0.1" });
    client.setNotificationHandler("notifications/tools/list_changed", changed);
    try {
      const activation = service.activateForRun({
        owner: { runId: "run-sdk-live" },
        sender,
        runtimeExposure: buildRuntimeAgentToolExposure(["alpha"]),
      });
      await client.connect(new StreamableHTTPClientTransport(new URL(activation.descriptor.serverUrl)));
      expect(client.getServerCapabilities()?.tools?.listChanged).toBe(true);
      expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(["alpha"]);

      // The SDK opens its GET stream in the background after initialization.
      await vi.waitFor(() => {
        service.replaceForRun({
          runId: "run-sdk-live",
          runtimeExposure: buildRuntimeAgentToolExposure(["beta"]),
        });
        expect(changed).toHaveBeenCalled();
      }, { timeout: 3_000, interval: 100 });
      expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(["beta"]);
    } finally {
      await client.close();
      await app.close();
    }
  });
});
