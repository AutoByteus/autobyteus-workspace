import { describe, expect, it, vi } from "vitest";
import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../../src/agent-communication/services/send-message-to-tool-contract.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionRegistry } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { AgentToolMcpSessionService } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { AgentToolMcpToolExecutor } from "../../../../src/agent-tools/mcp/agent-tool-mcp-tool-executor.js";
import {
  toAgentToolMcpOperationResult,
  toAgentToolMcpToolResult,
  type AgentToolMcpToolAdapter,
} from "../../../../src/agent-tools/mcp/agent-tool-mcp-adapter.js";
import {
  testMemberTaskRootResolver,
  testMemberTeamContext,
} from "../../../fixtures/current-team-run-fixtures.js";

const createPublisher = () => ({ publishManyForRun: vi.fn(async () => []) });

const buildSender = (runId = "run-1") => buildAgentRunMessageSenderContext({
  senderRunId: runId,
  senderName: runId,
});

const buildSendMessageAdapter = (
  dispatch: ReturnType<typeof vi.fn> = vi.fn(),
): AgentToolMcpToolAdapter => ({
  definition: {
    name: SEND_MESSAGE_TO_TOOL_NAME,
    description: "Send a message",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  isAvailable: () => true,
  execute: async ({ session, rawArguments }) =>
    toAgentToolMcpOperationResult(await dispatch({
      toolName: SEND_MESSAGE_TO_TOOL_NAME,
      rawArguments,
      sender: session.sender,
    })),
});

const buildService = (
  registry = new AgentToolMcpSessionRegistry(),
  catalog = new AgentToolMcpCatalog({ adapters: [buildSendMessageAdapter()] }),
  getLocalBaseUrl: () => string = () => "http://127.0.0.1:43124",
) => new AgentToolMcpSessionService({
  registry,
  catalog,
  getLocalBaseUrl,
  executionCapabilities: { publishedArtifactPublisher: createPublisher() },
});

class FakeConfiguredMcpTool extends BaseTool {
  static getDescription(): string { return "Fake configured MCP tool"; }
  static getArgumentSchema(): ParameterSchema | null { return null; }
  protected async _execute(): Promise<unknown> {
    return { content: [{ type: "text", text: "ok" }] };
  }
}

class FakeToolRegistry {
  private readonly definitions = new Map<string, ToolDefinition>();
  register(definition: ToolDefinition): void { this.definitions.set(definition.name, definition); }
  getToolDefinition(name: string): ToolDefinition | undefined { return this.definitions.get(name); }
  createTool(name: string): BaseTool {
    const definition = this.definitions.get(name);
    if (!definition) throw new Error(`No definition for ${name}`);
    const tool = definition.customFactory!();
    tool.definition = definition;
    return tool;
  }
}

describe("AgentToolMcpSessionService", () => {
  it("activates a deterministic headerless descriptor and active-only record", () => {
    const registry = new AgentToolMcpSessionRegistry();
    const service = buildService(registry);
    const activation = service.activateForRun({
      owner: { runId: "  run-1  " },
      sender: buildSender(),
      runtimeExposure: buildRuntimeAgentToolExposure([SEND_MESSAGE_TO_TOOL_NAME]),
    });

    expect(activation).toMatchObject({
      kind: "active",
      sessionId: "agtrun_TmXT--itZTVoGwIbMHhbErbA4_iHiFmkFIs_WLiDXbA",
      descriptor: {
        name: "autobyteus_agent_tools",
        transport: "streamable_http",
        enabledTools: [SEND_MESSAGE_TO_TOOL_NAME],
      },
    });
    if (activation.kind !== "active") throw new Error("Expected active result.");
    expect(activation.descriptor.serverUrl).toBe(
      `http://127.0.0.1:43124/mcp/agent-tools/${activation.sessionId}`,
    );
    expect(activation.descriptor).not.toHaveProperty("headers");
    expect(registry.resolveSession(activation.sessionId)).toMatchObject({
      ok: true,
      session: { owner: { runId: "run-1" } },
    });
    expect(Object.isFrozen(activation)).toBe(true);
    expect(Object.isFrozen(activation.descriptor)).toBe(true);
  });

  it("returns not_exposed without reading readiness or inserting a record", () => {
    const registry = new AgentToolMcpSessionRegistry();
    const getLocalBaseUrl = vi.fn(() => { throw new Error("not ready"); });
    const result = buildService(registry, undefined, getLocalBaseUrl).activateForRun({
      owner: { runId: "run-hidden" },
      sender: buildSender("run-hidden"),
      runtimeExposure: buildRuntimeAgentToolExposure([]),
    });

    expect(result).toEqual({ kind: "not_exposed" });
    expect(getLocalBaseUrl).not.toHaveBeenCalled();
    expect(registry.listSessions()).toEqual([]);
  });

  it("fails before insertion when the owned local listener is not ready", () => {
    const registry = new AgentToolMcpSessionRegistry();
    const service = buildService(registry, undefined, () => {
      throw new Error("local listener not ready");
    });
    expect(() => service.activateForRun({
      owner: { runId: "run-not-ready" },
      sender: buildSender("run-not-ready"),
      runtimeExposure: buildRuntimeAgentToolExposure([SEND_MESSAGE_TO_TOOL_NAME]),
    })).toThrow("local listener not ready");
    expect(registry.listSessions()).toEqual([]);
  });

  it("composes configured MCP routes into the active record", () => {
    const registry = new AgentToolMcpSessionRegistry();
    const toolRegistry = new FakeToolRegistry();
    toolRegistry.register(new ToolDefinition(
      "db_query",
      "Query database",
      ToolOrigin.MCP,
      "MCP",
      () => new ParameterSchema(),
      () => null,
      {
        customFactory: () => new FakeConfiguredMcpTool(),
        metadata: { mcp_server_id: "sqlite" },
      },
    ));
    const catalog = new AgentToolMcpCatalog({
      adapters: [buildSendMessageAdapter()],
      registry: toolRegistry as never,
    });
    const result = buildService(registry, catalog).activateForRun({
      owner: { runId: "run-configured" },
      sender: buildSender("run-configured"),
      runtimeExposure: buildRuntimeAgentToolExposure([
        "db_query",
        SEND_MESSAGE_TO_TOOL_NAME,
      ]),
    });
    if (result.kind !== "active") throw new Error("Expected active result.");
    const resolved = registry.resolveSession(result.sessionId);
    if (!resolved.ok) throw new Error("Expected active record.");
    expect(resolved.session.configuredMcpToolSources).toEqual([
      { kind: "configured_mcp_tool", registeredToolName: "db_query", mcpServerId: "sqlite" },
    ]);
    expect(resolved.session.toolRoutes.db_query).toEqual({
      kind: "configured_mcp_tool",
      registeredToolName: "db_query",
      mcpServerId: "sqlite",
    });
  });

  it("builds exact Team-member capabilities and rejects mismatched ownership", () => {
    const registry = new AgentToolMcpSessionRegistry();
    const rootResolver = testMemberTaskRootResolver();
    const memberTeamContext = testMemberTeamContext({
      rootTeamRunId: "root-team",
      memberAddress: "/researcher",
      agentRunId: "researcher-run",
      taskRootResolver: rootResolver,
    });
    const service = buildService(registry);
    const result = service.activateForRun({
      owner: { runId: "researcher-run", teamIdentity: memberTeamContext.identity },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: "researcher-run",
        memberTeamContext,
      }),
      runtimeExposure: buildRuntimeAgentToolExposure([SEND_MESSAGE_TO_TOOL_NAME]),
    });
    if (result.kind !== "active") throw new Error("Expected active result.");
    const resolved = registry.resolveSession(result.sessionId);
    if (!resolved.ok || resolved.session.executionCapabilities.kind !== "team_member") {
      throw new Error("Expected Team-member capabilities.");
    }
    expect(resolved.session.executionCapabilities.taskDelegation.rootResolver).toBe(rootResolver);

    expect(() => service.activateForRun({
      owner: { runId: "other-run", teamIdentity: memberTeamContext.identity },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: "researcher-run",
        memberTeamContext,
      }),
      runtimeExposure: buildRuntimeAgentToolExposure([SEND_MESSAGE_TO_TOOL_NAME]),
    })).toThrow("does not match");
  });
});

