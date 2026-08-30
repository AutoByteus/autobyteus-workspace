import { describe, expect, it } from "vitest";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { BrowserToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/browser-tools-mcp-adapter-provider.js";
import { MediaToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/media-tools-mcp-adapter-provider.js";
import { PublishArtifactsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/publish-artifacts-mcp-adapter-provider.js";
import { SendMessageToMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/send-message-to-mcp-adapter-provider.js";
import { TaskDelegationToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.js";
import type { AgentToolMcpToolAdapter } from "../../../../src/agent-tools/mcp/agent-tool-mcp-adapter.js";
import type { AgentToolMcpToolRouteTable } from "../../../../src/agent-tools/mcp/agent-tool-mcp-tool-route.js";

const sender = buildAgentRunMessageSenderContext({
  senderRunId: "run-1",
  senderName: "agent",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

const memberSender = buildAgentRunMessageSenderContext({
  senderRunId: "member-run-1",
  senderName: "member",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  memberTeamContext: {
    teamRunId: "team-1",
    teamDefinitionId: "team-def",
    teamName: "team",
    teamBackendKind: "MIXED",
    memberName: "member",
    memberPath: ["member"],
    memberRouteKey: "member",
    memberRunId: "member-run-1",
    coordinatorMemberRouteKey: null,
    members: [],
  } as any,
});

const createCatalog = (browserSupported: boolean): AgentToolMcpCatalog =>
  new AgentToolMcpCatalog({
    providers: [
      new SendMessageToMcpAdapterProvider({ dispatch: async () => ({ accepted: true }) } as any),
      new BrowserToolsMcpAdapterProvider({ isBrowserSupported: () => browserSupported } as any),
      new MediaToolsMcpAdapterProvider({} as any),
      new TaskDelegationToolsMcpAdapterProvider({} as any),
      new PublishArtifactsMcpAdapterProvider({} as any),
    ],
  });

describe("AgentToolMcpCatalog", () => {
  it("resolves configured supported tools across families with browser and team availability gates", () => {
    const exposure = buildRuntimeAgentToolExposure([
      "send_message_to",
      "open_tab",
      "generate_image",
      "delegate_task",
      "publish_artifacts",
      "unknown_tool",
    ]);

    expect(createCatalog(false).resolveConfiguredSupportedToolNames({
      runtimeExposure: exposure,
      sender,
      executionContext: { workingDirectory: "/tmp/workspace" },
      applicationAgentTools: null,
    })).toEqual(["send_message_to", "generate_image", "publish_artifacts"]);

    expect(createCatalog(true).resolveConfiguredSupportedToolNames({
      runtimeExposure: exposure,
      sender: memberSender,
      executionContext: { workingDirectory: "/tmp/workspace" },
      applicationAgentTools: null,
    })).toEqual([
      "send_message_to",
      "open_tab",
      "generate_image",
      "delegate_task",
      "publish_artifacts",
    ]);
  });
});

class FakeConfiguredMcpTool extends BaseTool {
  constructor(private readonly result: unknown = { content: [{ type: "text", text: "ok" }] }) {
    super();
  }
  static getDescription(): string { return "Fake configured MCP tool"; }
  static getArgumentSchema(): ParameterSchema | null { return null; }
  protected async _execute(): Promise<unknown> { return this.result; }
}

const buildMcpDefinition = (
  name: string,
  serverId: string,
  result: unknown = { content: [{ type: "text", text: "ok" }] },
): ToolDefinition => new ToolDefinition(
  name,
  `Description for ${name}`,
  ToolOrigin.MCP,
  "MCP",
  () => new ParameterSchema(),
  () => null,
  {
    customFactory: () => new FakeConfiguredMcpTool(result),
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

const buildStaticAdapter = (input: {
  name: string;
  available: boolean;
  collisionPolicy?: AgentToolMcpToolAdapter["configuredMcpCollisionPolicy"];
  text?: string;
}): AgentToolMcpToolAdapter => ({
  definition: {
    name: input.name,
    description: `Static ${input.name}`,
    inputSchema: {},
  },
  configuredMcpCollisionPolicy: input.collisionPolicy,
  isAvailable: () => input.available,
  execute: async () => ({
    kind: "mcp_tool_result",
    result: { content: [{ type: "text", text: input.text ?? `static:${input.name}` }] },
  }),
});

const buildApplicationAvailabilityContext = (toolName: string) => {
  const route = Object.freeze({
    kind: "application_agent_tool" as const,
    identity: Object.freeze({
      applicationId: "app-a",
      bindingId: "binding-a",
      producer: Object.freeze({ kind: "agent" as const, agentRunId: "run-1" }),
    }),
    declarationSnapshot: Object.freeze({
      declaration: Object.freeze({
        name: toolName,
        description: `Application ${toolName}`,
        inputSchema: Object.freeze({
          type: "object" as const,
          properties: Object.freeze({}),
          required: Object.freeze([]),
        }),
      }),
      fingerprint: `fingerprint-${toolName}`,
    }),
  });
  return {
    runtimeExposure: buildRuntimeAgentToolExposure([toolName]),
    sender,
    executionContext: {
      applicationExecutionContext: {
        applicationId: "app-a",
        bindingId: "binding-a",
        producer: { agentRunId: "run-1", displayName: "agent" },
      },
    },
    applicationAgentTools: {
      resolveSelectedRoutes: ({ requestedToolNames }: { requestedToolNames: readonly string[] }) =>
        new Map(requestedToolNames.includes(toolName) ? [[toolName, route]] : []),
      invoke: async () => ({ content: [] }),
      close: () => undefined,
    },
  };
};

const buildSession = (input: {
  enabledTools: string[];
  toolRoutes: AgentToolMcpToolRouteTable;
  configuredMcpToolSources: any[];
  owner?: { runId: string; memberRunId?: string };
}) => ({
  sessionId: "agtrun_TmXT--itZTVoGwIbMHhbErbA4_iHiFmkFIs_WLiDXbA",
  owner: input.owner ?? { runId: "run" },
  sender,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  runtimeExposure: buildRuntimeAgentToolExposure(input.enabledTools),
  executionContext: {},
  enabledTools: input.enabledTools,
  toolRoutes: input.toolRoutes,
  configuredMcpToolSources: input.configuredMcpToolSources,
  createdAt: new Date(),
  toolExecutionObserver: null,
});

describe("AgentToolMcpCatalog configured MCP bridge", () => {
  it("lists every registered static adapter name independent of availability and configured policy", () => {
    const catalog = new AgentToolMcpCatalog({
      adapters: [
        buildStaticAdapter({
          name: "z_inactive_preferred",
          available: false,
          collisionPolicy: "prefer_configured_mcp",
        }),
        buildStaticAdapter({
          name: "a_active_protected",
          available: true,
          collisionPolicy: "protect_static_adapter",
        }),
      ],
    });

    expect(catalog.listStaticAdapterToolNames()).toEqual([
      "a_active_protected",
      "z_inactive_preferred",
    ]);
  });

  it("rejects an application open_tab route owned by a configured-preferred static adapter", () => {
    const registry = new FakeToolRegistry();
    registry.register(buildMcpDefinition("open_tab", "browser-server"));
    const catalog = new AgentToolMcpCatalog({
      adapters: [buildStaticAdapter({
        name: "open_tab",
        available: true,
        collisionPolicy: "prefer_configured_mcp",
      })],
      registry: registry as any,
    });

    expect(() => catalog.resolveRuntimeSessionToolExposure(
      buildApplicationAvailabilityContext("open_tab") as any,
    )).toThrow("collides with a registered Agent Tools MCP static adapter");
  });

  it("rejects an application route owned by a configured-protected static adapter", () => {
    const catalog = new AgentToolMcpCatalog({
      adapters: [buildStaticAdapter({
        name: "send_message_to",
        available: true,
        collisionPolicy: "protect_static_adapter",
      })],
    });

    expect(() => catalog.resolveRuntimeSessionToolExposure(
      buildApplicationAvailabilityContext("send_message_to") as any,
    )).toThrow("collides with a registered Agent Tools MCP static adapter");
  });

  it("rejects an application route even when the registered static adapter is inactive", () => {
    const catalog = new AgentToolMcpCatalog({
      adapters: [buildStaticAdapter({
        name: "inactive_static",
        available: false,
        collisionPolicy: "prefer_configured_mcp",
      })],
    });

    expect(() => catalog.resolveRuntimeSessionToolExposure(
      buildApplicationAvailabilityContext("inactive_static") as any,
    )).toThrow("collides with a registered Agent Tools MCP static adapter");
  });

  it("keeps a non-static application route authoritative over configured MCP", () => {
    const registry = new FakeToolRegistry();
    registry.register(buildMcpDefinition("db_query", "sqlite"));
    const catalog = new AgentToolMcpCatalog({ adapters: [], registry: registry as any });

    const exposure = catalog.resolveRuntimeSessionToolExposure(
      buildApplicationAvailabilityContext("db_query") as any,
    );

    expect(exposure.enabledTools).toEqual(["db_query"]);
    expect(exposure.toolRoutes.db_query?.kind).toBe("application_agent_tool");
    expect(exposure.configuredMcpToolSources).toEqual([]);
  });

  it("adds selected MCP-origin registry tools to session exposure and tools/list", () => {
    const registry = new FakeToolRegistry();
    registry.register(buildMcpDefinition("db_query", "sqlite"));
    const catalog = new AgentToolMcpCatalog({
      adapters: [],
      registry: registry as any,
    });

    const exposure = catalog.resolveRuntimeSessionToolExposure(buildRuntimeAgentToolExposure([
      "db_query",
    ]));

    expect(exposure.enabledTools).toEqual(["db_query"]);
    expect(exposure.configuredMcpToolSources).toEqual([
      { kind: "configured_mcp_tool", registeredToolName: "db_query", mcpServerId: "sqlite" },
    ]);
    expect(exposure.diagnostics).toEqual([]);

    const tools = catalog.listMcpToolsForSession(buildSession({
      enabledTools: exposure.enabledTools,
      toolRoutes: exposure.toolRoutes,
      configuredMcpToolSources: exposure.configuredMcpToolSources,
    }) as any, "2025-03-26");

    expect(tools).toEqual([
      {
        name: "db_query",
        description: "Description for db_query",
        inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      },
    ]);
  });

  it("keeps built-in adapter names authoritative when a configured MCP tool collides", () => {
    const registry = new FakeToolRegistry();
    registry.register(buildMcpDefinition("send_message_to", "server-a"));
    const [sendMessageAdapter] = new SendMessageToMcpAdapterProvider({
      dispatch: async () => ({ accepted: true }),
    } as any).getAdapters();
    const catalog = new AgentToolMcpCatalog({
      adapters: [sendMessageAdapter!],
      registry: registry as any,
    });

    const exposure = catalog.resolveRuntimeSessionToolExposure(buildRuntimeAgentToolExposure([
      "send_message_to",
    ]));

    expect(exposure.enabledTools).toEqual(["send_message_to"]);
    expect(exposure.configuredMcpToolSources).toEqual([]);
    expect(exposure.diagnostics).toEqual([expect.objectContaining({
      code: "configured_mcp_tool_collision",
      registeredToolName: "send_message_to",
    })]);
  });

  it("routes a configured MCP browser tool when the embedded browser adapter is inactive", async () => {
    const registry = new FakeToolRegistry();
    registry.register(buildMcpDefinition("open_tab", "browser-server", {
      content: [{ type: "text", text: "mcp-open-tab" }],
    }));
    const catalog = new AgentToolMcpCatalog({
      adapters: [buildStaticAdapter({
        name: "open_tab",
        available: false,
        collisionPolicy: "prefer_configured_mcp",
      })],
      registry: registry as any,
    });

    const exposure = catalog.resolveRuntimeSessionToolExposure(
      buildRuntimeAgentToolExposure(["open_tab"]),
    );

    expect(exposure.enabledTools).toEqual(["open_tab"]);
    expect(exposure.toolRoutes.open_tab).toEqual({
      kind: "configured_mcp_tool",
      registeredToolName: "open_tab",
      mcpServerId: "browser-server",
    });
    expect(catalog.listMcpToolsForSession(buildSession({
      enabledTools: exposure.enabledTools,
      toolRoutes: exposure.toolRoutes,
      configuredMcpToolSources: exposure.configuredMcpToolSources,
    }) as any, "2025-03-26")).toHaveLength(1);

    const session = buildSession({
      enabledTools: exposure.enabledTools,
      toolRoutes: exposure.toolRoutes,
      configuredMcpToolSources: exposure.configuredMcpToolSources,
    }) as any;
    const availability = catalog.resolveToolCallAvailability(session, "open_tab");
    expect(availability.ok).toBe(true);
    if (!availability.ok) {
      throw new Error("Expected open_tab to route to configured MCP.");
    }
    await expect(availability.adapter.execute({ session, rawArguments: {} })).resolves.toMatchObject({
      kind: "mcp_tool_result",
      result: { content: [{ type: "text", text: "mcp-open-tab" }] },
    });
  });

  it("preserves configured browser precedence when no application route exists", async () => {
    const registry = new FakeToolRegistry();
    registry.register(buildMcpDefinition("open_tab", "browser-server", {
      content: [{ type: "text", text: "mcp-open-tab" }],
    }));
    const catalog = new AgentToolMcpCatalog({
      adapters: [buildStaticAdapter({
        name: "open_tab",
        available: true,
        collisionPolicy: "prefer_configured_mcp",
        text: "static-open-tab",
      })],
      registry: registry as any,
    });

    const exposure = catalog.resolveRuntimeSessionToolExposure(
      buildRuntimeAgentToolExposure(["open_tab"]),
    );
    const session = buildSession({
      enabledTools: exposure.enabledTools,
      toolRoutes: exposure.toolRoutes,
      configuredMcpToolSources: exposure.configuredMcpToolSources,
    }) as any;

    expect(exposure.enabledTools).toEqual(["open_tab"]);
    expect(exposure.toolRoutes.open_tab?.kind).toBe("configured_mcp_tool");
    expect(catalog.listMcpToolsForSession(session, "2025-03-26").map((tool) => tool.name)).toEqual(["open_tab"]);

    const availability = catalog.resolveToolCallAvailability(session, "open_tab");
    expect(availability.ok).toBe(true);
    if (!availability.ok) {
      throw new Error("Expected open_tab to route to configured MCP.");
    }
    await expect(availability.adapter.execute({ session, rawArguments: {} })).resolves.toMatchObject({
      result: { content: [{ type: "text", text: "mcp-open-tab" }] },
    });
  });

  it("uses the embedded browser adapter when it is active and no configured MCP duplicate exists", () => {
    const catalog = new AgentToolMcpCatalog({
      adapters: [buildStaticAdapter({
        name: "open_tab",
        available: true,
        collisionPolicy: "prefer_configured_mcp",
      })],
      registry: new FakeToolRegistry() as any,
    });

    const exposure = catalog.resolveRuntimeSessionToolExposure(
      buildRuntimeAgentToolExposure(["open_tab"]),
    );

    expect(exposure.enabledTools).toEqual(["open_tab"]);
    expect(exposure.toolRoutes.open_tab).toEqual({
      kind: "static_adapter",
      toolName: "open_tab",
    });
  });

  it("resolves configured MCP calls through a registry-backed adapter", async () => {
    const registry = new FakeToolRegistry();
    registry.register(buildMcpDefinition("db_query", "sqlite", {
      content: [{ type: "text", text: "rows" }],
      structuredContent: { count: 1 },
    }));
    const catalog = new AgentToolMcpCatalog({ adapters: [], registry: registry as any });
    const exposure = catalog.resolveRuntimeSessionToolExposure(
      buildRuntimeAgentToolExposure(["db_query"]),
    );
    const session = buildSession({
      enabledTools: exposure.enabledTools,
      toolRoutes: exposure.toolRoutes,
      configuredMcpToolSources: exposure.configuredMcpToolSources,
      owner: { runId: "run", memberRunId: "member-run" },
    }) as any;

    const availability = catalog.resolveToolCallAvailability(session, "db_query");

    expect(availability.ok).toBe(true);
    if (!availability.ok) {
      throw new Error("Expected configured MCP tool to be available.");
    }
    await expect(availability.adapter.execute({ session, rawArguments: { sql: "select 1" } })).resolves.toEqual({
      kind: "mcp_tool_result",
      result: {
        content: [{ type: "text", text: "rows" }],
        structuredContent: { count: 1 },
      },
    });
  });

  it("fails closed when a session configured MCP source no longer matches the registry", () => {
    const registry = new FakeToolRegistry();
    registry.register(buildMcpDefinition("db_query", "sqlite"));
    const catalog = new AgentToolMcpCatalog({ adapters: [], registry: registry as any });
    const exposure = catalog.resolveRuntimeSessionToolExposure(buildRuntimeAgentToolExposure(["db_query"]));
    registry.register(buildMcpDefinition("db_query", "different-server"));

    expect(catalog.resolveToolCallAvailability(buildSession({
      enabledTools: exposure.enabledTools,
      toolRoutes: exposure.toolRoutes,
      configuredMcpToolSources: exposure.configuredMcpToolSources,
    }) as any, "db_query")).toEqual({ ok: false, reason: "unknown_tool" });
  });
});
