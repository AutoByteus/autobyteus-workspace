import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionRegistry } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { AgentToolMcpToolExecutor } from "../../../../src/agent-tools/mcp/agent-tool-mcp-tool-executor.js";
import { AgentToolsMcpLocalAccessGate } from "../../../../src/agent-tools/mcp/agent-tools-mcp-local-access.js";
import { AgentToolsMcpMethodDispatcher } from "../../../../src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.js";
import { registerAgentToolsMcpRoutes } from "../../../../src/agent-tools/mcp/agent-tools-mcp-routes.js";
import { createAgentToolMcpSessionAuthorityFactory } from "../../../../src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.js";
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

const post = (
  app: ReturnType<typeof fastify>,
  sessionId: string,
  payload: unknown,
) => app.inject({
  method: "POST",
  url: `/mcp/agent-tools/${sessionId}`,
  headers: {
    "content-type": "application/json",
    accept: "application/json",
  },
  payload: JSON.stringify(payload),
});

describe("application-owned Agent Tools MCP routes", () => {
  it("isolates exact applications, preserves tokenless session liveness through lane quiesce, and deactivates exact runs", async () => {
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
    const capabilityAssembly = beginApplicationAgentToolCapabilityAssembly(
      applicationCatalog,
    );
    const capability = capabilityAssembly.complete(gateway);
    const registry = new AgentToolMcpSessionRegistry();
    const mcpCatalog = new AgentToolMcpCatalog({ adapters: [] });
    const app = fastify();
    await registerAgentToolsMcpRoutes(app, {
      registry,
      dispatcher: new AgentToolsMcpMethodDispatcher({
        catalog: mcpCatalog,
        toolExecutor: new AgentToolMcpToolExecutor({ catalog: mcpCatalog }),
      }),
      localAccessGate: new AgentToolsMcpLocalAccessGate(),
    });
    await app.ready();
    const authority = createAgentToolMcpSessionAuthorityFactory({
      registry,
      catalog: mcpCatalog,
      getLocalBaseUrl: () => "http://127.0.0.1:1",
      assertHostOpen: () => undefined,
    }).begin({ scopeIdentity: "application:app-a,app-b" }).complete({
      executionCapabilities: {
        publishedArtifactPublisher: { publishManyForRun: vi.fn(async () => []) },
        applicationAgentTools: capability,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    const activate = (input: {
      applicationId?: string;
      bindingId?: string;
      runId: string;
      runtimeKind: RuntimeKind;
      selected?: boolean;
    }) => authority.runSessions.activateForRun({
      owner: { runId: input.runId },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: input.runId,
        senderName: input.runId,
        runtimeKind: input.runtimeKind,
      }),
      runtimeKind: input.runtimeKind,
      runtimeExposure: buildRuntimeAgentToolExposure(
        input.selected === false ? [] : [TOOL_NAME],
      ),
      executionContext: input.applicationId ? {
        applicationExecutionContext: {
          applicationId: input.applicationId,
          bindingId: input.bindingId!,
          producer: { agentRunId: input.runId, displayName: input.runId },
        },
      } : {},
    });

    const appA = activate({
      applicationId: "app-a",
      bindingId: "binding-a",
      runId: "run-a",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    });
    const appB = activate({
      applicationId: "app-b",
      bindingId: "binding-b",
      runId: "run-b",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    const general = activate({
      runId: "run-general",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    const unselected = activate({
      applicationId: "app-a",
      bindingId: "binding-a-2",
      runId: "run-a-2",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      selected: false,
    });
    if (appA.kind !== "active" || appB.kind !== "active") {
      throw new Error("Expected active application sessions.");
    }

    try {
      expect(general).toEqual({ kind: "not_exposed" });
      expect(unselected).toEqual({ kind: "not_exposed" });
      expect(registry.listSessions()).toHaveLength(2);
      expect(appA.descriptor).not.toHaveProperty("headers");
      expect(appB.descriptor).not.toHaveProperty("headers");

      for (const [session, expectedDescription] of [
        [appA, "Read app-a"],
        [appB, "Read app-b"],
      ] as const) {
        const listed = await post(app, session.sessionId, {
          jsonrpc: "2.0", id: `list-${session.sessionId}`, method: "tools/list", params: {},
        });
        expect(listed.json()).toMatchObject({
          result: { tools: [{ name: TOOL_NAME, description: expectedDescription }] },
        });
      }

      const appAResult = await post(app, appA.sessionId, {
        jsonrpc: "2.0", id: "call-a", method: "tools/call",
        params: { name: TOOL_NAME, arguments: { query: "alpha" } },
      });
      const appBResult = await post(app, appB.sessionId, {
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

      await lifecycle.quiesceAndDrain("app-a");
      const pingWhileLaneClosed = await post(app, appA.sessionId, {
        jsonrpc: "2.0", id: "ping-a", method: "ping", params: {},
      });
      expect(pingWhileLaneClosed.statusCode).toBe(200);
      const quiescedCall = await post(app, appA.sessionId, {
        jsonrpc: "2.0", id: "quiesced-a", method: "tools/call",
        params: { name: TOOL_NAME, arguments: { query: "late" } },
      });
      expect(quiescedCall.json()).toMatchObject({
        result: {
          isError: true,
          structuredContent: { code: "APPLICATION_TOOL_UNAVAILABLE" },
        },
      });
      expect(workerInvoke).toHaveBeenCalledTimes(2);

      expect(authority.runSessions.deactivateForRun("run-a")).toBe(1);
      const inactive = await post(app, appA.sessionId, {
        jsonrpc: "2.0", id: "inactive-a", method: "ping", params: {},
      });
      expect(inactive.statusCode).toBe(404);
      expect(inactive.json()).toMatchObject({ error: "session_unavailable" });
      expect(authority.runSessions.deactivateForRun("run-a")).toBe(0);
    } finally {
      authority.close();
      capability.close();
      await app.close();
    }
  });
});