describe("AgentToolMcpToolExecutor", () => {
  it("dispatches with current live sender context and emits observer events", async () => {
    const dispatch = vi.fn(async () => ({ accepted: true, code: "DELIVERED", message: "Delivered." }));
    const starts = vi.fn();
    const completes = vi.fn();
    const registry = new AgentToolMcpSessionRegistry();
    const session = registry.activateSession({
      owner: { runId: "run-executor" },
      sender: buildSender("run-executor"),
      runtimeExposure: buildRuntimeAgentToolExposure([SEND_MESSAGE_TO_TOOL_NAME]),
      executionCapabilities: { kind: "agent", publishedArtifactPublisher: createPublisher() },
      enabledTools: [SEND_MESSAGE_TO_TOOL_NAME],
      toolRoutes: {
        [SEND_MESSAGE_TO_TOOL_NAME]: {
          kind: "static_adapter",
          toolName: SEND_MESSAGE_TO_TOOL_NAME,
        },
      },
      toolExecutionObserver: { onToolStart: starts, onToolComplete: completes },
    });
    const executor = new AgentToolMcpToolExecutor({
      catalog: new AgentToolMcpCatalog({ adapters: [buildSendMessageAdapter(dispatch)] }),
    });

    await executor.executeAgentToolMcpCall({
      session,
      toolName: SEND_MESSAGE_TO_TOOL_NAME,
      rawArguments: { content: "hello" },
    });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ sender: session.sender }));
    expect(starts).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: session.sessionId,
      senderRunId: "run-executor",
    }));
    expect(completes).toHaveBeenCalledWith(expect.objectContaining({ accepted: true }));
  });

  it("reports raw MCP semantic errors as rejected observer completions", async () => {
    const completes = vi.fn();
    const adapter: AgentToolMcpToolAdapter = {
      definition: {
        name: "db_query",
        description: "Query database",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      isAvailable: () => true,
      execute: async () => toAgentToolMcpToolResult({
        content: [{ type: "text", text: "failed" }],
        isError: true,
      }),
    };
    const registry = new AgentToolMcpSessionRegistry();
    const session = registry.activateSession({
      owner: { runId: "run-error" },
      sender: buildSender("run-error"),
      runtimeExposure: buildRuntimeAgentToolExposure(["db_query"]),
      executionCapabilities: { kind: "agent", publishedArtifactPublisher: createPublisher() },
      enabledTools: ["db_query"],
      toolRoutes: { db_query: { kind: "static_adapter", toolName: "db_query" } },
      toolExecutionObserver: { onToolComplete: completes },
    });
    await new AgentToolMcpToolExecutor({
      catalog: new AgentToolMcpCatalog({ adapters: [adapter] }),
    }).executeAgentToolMcpCall({ session, toolName: "db_query", rawArguments: {} });
    expect(completes).toHaveBeenCalledWith(expect.objectContaining({ accepted: false }));
  });
});
