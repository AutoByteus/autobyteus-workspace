import { describe, expect, it, vi } from "vitest";
import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../../src/agent-communication/services/send-message-to-tool-contract.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionRegistry } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { AgentToolMcpSessionService } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { AgentToolMcpToolExecutor } from "../../../../src/agent-tools/mcp/agent-tool-mcp-tool-executor.js";
import {
  toAgentToolMcpOperationResult,
  toAgentToolMcpToolResult,
  type AgentToolMcpToolAdapter,
} from "../../../../src/agent-tools/mcp/agent-tool-mcp-adapter.js";

const buildSender = () => buildAgentRunMessageSenderContext({
  senderRunId: "run-1",
  senderName: "agent-one",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

const buildService = (registry = new AgentToolMcpSessionRegistry()) => new AgentToolMcpSessionService({
  registry,
  catalog: new AgentToolMcpCatalog({
    adapters: [buildSendMessageAdapter(vi.fn())],
  }),
  getInternalBaseUrl: () => "http://127.0.0.1:8080",
});

class FakeConfiguredMcpTool extends BaseTool {
  static getDescription(): string { return "Fake configured MCP tool"; }
  static getArgumentSchema(): ParameterSchema | null { return null; }
  protected async _execute(): Promise<unknown> {
    return { content: [{ type: "text", text: "ok" }] };
  }
}

const buildMcpDefinition = (name: string, serverId: string): ToolDefinition => new ToolDefinition(
  name,
  `Description for ${name}`,
  ToolOrigin.MCP,
  "MCP",
  () => new ParameterSchema(),
  () => null,
  {
    customFactory: () => new FakeConfiguredMcpTool(),
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

const buildSendMessageAdapter = (dispatch: ReturnType<typeof vi.fn>): AgentToolMcpToolAdapter => ({
  definition: {
    name: SEND_MESSAGE_TO_TOOL_NAME,
    description: "Send a message",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  isAvailable: () => true,
  execute: async ({ session, rawArguments }) => toAgentToolMcpOperationResult(await dispatch({
    toolName: SEND_MESSAGE_TO_TOOL_NAME,
    rawArguments,
    sender: session.sender,
  })),
});

describe("AgentToolMcpSessionService", () => {
  it("creates a secret descriptor from configured-and-supported tools without storing raw tokens", () => {
    const registry = new AgentToolMcpSessionRegistry();
    const service = buildService(registry);

    const result = service.createAgentToolMcpSession({
      owner: { runId: "run-1" },
      sender: buildSender(),
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      runtimeExposure: buildRuntimeAgentToolExposure([
        SEND_MESSAGE_TO_TOOL_NAME,
        "open_tab",
      ]),
    });

    expect(result.descriptor).toMatchObject({
      name: "autobyteus_agent_tools",
      transport: "streamable_http",
      enabledTools: [SEND_MESSAGE_TO_TOOL_NAME],
      headers: { Authorization: expect.stringMatching(/^Bearer\s+\S+$/) },
    });
    expect(result.descriptor.serverUrl).toBe(
      `http://127.0.0.1:8080/mcp/agent-tools/${result.session.sessionId}`,
    );
    const rawToken = result.descriptor.headers.Authorization.replace(/^Bearer\s+/, "");
    expect(result.session.tokenHash.toString("utf8")).not.toContain(rawToken);
    expect(registry.resolveSession({ sessionId: result.session.sessionId, bearerToken: rawToken }).ok).toBe(true);

    expect(result.redactedDescriptor.headers.Authorization).toBe("Bearer <redacted>");
    expect(result.redactedDescriptor.serverUrl).toBe("http://127.0.0.1:8080/mcp/agent-tools/%3Credacted%3E");
    expect(JSON.stringify(result.redactedDescriptor)).not.toContain(rawToken);
    expect(JSON.stringify(result.redactedDescriptor)).not.toContain(result.session.sessionId);
  });

  it("creates descriptor enabled tools and session sources for selected configured MCP registry tools", () => {
    const sessionRegistry = new AgentToolMcpSessionRegistry();
    const toolRegistry = new FakeToolRegistry();
    toolRegistry.register(buildMcpDefinition("db_query", "sqlite"));
    const service = new AgentToolMcpSessionService({
      registry: sessionRegistry,
      catalog: new AgentToolMcpCatalog({
        adapters: [buildSendMessageAdapter(vi.fn())],
        registry: toolRegistry as any,
      }),
      getInternalBaseUrl: () => "http://127.0.0.1:8080",
    });

    const result = service.createAgentToolMcpSession({
      owner: { runId: "run-configured" },
      sender: buildSender(),
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      runtimeExposure: buildRuntimeAgentToolExposure([
        "db_query",
        SEND_MESSAGE_TO_TOOL_NAME,
      ]),
    });

    expect(result.descriptor.enabledTools).toEqual([
      "db_query",
      SEND_MESSAGE_TO_TOOL_NAME,
    ]);
    expect(result.session.enabledTools).toEqual(result.descriptor.enabledTools);
    expect(result.session.configuredMcpToolSources).toEqual([
      { kind: "configured_mcp_tool", registeredToolName: "db_query", mcpServerId: "sqlite" },
    ]);
    expect(result.session.toolRoutes).toEqual({
      [SEND_MESSAGE_TO_TOOL_NAME]: {
        kind: "static_adapter",
        toolName: SEND_MESSAGE_TO_TOOL_NAME,
      },
      db_query: {
        kind: "configured_mcp_tool",
        registeredToolName: "db_query",
        mcpServerId: "sqlite",
      },
    });
    expect(result.redactedDescriptor.enabledTools).toEqual(result.descriptor.enabledTools);

    const rawToken = result.descriptor.headers.Authorization.replace(/^Bearer\s+/, "");
    expect(JSON.stringify(result.session.configuredMcpToolSources)).not.toContain(rawToken);
    expect(JSON.stringify(result.redactedDescriptor)).not.toContain(rawToken);
    expect(JSON.stringify(result.redactedDescriptor)).not.toContain(result.session.sessionId);
    expect(sessionRegistry.resolveSession({
      sessionId: result.session.sessionId,
      bearerToken: rawToken,
    }).ok).toBe(true);
  });

  it("does not expose send_message_to when it was not configured", () => {
    const service = buildService();

    const result = service.createAgentToolMcpSession({
      owner: { runId: "run-2" },
      sender: buildSender(),
      runtimeExposure: buildRuntimeAgentToolExposure(["open_tab"]),
    });

    expect(result.descriptor.enabledTools).toEqual([]);
    expect(result.session.enabledTools).toEqual([]);
  });

  it("resolves beyond the old active TTL, revokes explicitly, and revokes sessions by owner identity", () => {
    let now = new Date("2026-06-13T10:00:00.000Z");
    const registry = new AgentToolMcpSessionRegistry({ now: () => now });
    const service = buildService(registry);
    const created = service.createAgentToolMcpSession({
      owner: { runId: "member-run-3" },
      sender: buildSender(),
      runtimeExposure: buildRuntimeAgentToolExposure([SEND_MESSAGE_TO_TOOL_NAME]),
    });
    const token = created.descriptor.headers.Authorization.replace(/^Bearer\s+/, "");

    expect(registry.resolveSession({ sessionId: created.session.sessionId, bearerToken: token }).ok).toBe(true);
    expect(registry.resolveSession({ sessionId: created.session.sessionId, bearerToken: "wrong" })).toMatchObject({
      ok: false,
      reason: "token_mismatch",
    });

    now = new Date("2026-06-14T00:00:00.001Z");
    expect(registry.resolveSession({ sessionId: created.session.sessionId, bearerToken: token }).ok).toBe(true);
    expect(service.revokeAgentToolMcpSession(created.session.sessionId)).toBe(true);
    expect(registry.resolveSession({ sessionId: created.session.sessionId, bearerToken: token })).toMatchObject({
      ok: false,
      reason: "revoked",
    });

    const second = service.createAgentToolMcpSession({
      owner: { runId: "member-run-3" },
      sender: buildSender(),
      runtimeExposure: buildRuntimeAgentToolExposure([SEND_MESSAGE_TO_TOOL_NAME]),
    });
    const nonMatching = service.createAgentToolMcpSession({
      owner: { runId: "member-run-other" },
      sender: buildSender(),
      runtimeExposure: buildRuntimeAgentToolExposure([SEND_MESSAGE_TO_TOOL_NAME]),
    });
    const secondToken = second.descriptor.headers.Authorization.replace(/^Bearer\s+/, "");
    const nonMatchingToken = nonMatching.descriptor.headers.Authorization.replace(/^Bearer\s+/, "");
    expect(service.revokeAgentToolMcpSessionsForRun("member-run-3")).toBe(1);
    expect(registry.resolveSession({ sessionId: second.session.sessionId, bearerToken: secondToken })).toMatchObject({
      ok: false,
      reason: "revoked",
    });
    expect(registry.resolveSession({
      sessionId: nonMatching.session.sessionId,
      bearerToken: nonMatchingToken,
    }).ok).toBe(true);
  });

  it("treats a fresh in-memory registry as unable to resolve old descriptors", () => {
    const originalRegistry = new AgentToolMcpSessionRegistry();
    const service = buildService(originalRegistry);
    const created = service.createAgentToolMcpSession({
      owner: { runId: "run-restart" },
      sender: buildSender(),
      runtimeExposure: buildRuntimeAgentToolExposure([SEND_MESSAGE_TO_TOOL_NAME]),
    });
    const oldToken = created.descriptor.headers.Authorization.replace(/^Bearer\s+/, "");
    const freshRegistry = new AgentToolMcpSessionRegistry();

    expect(originalRegistry.resolveSession({
      sessionId: created.session.sessionId,
      bearerToken: oldToken,
    }).ok).toBe(true);
    expect(freshRegistry.resolveSession({
      sessionId: created.session.sessionId,
      bearerToken: oldToken,
    })).toMatchObject({ ok: false, reason: "missing_session" });
  });
});

describe("AgentToolMcpToolExecutor", () => {
  it("delegates send_message_to to the shared dispatcher and emits observer events", async () => {
    const dispatch = vi.fn(async () => ({ accepted: true, code: "DELIVERED", message: "Delivered message." }));
    const starts = vi.fn();
    const completes = vi.fn();
    const registry = new AgentToolMcpSessionRegistry();
    const { session } = registry.createSession({
      owner: { runId: "run-4" },
      sender: buildSender(),
      runtimeExposure: buildRuntimeAgentToolExposure([SEND_MESSAGE_TO_TOOL_NAME]),
      enabledTools: [SEND_MESSAGE_TO_TOOL_NAME],
      toolRoutes: {
        [SEND_MESSAGE_TO_TOOL_NAME]: {
          kind: "static_adapter",
          toolName: SEND_MESSAGE_TO_TOOL_NAME,
        },
      },
      toolExecutionObserver: {
        onToolStart: starts,
        onToolComplete: completes,
      },
    });
    const executor = new AgentToolMcpToolExecutor({
      catalog: new AgentToolMcpCatalog({ adapters: [buildSendMessageAdapter(dispatch)] }),
    });

    const result = await executor.executeAgentToolMcpCall({
      session,
      toolName: SEND_MESSAGE_TO_TOOL_NAME,
      rawArguments: { target_agent_run_id: "run-5", content: "hello" },
    });

    expect(result).toMatchObject({ kind: "operation_result", result: { accepted: true, message: "Delivered message." } });
    expect(dispatch).toHaveBeenCalledWith({
      toolName: SEND_MESSAGE_TO_TOOL_NAME,
      rawArguments: { target_agent_run_id: "run-5", content: "hello" },
      sender: session.sender,
    });
    expect(starts).toHaveBeenCalledWith({
      sessionId: session.sessionId,
      toolName: SEND_MESSAGE_TO_TOOL_NAME,
      senderRunId: "run-1",
    });
    expect(completes).toHaveBeenCalledWith(expect.objectContaining({
      accepted: true,
      code: "DELIVERED",
    }));
  });

  it("emits observer completion as rejected for raw MCP error results", async () => {
    const completes = vi.fn();
    const registry = new AgentToolMcpSessionRegistry();
    const rawMcpAdapter: AgentToolMcpToolAdapter = {
      definition: {
        name: "db_query",
        description: "Query database",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      isAvailable: () => true,
      execute: async () => toAgentToolMcpToolResult({
        content: [{ type: "text", text: "remote failure" }],
        isError: true,
      }),
    };
    const { session } = registry.createSession({
      owner: { runId: "run-raw-mcp" },
      sender: buildSender(),
      runtimeExposure: buildRuntimeAgentToolExposure(["db_query"]),
      enabledTools: ["db_query"],
      toolRoutes: {
        db_query: {
          kind: "static_adapter",
          toolName: "db_query",
        },
      },
      toolExecutionObserver: { onToolComplete: completes },
    });
    const executor = new AgentToolMcpToolExecutor({
      catalog: new AgentToolMcpCatalog({ adapters: [rawMcpAdapter] }),
    });

    await executor.executeAgentToolMcpCall({
      session,
      toolName: "db_query",
      rawArguments: {},
    });

    expect(completes).toHaveBeenCalledWith(expect.objectContaining({
      accepted: false,
      code: null,
    }));
  });
});
