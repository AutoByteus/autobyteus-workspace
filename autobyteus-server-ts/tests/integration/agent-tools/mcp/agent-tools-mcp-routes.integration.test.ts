import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
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
import { toAgentToolMcpOperationResult } from "../../../../src/agent-tools/mcp/agent-tool-mcp-adapter.js";
import { PublishArtifactsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/publish-artifacts-mcp-adapter-provider.js";
import { PUBLISH_ARTIFACTS_TOOL_NAME } from "../../../../src/services/published-artifacts/published-artifact-tool-contract.js";
import { PublishedArtifactPublicationService } from "../../../../src/services/published-artifacts/published-artifact-publication-service.js";
import { PublishedArtifactProjectionStore } from "../../../../src/services/published-artifacts/published-artifact-projection-store.js";
import { PublishedArtifactSnapshotStore } from "../../../../src/services/published-artifacts/published-artifact-snapshot-store.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";

type SessionFixture = {
  sessionId: string;
  token: string;
};

type ConfiguredMcpCall = {
  agentId: string | null;
  args: Record<string, unknown>;
};

const sender = buildAgentRunMessageSenderContext({
  senderRunId: "mcp-sender-run",
  senderName: "sender",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

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
      content: [{ type: "text", text: `rows for ${String(args.sql ?? "")}` }],
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
  `Description for ${name}`,
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
    if (!definition) {
      throw new Error(`No definition for ${name}`);
    }
    const tool = definition.customFactory!();
    tool.definition = definition;
    return tool;
  }
}

describe("Agent Tools MCP route publish_artifacts integration", () => {
  it("publishes through the route-backed MCP server for an active run without leaking descriptor secrets", async () => {
    const tempDirs: string[] = [];
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-tools-mcp-publish-workspace-"));
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-tools-mcp-publish-memory-"));
    tempDirs.push(workspaceRoot, memoryDir);
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
          config: {
            memoryDir,
            workspaceId: "workspace-agent-tools-mcp-publish",
          },
          publishEvent: async (event: { eventType: string; payload: Record<string, unknown> }) => {
            localEvents.push(event);
          },
        }),
      } as any,
      workspaceManager: {
        getOrCreateWorkspace: vi.fn().mockResolvedValue({
          getBasePath: () => workspaceRoot,
        }),
      } as any,
      projectionStore,
      snapshotStore,
    });
    const catalog = new AgentToolMcpCatalog({
      providers: [new PublishArtifactsMcpAdapterProvider()],
    });
    const app = fastify();
    const registry = new AgentToolMcpSessionRegistry();
    const dispatcher = new AgentToolsMcpMethodDispatcher({
      catalog,
      toolExecutor: new AgentToolMcpToolExecutor({ catalog }),
    });
    await registerAgentToolsMcpRoutes(app, { registry, dispatcher });
    await app.ready();

    const { session, capabilityToken } = registry.createSession({
      owner: { runId },
      sender,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      runtimeExposure: buildRuntimeAgentToolExposure([PUBLISH_ARTIFACTS_TOOL_NAME]),
      enabledTools: [PUBLISH_ARTIFACTS_TOOL_NAME],
      toolRoutes: {
        [PUBLISH_ARTIFACTS_TOOL_NAME]: {
          kind: "static_adapter",
          toolName: PUBLISH_ARTIFACTS_TOOL_NAME,
        },
      },
      executionContext: {
        workingDirectory: workspaceRoot,
        memoryDir,
      },
      executionCapabilities: {
        kind: "agent",
        publishedArtifactPublisher: publicationService,
      },
    });
    const sessionUrl = `/mcp/agent-tools/${session.sessionId}`;
    const headers = {
      authorization: `Bearer ${capabilityToken}`,
      "content-type": "application/json",
      accept: "application/json",
    };
    const post = (payload: unknown) => app.inject({
      method: "POST",
      url: sessionUrl,
      headers,
      payload: JSON.stringify(payload),
    });

    try {
      const tools = await post({ jsonrpc: "2.0", id: "tools", method: "tools/list", params: {} });
      expect(tools.statusCode).toBe(200);
      const toolsBody = tools.json() as { result: { tools: Array<{ name: string; inputSchema: { required: string[] } }> } };
      expect(toolsBody.result.tools).toHaveLength(1);
      expect(toolsBody.result.tools[0]).toMatchObject({
        name: PUBLISH_ARTIFACTS_TOOL_NAME,
        inputSchema: {
          type: "object",
          required: ["artifacts"],
          additionalProperties: false,
        },
      });

      const published = await post({
        jsonrpc: "2.0",
        id: "publish",
        method: "tools/call",
        params: {
          name: PUBLISH_ARTIFACTS_TOOL_NAME,
          arguments: {
            artifacts: [
              {
                path: artifactRelativePath,
                description: "Route-backed publication",
              },
            ],
          },
        },
      });
      expect(published.statusCode).toBe(200);
      const publishedBody = published.json() as {
        result: { content: Array<{ type: "text"; text: string }> };
      };
      const publishedPayload = JSON.parse(publishedBody.result.content[0]!.text) as {
        success: boolean;
        artifacts: Array<Record<string, unknown>>;
      };
      const canonicalArtifactPath = (await fs.realpath(artifactAbsolutePath)).replace(/\\/g, "/");
      expect(publishedPayload).toMatchObject({
        success: true,
        artifacts: [
          {
            runId,
            path: canonicalArtifactPath,
            type: "file",
            status: "available",
            description: "Route-backed publication",
          },
        ],
      });

      const projection = await projectionStore.readProjection(memoryDir);
      expect(projection.summaries).toEqual(publishedPayload.artifacts);
      expect(projection.revisions).toHaveLength(1);
      await expect(
        snapshotStore.readRevisionText(memoryDir, projection.revisions[0]!.snapshotRelativePath),
      ).resolves.toBe(artifactBody);
      expect(localEvents).toHaveLength(1);
      expect(localEvents[0]).toMatchObject({
        eventType: AgentRunEventType.ARTIFACT_PERSISTED,
        payload: projection.summaries[0],
      });

      const invalid = await post({
        jsonrpc: "2.0",
        id: "invalid-publish",
        method: "tools/call",
        params: {
          name: PUBLISH_ARTIFACTS_TOOL_NAME,
          arguments: { path: artifactRelativePath },
        },
      });
      expect(invalid.statusCode).toBe(200);
      const invalidBody = invalid.json() as {
        result: { isError: true; content: Array<{ type: "text"; text: string }> };
      };
      expect(invalidBody.result.isError).toBe(true);
      expect(JSON.parse(invalidBody.result.content[0]!.text)).toMatchObject({
        error: {
          code: "publish_artifacts_failed",
          message: "publish_artifacts disallows top-level fields: path.",
        },
      });
      expect((await projectionStore.readProjection(memoryDir)).summaries).toEqual(
        publishedPayload.artifacts,
      );

      const serializedAppFacingData = JSON.stringify({
        published: publishedBody,
        invalid: invalidBody,
        localEvents,
        projection,
      });
      expect(serializedAppFacingData).not.toContain(capabilityToken);
      expect(serializedAppFacingData).not.toContain(session.sessionId);
      expect(serializedAppFacingData).not.toContain("Bearer");
      expect(serializedAppFacingData).not.toContain("Authorization");
      expect(serializedAppFacingData).not.toContain("autobyteus_agent_tools");
      expect(serializedAppFacingData).not.toContain("mcp__autobyteus_agent_tools__");
    } finally {
      await app.close();
      await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
    }
  });
});

