import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { buildConfiguredAgentToolExposure } from "../../../../src/agent-execution/shared/configured-agent-tool-exposure.js";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../../src/agent-communication/services/send-message-to-tool-contract.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { registerAgentToolsMcpRoutes } from "../../../../src/agent-tools/mcp/agent-tools-mcp-routes.js";
import { AgentToolMcpSessionRegistry } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { AgentToolsMcpMethodDispatcher } from "../../../../src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.js";
import type { AgentToolMcpToolExecutor } from "../../../../src/agent-tools/mcp/agent-tool-mcp-tool-executor.js";

type SessionFixture = {
  sessionId: string;
  token: string;
};

const sender = buildAgentRunMessageSenderContext({
  senderRunId: "mcp-sender-run",
  senderName: "sender",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
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
        return { accepted: false, code: "INVALID_TOOL_ARGUMENTS", message: "Validation failed." };
      }
      return { accepted: true, code: "DELIVERED", message: "Delivered via MCP." };
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
      configuredExposure: buildConfiguredAgentToolExposure(enabledTools),
      enabledTools,
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
    expect(response.body).not.toContain(session.sessionId);
  };
});
