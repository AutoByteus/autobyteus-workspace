import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionRegistry } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { AgentToolMcpSessionService } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { AgentToolMcpToolExecutor } from "../../../../src/agent-tools/mcp/agent-tool-mcp-tool-executor.js";
import { AgentToolsMcpMethodDispatcher } from "../../../../src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.js";
import { registerAgentToolsMcpRoutes } from "../../../../src/agent-tools/mcp/agent-tools-mcp-routes.js";
import { ApplicationAgentToolCatalog } from "../../../../src/application-agent-tools/services/application-agent-tool-catalog.js";
import { beginApplicationAgentToolCapabilityAssembly } from "../../../../src/application-agent-tools/services/application-agent-tool-capability.js";
import { ApplicationAgentToolCallLifecycle } from "../../../../src/application-agent-tools/services/application-agent-tool-call-lifecycle.js";
import { ApplicationAgentToolGateway } from "../../../../src/application-agent-tools/services/application-agent-tool-gateway.js";
import { ApplicationAgentToolPayloadValidator } from "../../../../src/application-agent-tools/services/application-agent-tool-payload-validator.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const TOOL_NAME = "read_shared_name";
const declaration = (applicationId: string) => ({
  name: TOOL_NAME,
  description: `Read ${applicationId}`,
  inputSchema: {
    type: "object" as const,
    properties: {
      query: { type: "string" as const, description: "Query value." },
    },
    required: ["query"],
  },
});

const post = (app: ReturnType<typeof fastify>, session: { sessionId: string; descriptor: { headers: { Authorization: string } } }, payload: unknown) =>
  app.inject({
    method: "POST",
    url: `/mcp/agent-tools/${session.sessionId}`,
    headers: {
      authorization: session.descriptor.headers.Authorization,
      "content-type": "application/json",
      accept: "application/json",
    },
    payload: JSON.stringify(payload),
  });