describe("Agent Tools MCP route configured MCP integration", () => {
  it("exposes and calls configured MCP-origin tools over the official Streamable HTTP client", async () => {
    const app = fastify();
    const registry = new AgentToolMcpSessionRegistry();
    const calls: ConfiguredMcpCall[] = [];
    const toolRegistry = new FakeToolRegistry();
    toolRegistry.register(buildMcpDefinition("db_query", "sqlite", calls));
    const catalog = new AgentToolMcpCatalog({
      adapters: [],
      registry: toolRegistry as any,
    });
    const dispatcher = new AgentToolsMcpMethodDispatcher({
      catalog,
      toolExecutor: new AgentToolMcpToolExecutor({ catalog }),
    });
    await registerAgentToolsMcpRoutes(app, { registry, dispatcher });
    await app.ready();
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected Fastify to listen on a loopback TCP port.");
    }

    const sessionService = new AgentToolMcpSessionService({
      registry,
      catalog,
      getInternalBaseUrl: () => `http://127.0.0.1:${address.port}`,
      executionCapabilities: {
        publishedArtifactPublisher: { publishManyForRun: vi.fn(async () => []) },
      },
    });
    const created = sessionService.createAgentToolMcpSession({
      owner: {
        runId: "run-configured-mcp",
      },
      sender,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      runtimeExposure: buildRuntimeAgentToolExposure(["db_query"]),
    });
    const token = created.descriptor.headers.Authorization.replace(/^Bearer\s+/, "");
    const sdkClient = new Client({ name: "autobyteus-configured-mcp-sdk-probe", version: "0.0.1" });
    const transport = new StreamableHTTPClientTransport(
      new URL(created.descriptor.serverUrl),
      { requestInit: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const post = (payload: unknown) => app.inject({
      method: "POST",
      url: `/mcp/agent-tools/${created.sessionId}`,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      payload: JSON.stringify(payload),
    });

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
        structuredContent: { rows: [{ value: 1 }] },
        _meta: { remoteToolName: "query" },
      });
      expect(calls).toEqual([
        { agentId: "run-configured-mcp", args: { sql: "select 1" } },
      ]);

      const remoteFailure = await post({
        jsonrpc: "2.0",
        id: "remote-failure",
        method: "tools/call",
        params: {
          name: "db_query",
          arguments: { mode: "error" },
        },
      });
      expect(remoteFailure.statusCode).toBe(200);
      expect(remoteFailure.json()).toMatchObject({
        result: {
          content: [{ type: "text", text: "remote failure" }],
          isError: true,
          structuredContent: { code: "REMOTE_FAILURE" },
          _meta: { traceId: "trace-safe" },
        },
      });

      const unconfigured = sessionService.createAgentToolMcpSession({
        owner: { runId: "run-unconfigured-mcp" },
        sender,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        runtimeExposure: buildRuntimeAgentToolExposure([]),
      });
      const unconfiguredToken = unconfigured.descriptor.headers.Authorization.replace(/^Bearer\s+/, "");
      const rejected = await app.inject({
        method: "POST",
        url: `/mcp/agent-tools/${unconfigured.sessionId}`,
        headers: {
          authorization: `Bearer ${unconfiguredToken}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        payload: JSON.stringify({
          jsonrpc: "2.0",
          id: "unconfigured-call",
          method: "tools/call",
          params: { name: "db_query", arguments: {} },
        }),
      });
      expect(rejected.statusCode).toBe(200);
      expect(rejected.json()).toMatchObject({
        error: { code: -32602, message: "Unknown MCP tool" },
      });
      expect(calls).toHaveLength(2);

      const serializedAppFacingData = JSON.stringify({
        tools,
        remoteFailure: remoteFailure.json(),
        rejected: rejected.json(),
      });
      expect(serializedAppFacingData).not.toContain(token);
      expect(serializedAppFacingData).not.toContain(created.sessionId);
      expect(serializedAppFacingData).not.toContain("Bearer");
      expect(serializedAppFacingData).not.toContain("Authorization");
    } finally {
      await sdkClient.close();
      await app.close();
    }
  });
});

describe("Agent Tools MCP route", () => {
  let app: FastifyInstance;
  let registry: AgentToolMcpSessionRegistry;
  let executeAgentToolMcpCall: ReturnType<typeof vi.fn>;
  let enabledSession: SessionFixture;
  let unconfiguredSession: SessionFixture;

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
    await registerAgentToolsMcpRoutes(app, { registry, dispatcher });
    await app.register(cors, { origin: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] });
    await app.ready();
    enabledSession = createSession([SEND_MESSAGE_TO_TOOL_NAME]);
    unconfiguredSession = createSession([]);
  });

  afterEach(async () => {
    await app.close();
  });

  it("handles authenticated initialize, tools/list, resources, ping, notification, and SSE", async () => {
    const initialize = await post(enabledSession, { jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    expect(initialize.statusCode).toBe(200);
    expect(initialize.headers["mcp-session-id"]).toBeUndefined();
    expect(initialize.json()).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-03-26",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "autobyteus_agent_tools" },
      },
    });

    const tools = await post(enabledSession, { jsonrpc: "2.0", id: "tools", method: "tools/list", params: {} });
    expect(tools.statusCode).toBe(200);
    const toolsBody = tools.json() as { result: { tools: Array<{ name: string; inputSchema: { required: string[] } }> } };
    expect(toolsBody.result.tools).toHaveLength(1);
    expect(toolsBody.result.tools[0]).toMatchObject({
      name: SEND_MESSAGE_TO_TOOL_NAME,
      inputSchema: { type: "object", required: ["content"], additionalProperties: false },
    });

    const resources = await post(enabledSession, { jsonrpc: "2.0", id: 2, method: "resources/list", params: {} });
    expect(resources.json()).toMatchObject({ result: { resources: [] } });
    const templates = await post(enabledSession, { jsonrpc: "2.0", id: 3, method: "resources/templates/list", params: {} });
    expect(templates.json()).toMatchObject({ result: { resourceTemplates: [] } });
    const ping = await post(enabledSession, { jsonrpc: "2.0", id: 4, method: "ping", params: {} });
    expect(ping.json()).toMatchObject({ result: {} });

    const notification = await post(enabledSession, { jsonrpc: "2.0", method: "notifications/initialized", params: {} });
    expect(notification.statusCode).toBe(202);
    expect(notification.body).toBe("");

    const sse = await app.inject({
      method: "GET",
      url: url(enabledSession),
      headers: authHeaders(enabledSession, { accept: "text/event-stream" }),
    });
    expect(sse.statusCode).toBe(200);
    expect(sse.headers["content-type"]).toContain("text/event-stream");
    expect(sse.body).toContain("autobyteus_agent_tools ready");
  });

  it("is consumable by the official Streamable HTTP MCP SDK client over loopback", async () => {
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected Fastify to listen on a loopback TCP port.");
    }

    const sdkClient = new Client({ name: "autobyteus-agent-tools-sdk-probe", version: "0.0.1" });
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${address.port}${url(enabledSession)}`),
      { requestInit: { headers: { Authorization: `Bearer ${enabledSession.token}` } } },
    );

    try {
      await sdkClient.connect(transport);
      const tools = await sdkClient.listTools();
      expect(tools.tools).toHaveLength(1);
      expect(tools.tools[0]).toMatchObject({
        name: SEND_MESSAGE_TO_TOOL_NAME,
        inputSchema: { type: "object", required: ["content"], additionalProperties: false },
      });

      await expect(sdkClient.listResources()).resolves.toMatchObject({ resources: [] });
      await expect(sdkClient.listResourceTemplates()).resolves.toMatchObject({ resourceTemplates: [] });
      await expect(sdkClient.ping()).resolves.toEqual({});

      await expect(sdkClient.callTool({
        name: SEND_MESSAGE_TO_TOOL_NAME,
        arguments: {
          target_agent_run_id: "target-run",
          content: "hello-sdk",
        },
      })).resolves.toMatchObject({
        content: [{ type: "text", text: "Delivered via MCP." }],
      });
    } finally {
      await sdkClient.close();
    }
  });

  it("calls configured tools and maps semantic failures as MCP tool results", async () => {
    const success = await post(enabledSession, {
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: {
        name: SEND_MESSAGE_TO_TOOL_NAME,
        arguments: { target_agent_run_id: "target-run", content: "hello" },
      },
    });
    expect(success.statusCode).toBe(200);
    expect(success.json()).toMatchObject({
      result: { content: [{ type: "text", text: "Delivered via MCP." }] },
    });
    expect(executeAgentToolMcpCall).toHaveBeenCalledTimes(1);

    const semanticFailure = await post(enabledSession, {
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: {
        name: SEND_MESSAGE_TO_TOOL_NAME,
        arguments: { fail: true },
      },
    });
    expect(semanticFailure.statusCode).toBe(200);
    expect(semanticFailure.json()).toMatchObject({
      result: {
        isError: true,
        content: [{ type: "text", text: "Validation failed." }],
      },
    });
  });

  it("rejects unknown and unconfigured tools as JSON-RPC invalid params without tool execution", async () => {
    executeAgentToolMcpCall.mockClear();
    const unknown = await post(enabledSession, {
      jsonrpc: "2.0",
      id: 20,
      method: "tools/call",
      params: { name: "missing_tool", arguments: {} },
    });
    expect(unknown.statusCode).toBe(200);
    expect(unknown.json()).toMatchObject({
      error: { code: -32602, message: "Unknown MCP tool" },
    });
    expect(unknown.json()).not.toHaveProperty("result");

    const unconfigured = await post(unconfiguredSession, {
      jsonrpc: "2.0",
      id: 21,
      method: "tools/call",
      params: { name: SEND_MESSAGE_TO_TOOL_NAME, arguments: {} },
    });
    expect(unconfigured.statusCode).toBe(200);
    expect(unconfigured.json()).toMatchObject({
      error: { code: -32602, message: "Tool is not enabled for this session" },
    });
    expect(unconfigured.json()).not.toHaveProperty("result");
    expect(executeAgentToolMcpCall).not.toHaveBeenCalled();
  });

  it("enforces route gate auth, session, origin, method, content, accept, and protocol rules", async () => {
    const invalidOrigin = await app.inject({
      method: "POST",
      url: url(enabledSession),
      headers: { origin: "https://evil.example" },
      payload: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    expect(invalidOrigin.statusCode).toBe(403);

    const missingAuth = await app.inject({ method: "POST", url: url(enabledSession) });
    expect(missingAuth.statusCode).toBe(401);

    const wrongToken = await post({ ...enabledSession, token: "wrong-token" }, { jsonrpc: "2.0", id: 1, method: "ping" });
    expect(wrongToken.statusCode).toBe(404);
    expect(wrongToken.json()).toMatchObject({ error: "session_unavailable" });

    const unsupportedMethod = await app.inject({
      method: "PATCH",
      url: url(enabledSession),
      headers: authHeaders(enabledSession),
    });
    expect(unsupportedMethod.statusCode).toBe(405);

    const unregisteredMissingAuth = await app.inject({ method: "CONNECT", url: url(enabledSession) });
    expect(unregisteredMissingAuth.statusCode).toBe(401);
    expectNoDefaultRouteLeak(unregisteredMissingAuth, enabledSession);

    const unregisteredWrongToken = await app.inject({
      method: "CONNECT",
      url: url(enabledSession),
      headers: authHeaders({ ...enabledSession, token: "wrong-token" }),
    });
    expect(unregisteredWrongToken.statusCode).toBe(404);
    expect(unregisteredWrongToken.json()).toMatchObject({ error: "session_unavailable" });
    expectNoDefaultRouteLeak(unregisteredWrongToken, enabledSession);

    const unregisteredValidAuth = await app.inject({
      method: "CONNECT",
      url: url(enabledSession),
      headers: authHeaders(enabledSession),
    });
    expect(unregisteredValidAuth.statusCode).toBe(405);
    expectNoDefaultRouteLeak(unregisteredValidAuth, enabledSession);

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: url(enabledSession),
      headers: authHeaders(enabledSession),
    });
    expect(deleteResponse.statusCode).toBe(405);
    const stillValid = await post(enabledSession, { jsonrpc: "2.0", id: 2, method: "ping" });
    expect(stillValid.statusCode).toBe(200);

    const wrongContentType = await app.inject({
      method: "POST",
      url: url(enabledSession),
      headers: authHeaders(enabledSession, { "content-type": "text/plain" }),
      payload: "{}",
    });
    expect(wrongContentType.statusCode).toBe(415);

    const wrongAccept = await app.inject({
      method: "POST",
      url: url(enabledSession),
      headers: authHeaders(enabledSession, { accept: "text/plain" }),
      payload: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "ping" }),
    });
    expect(wrongAccept.statusCode).toBe(406);

    const unsupportedProtocol = await post(
      enabledSession,
      { jsonrpc: "2.0", id: 4, method: "ping" },
      { "mcp-protocol-version": "1999-01-01" },
    );
    expect(unsupportedProtocol.statusCode).toBe(400);
    expect(unsupportedProtocol.json()).toMatchObject({ error: { code: -32600 } });
  });

  it("rejects revoked sessions at the route without dispatching tools or leaking descriptor secrets", async () => {
    executeAgentToolMcpCall.mockClear();

    expect(registry.revokeSession(enabledSession.sessionId)).toBe(true);
    const revoked = await post(enabledSession, {
      jsonrpc: "2.0",
      id: "revoked",
      method: "tools/call",
      params: {
        name: SEND_MESSAGE_TO_TOOL_NAME,
        arguments: { target_agent_run_id: "target-run", content: "hello" },
      },
    });

    expect(revoked.statusCode).toBe(404);
    expect(revoked.json()).toMatchObject({ error: "session_unavailable" });
    expect(executeAgentToolMcpCall).not.toHaveBeenCalled();
    expectNoSessionSecretLeak(revoked, enabledSession);
  });

  it("rejects old descriptors after in-memory registry reset and accepts a freshly materialized descriptor", async () => {
    const oldDescriptor = enabledSession;
    registry.clear();
    executeAgentToolMcpCall.mockClear();

    const oldResponse = await post(oldDescriptor, { jsonrpc: "2.0", id: "old", method: "ping" });
    expect(oldResponse.statusCode).toBe(404);
    expect(oldResponse.json()).toMatchObject({ error: "session_unavailable" });
    expect(executeAgentToolMcpCall).not.toHaveBeenCalled();
    expectNoSessionSecretLeak(oldResponse, oldDescriptor);

    const freshDescriptor = createSession([SEND_MESSAGE_TO_TOOL_NAME]);
    const freshPing = await post(freshDescriptor, { jsonrpc: "2.0", id: "fresh-ping", method: "ping" });
    expect(freshPing.statusCode).toBe(200);
    expect(freshPing.json()).toMatchObject({ result: {} });

    const freshCall = await post(freshDescriptor, {
      jsonrpc: "2.0",
      id: "fresh-call",
      method: "tools/call",
      params: {
        name: SEND_MESSAGE_TO_TOOL_NAME,
        arguments: { target_agent_run_id: "target-run", content: "hello-fresh" },
      },
    });
    expect(freshCall.statusCode).toBe(200);
    expect(freshCall.json()).toMatchObject({
      result: { content: [{ type: "text", text: "Delivered via MCP." }] },
    });
    expect(executeAgentToolMcpCall).toHaveBeenCalledTimes(1);
  });

  it("classifies malformed JSON, invalid envelopes, method invalid params, and unknown methods", async () => {
    const malformed = await app.inject({
      method: "POST",
      url: url(enabledSession),
      headers: authHeaders(enabledSession),
      payload: "{not json",
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toMatchObject({ id: null, error: { code: -32700 } });

    const invalidEnvelope = await post(enabledSession, { jsonrpc: "2.0", id: "safe-id", params: {} });
    expect(invalidEnvelope.statusCode).toBe(400);
    expect(invalidEnvelope.json()).toMatchObject({ id: "safe-id", error: { code: -32600 } });

    const invalidParams = await post(enabledSession, {
      jsonrpc: "2.0",
      id: 30,
      method: "tools/call",
      params: { name: SEND_MESSAGE_TO_TOOL_NAME, arguments: "not-object" },
    });
    expect(invalidParams.statusCode).toBe(200);
    expect(invalidParams.json()).toMatchObject({ error: { code: -32602 } });

    const unknownMethod = await post(enabledSession, { jsonrpc: "2.0", id: 31, method: "unknown/method", params: {} });
    expect(unknownMethod.statusCode).toBe(200);
    expect(unknownMethod.json()).toMatchObject({ error: { code: -32601 } });
  });

  it("allows unauthenticated OPTIONS only for valid local origins", async () => {
    const ok = await app.inject({
      method: "OPTIONS",
      url: url(enabledSession),
      headers: { origin: "http://127.0.0.1:3000" },
    });
    expect(ok.statusCode).toBe(204);
    expect(ok.headers["access-control-allow-methods"]).toContain("POST");

    const rejected = await app.inject({
      method: "OPTIONS",
      url: url(enabledSession),
      headers: { origin: "https://evil.example" },
    });
    expect(rejected.statusCode).toBe(403);
  });

  const createSession = (enabledTools: string[]): SessionFixture => {
    const { session, capabilityToken } = registry.createSession({
      owner: { runId: `owner-${enabledTools.join("-") || "none"}` },
      sender,
      runtimeExposure: buildRuntimeAgentToolExposure(enabledTools),
      executionCapabilities: {
        kind: "agent",
        publishedArtifactPublisher: { publishManyForRun: vi.fn(async () => []) },
      },
      enabledTools,
      toolRoutes: Object.fromEntries(enabledTools.map((toolName) => [
        toolName,
        { kind: "static_adapter", toolName },
      ])) as any,
    });
    return { sessionId: session.sessionId, token: capabilityToken };
  };

  const url = (session: SessionFixture): string => `/mcp/agent-tools/${session.sessionId}`;

  const authHeaders = (
    session: SessionFixture,
    extra: Record<string, string> = {},
  ): Record<string, string> => ({
    authorization: `Bearer ${session.token}`,
    "content-type": "application/json",
    accept: "application/json",
    ...extra,
  });

  const post = (
    session: SessionFixture,
    payload: unknown,
    extraHeaders: Record<string, string> = {},
  ) => app.inject({
    method: "POST",
    url: url(session),
    headers: authHeaders(session, extraHeaders),
    payload: JSON.stringify(payload),
  });

  const expectNoDefaultRouteLeak = (response: { body: string }, session: SessionFixture) => {
    expect(response.body).not.toContain("Route CONNECT:");
    expect(response.body).not.toContain(url(session));
    expectNoSessionSecretLeak(response, session);
  };

  const expectNoSessionSecretLeak = (response: { body: string }, session: SessionFixture) => {
    expect(response.body).not.toContain(session.sessionId);
    expect(response.body).not.toContain(session.token);
    expect(response.body).not.toContain("Bearer");
    expect(response.body).not.toContain("Authorization");
  };
});