describe("application-owned Agent Tools MCP routes", () => {
  it("isolates same-name App A/App B routes across Claude/Codex, hides general and unselected sessions, and revokes bearers", async () => {
    const applicationCatalog = new ApplicationAgentToolCatalog();
    applicationCatalog.initializeFromBundleSnapshot({
      refreshedAt: "2026-08-27T00:00:00.000Z",
      diagnostics: [],
      applications: [
        { id: "app-a", agentTools: [declaration("app-a")] },
        { id: "app-b", agentTools: [declaration("app-b")] },
      ],
    } as never);
    const invocations: Array<{
      applicationId: string;
      caller: { applicationId: string; bindingId: string; agentRunId: string };
      arguments: Record<string, unknown>;
    }> = [];
    const workerInvoke = vi.fn(async (command: any) => {
      invocations.push({
        applicationId: command.applicationId,
        caller: structuredClone(command.caller),
        arguments: structuredClone(command.arguments),
      });
      return {
        content: [{
          type: "text" as const,
          text: `${command.applicationId}:${String(command.arguments.query)}`,
        }],
        structuredContent: { applicationId: command.applicationId },
      };
    });
    const lifecycle = new ApplicationAgentToolCallLifecycle();
    lifecycle.open("app-a");
    lifecycle.open("app-b");
    const gateway = new ApplicationAgentToolGateway({
      availability: { requireApplicationActive: vi.fn(async () => undefined) } as never,
      catalog: applicationCatalog,
      ownership: {
        requireLiveApplicationToolProducer: vi.fn(async (identity: any) => ({
          applicationId: identity.applicationId,
          bindingId: identity.bindingId,
          agentRunId: identity.producer.agentRunId,
        })),
        hasLiveRunOwnership: vi.fn(async () => true),
      },
      payloadValidator: new ApplicationAgentToolPayloadValidator(),
      lifecycle,
      workerInvoker: { invoke: workerInvoke } as never,
    });
    const assembly = beginApplicationAgentToolCapabilityAssembly(applicationCatalog);
    const capability = assembly.complete(gateway);
    const registry = new AgentToolMcpSessionRegistry();
    const mcpCatalog = new AgentToolMcpCatalog({ adapters: [] });
    const app = fastify();
    await registerAgentToolsMcpRoutes(app, {
      registry,
      dispatcher: new AgentToolsMcpMethodDispatcher({
        catalog: mcpCatalog,
        toolExecutor: new AgentToolMcpToolExecutor({ catalog: mcpCatalog }),
      }),
    });
    await app.ready();
    const sessionService = new AgentToolMcpSessionService({
      registry,
      catalog: mcpCatalog,
      getInternalBaseUrl: () => "http://127.0.0.1:1",
      executionCapabilities: {
        publishedArtifactPublisher: { publishManyForRun: vi.fn(async () => []) },
        applicationAgentTools: capability,
      },
    });
    const issue = (input: {
      applicationId?: string;
      bindingId?: string;
      runId: string;
      runtimeKind: RuntimeKind;
      selected?: boolean;
    }) => sessionService.createAgentToolMcpSession({
      owner: { runId: input.runId },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: input.runId,
        senderName: input.runId,
        runtimeKind: input.runtimeKind,
      }),
      runtimeKind: input.runtimeKind,
      runtimeExposure: buildRuntimeAgentToolExposure(input.selected === false ? [] : [TOOL_NAME]),
      executionContext: input.applicationId ? {
        applicationExecutionContext: {
          applicationId: input.applicationId,
          bindingId: input.bindingId!,
          producer: { agentRunId: input.runId, displayName: input.runId },
        },
      } : {},
    });

    const appA = issue({
      applicationId: "app-a",
      bindingId: "binding-a",
      runId: "run-a",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    });
    const appB = issue({
      applicationId: "app-b",
      bindingId: "binding-b",
      runId: "run-b",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    const general = issue({ runId: "run-general", runtimeKind: RuntimeKind.CODEX_APP_SERVER });
    const unselected = issue({
      applicationId: "app-a",
      bindingId: "binding-a-2",
      runId: "run-a-2",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      selected: false,
    });

    try {
      for (const [session, expectedDescription] of [
        [appA, "Read app-a"],
        [appB, "Read app-b"],
      ] as const) {
        const listed = await post(app, session, {
          jsonrpc: "2.0", id: `list-${session.sessionId}`, method: "tools/list", params: {},
        });
        expect(listed.json()).toMatchObject({
          result: { tools: [{ name: TOOL_NAME, description: expectedDescription }] },
        });
      }

      for (const session of [general, unselected]) {
        const listed = await post(app, session, {
          jsonrpc: "2.0", id: `list-${session.sessionId}`, method: "tools/list", params: {},
        });
        expect(listed.json()).toMatchObject({ result: { tools: [] } });
        const rejected = await post(app, session, {
          jsonrpc: "2.0",
          id: `call-${session.sessionId}`,
          method: "tools/call",
          params: { name: TOOL_NAME, arguments: { query: "hidden" } },
        });
        expect(rejected.json()).toMatchObject({ error: { code: -32602 } });
      }

      const appAResult = await post(app, appA, {
        jsonrpc: "2.0", id: "call-a", method: "tools/call",
        params: { name: TOOL_NAME, arguments: { query: "alpha" } },
      });
      const appBResult = await post(app, appB, {
        jsonrpc: "2.0", id: "call-b", method: "tools/call",
        params: { name: TOOL_NAME, arguments: { query: "beta" } },
      });
      expect(appAResult.json()).toMatchObject({
        result: {
          content: [{ type: "text", text: "app-a:alpha" }],
          structuredContent: { applicationId: "app-a" },
        },
      });
      expect(appBResult.json()).toMatchObject({
        result: {
          content: [{ type: "text", text: "app-b:beta" }],
          structuredContent: { applicationId: "app-b" },
        },
      });
      expect(invocations).toEqual([
        {
          applicationId: "app-a",
          caller: { applicationId: "app-a", bindingId: "binding-a", agentRunId: "run-a" },
          arguments: { query: "alpha" },
        },
        {
          applicationId: "app-b",
          caller: { applicationId: "app-b", bindingId: "binding-b", agentRunId: "run-b" },
          arguments: { query: "beta" },
        },
      ]);

      const invalid = await post(app, appB, {
        jsonrpc: "2.0", id: "invalid-b", method: "tools/call",
        params: { name: TOOL_NAME, arguments: { query: 3 } },
      });
      expect(invalid.json()).toMatchObject({
        result: {
          isError: true,
          structuredContent: { code: "APPLICATION_TOOL_INVALID_INPUT" },
        },
      });
      expect(workerInvoke).toHaveBeenCalledTimes(2);

      expect(sessionService.revokeAgentToolMcpSession(appA.sessionId)).toBe(true);
      const revoked = await post(app, appA, {
        jsonrpc: "2.0", id: "revoked", method: "tools/call",
        params: { name: TOOL_NAME, arguments: { query: "late" } },
      });
      expect(revoked.statusCode).toBe(404);
      expect(revoked.json()).toMatchObject({ error: "session_unavailable" });
      expect(workerInvoke).toHaveBeenCalledTimes(2);
    } finally {
      capability.close();
      await app.close();
    }
  });
});
