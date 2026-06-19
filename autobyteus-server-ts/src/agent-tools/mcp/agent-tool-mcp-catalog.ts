import { defaultToolRegistry, type ToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import type { ConfiguredAgentToolExposure } from "../../agent-execution/shared/configured-agent-tool-exposure.js";
import type { AgentToolMcpSession } from "./agent-tool-mcp-session.js";
import type {
  AgentToolMcpAdapterProvider,
  AgentToolMcpAvailabilityContext,
  AgentToolMcpToolAdapter,
} from "./agent-tool-mcp-adapter.js";
import type { AgentToolMcpSupportedToolDefinition } from "./agent-tool-mcp-definition-provider.js";
import {
  AgentToolsMcpSchemaMapper,
  getAgentToolsMcpSchemaMapper,
  type AgentToolsMcpInputSchema,
} from "./agent-tools-mcp-schema-mapper.js";
import { buildDefaultAgentToolMcpAdapterProviders } from "./providers/default-agent-tool-mcp-adapter-providers.js";
import {
  ConfiguredMcpAgentToolSourceResolver,
} from "./configured-mcp/configured-mcp-agent-tool-source-resolver.js";
import type {
  ConfiguredMcpAgentToolSource,
  ConfiguredMcpAgentToolSourceDiagnostic,
} from "./configured-mcp/configured-mcp-agent-tool-source.js";
import { ConfiguredMcpRegistryToolAdapter } from "./configured-mcp/configured-mcp-registry-tool-adapter.js";
import {
  AGENT_TOOL_MCP_CONFIGURED_MCP_ROUTE_KIND,
  AGENT_TOOL_MCP_STATIC_ADAPTER_ROUTE_KIND,
  toConfiguredMcpToolRoute,
  toStaticAdapterToolRoute,
  type AgentToolMcpToolRouteTable,
} from "./agent-tool-mcp-tool-route.js";

export type AgentToolsMcpToolDefinition = {
  name: string;
  description: string;
  inputSchema: AgentToolsMcpInputSchema;
};

export type AgentToolMcpSessionToolExposure = {
  enabledTools: string[];
  toolRoutes: AgentToolMcpToolRouteTable;
  configuredMcpToolSources: ConfiguredMcpAgentToolSource[];
  diagnostics: ConfiguredMcpAgentToolSourceDiagnostic[];
};

export type AgentToolMcpCallAvailability =
  | { ok: true; definition: AgentToolMcpSupportedToolDefinition; adapter: AgentToolMcpToolAdapter }
  | { ok: false; reason: "unknown_tool" | "tool_not_enabled" };

export class AgentToolMcpCatalog {
  private static instance: AgentToolMcpCatalog | null = null;
  private readonly adaptersByName: Map<string, AgentToolMcpToolAdapter>;
  private readonly schemaMapper: AgentToolsMcpSchemaMapper;
  private readonly configuredMcpSourceResolver: ConfiguredMcpAgentToolSourceResolver;
  private readonly registry: Pick<ToolRegistry, "getToolDefinition" | "createTool">;

  static getInstance(): AgentToolMcpCatalog {
    if (!AgentToolMcpCatalog.instance) {
      AgentToolMcpCatalog.instance = new AgentToolMcpCatalog();
    }
    return AgentToolMcpCatalog.instance;
  }

  static resetInstance(): void {
    AgentToolMcpCatalog.instance = null;
  }

  constructor(input: {
    providers?: AgentToolMcpAdapterProvider[];
    adapters?: AgentToolMcpToolAdapter[];
    schemaMapper?: AgentToolsMcpSchemaMapper;
    configuredMcpSourceResolver?: ConfiguredMcpAgentToolSourceResolver;
    registry?: Pick<ToolRegistry, "getToolDefinition" | "createTool">;
  } = {}) {
    this.schemaMapper = input.schemaMapper ?? getAgentToolsMcpSchemaMapper();
    this.registry = input.registry ?? defaultToolRegistry;
    this.configuredMcpSourceResolver = input.configuredMcpSourceResolver ?? new ConfiguredMcpAgentToolSourceResolver({
      registry: this.registry,
    });
    const adapters = input.adapters ?? (input.providers ?? buildDefaultAgentToolMcpAdapterProviders())
      .flatMap((provider) => provider.getAdapters());
    this.adaptersByName = new Map();
    for (const adapter of adapters) {
      const toolName = adapter.definition.name;
      if (this.adaptersByName.has(toolName)) {
        throw new Error(`Duplicate Agent Tools MCP adapter '${toolName}'.`);
      }
      this.adaptersByName.set(toolName, adapter);
    }
  }

  listSupportedToolNames(): string[] {
    return Array.from(this.adaptersByName.keys());
  }

  resolveConfiguredSupportedToolNames(
    input: ConfiguredAgentToolExposure | AgentToolMcpAvailabilityContext,
  ): string[] {
    return this.resolveConfiguredSessionToolExposure(input).enabledTools;
  }

  resolveConfiguredSessionToolExposure(
    input: ConfiguredAgentToolExposure | AgentToolMcpAvailabilityContext,
  ): AgentToolMcpSessionToolExposure {
    const context = this.normalizeAvailabilityContext(input);
    const configuredToolNames = normalizeToolNames(context.configuredExposure.configuredToolNames);
    const activeStaticAdapters = this.resolveActiveStaticAdapters(configuredToolNames, context);
    const protectedStaticAdapters = this.resolveProtectedStaticAdapters(configuredToolNames);
    const configuredMcpResolution = this.configuredMcpSourceResolver.resolve({
      configuredToolNames,
    });
    const configuredMcpSourcesByName = new Map(
      configuredMcpResolution.sources.map((source) => [source.registeredToolName, source]),
    );

    const toolRoutes: AgentToolMcpToolRouteTable = {};
    const configuredMcpToolSources: ConfiguredMcpAgentToolSource[] = [];
    const diagnostics: ConfiguredMcpAgentToolSourceDiagnostic[] = [
      ...configuredMcpResolution.diagnostics,
    ];

    for (const toolName of configuredToolNames) {
      const mcpSource = configuredMcpSourcesByName.get(toolName) ?? null;
      const activeStaticAdapter = activeStaticAdapters.get(toolName) ?? null;
      const protectedStaticAdapter = protectedStaticAdapters.get(toolName) ?? null;

      if (mcpSource) {
        if (protectedStaticAdapter) {
          if (activeStaticAdapter) {
            toolRoutes[toolName] = toStaticAdapterToolRoute(toolName);
          }
          diagnostics.push(this.buildProtectedStaticCollisionDiagnostic(toolName));
          continue;
        }

        toolRoutes[toolName] = toConfiguredMcpToolRoute(mcpSource);
        configuredMcpToolSources.push(mcpSource);
        continue;
      }

      if (activeStaticAdapter) {
        toolRoutes[toolName] = toStaticAdapterToolRoute(toolName);
      }
    }

    for (const diagnostic of diagnostics) {
      if (diagnostic.code === "configured_mcp_tool_collision") {
        console.warn(diagnostic.message);
      }
    }

    return {
      enabledTools: Object.keys(toolRoutes),
      toolRoutes,
      configuredMcpToolSources,
      diagnostics,
    };
  }

  listMcpToolsForSession(session: AgentToolMcpSession): AgentToolsMcpToolDefinition[] {
    return session.enabledTools
      .map((toolName) => {
        const route = session.toolRoutes[toolName];
        if (!route) {
          return null;
        }
        if (route.kind === AGENT_TOOL_MCP_STATIC_ADAPTER_ROUTE_KIND) {
          return this.buildStaticMcpToolDefinition(route.toolName);
        }
        return this.buildConfiguredMcpToolDefinition(route);
      })
      .filter((definition): definition is AgentToolsMcpToolDefinition => Boolean(definition));
  }

  resolveToolCallAvailability(
    session: AgentToolMcpSession,
    toolName: string,
  ): AgentToolMcpCallAvailability {
    const route = session.toolRoutes[toolName] ?? null;
    if (!route) {
      return this.adaptersByName.has(toolName)
        ? { ok: false, reason: "tool_not_enabled" }
        : { ok: false, reason: "unknown_tool" };
    }
    if (!session.enabledTools.includes(toolName)) {
      return { ok: false, reason: "tool_not_enabled" };
    }

    if (route.kind === AGENT_TOOL_MCP_STATIC_ADAPTER_ROUTE_KIND) {
      const adapter = this.adaptersByName.get(route.toolName) ?? null;
      if (!adapter) {
        return { ok: false, reason: "unknown_tool" };
      }
      return { ok: true, definition: adapter.definition, adapter };
    }

    if (route.kind !== AGENT_TOOL_MCP_CONFIGURED_MCP_ROUTE_KIND) {
      return { ok: false, reason: "unknown_tool" };
    }
    const definition = this.buildConfiguredMcpSupportedDefinition(route);
    if (!definition) {
      return { ok: false, reason: "unknown_tool" };
    }
    return {
      ok: true,
      definition,
      adapter: new ConfiguredMcpRegistryToolAdapter({
        source: route,
        definition,
        registry: this.registry,
      }),
    };
  }

  private normalizeAvailabilityContext(
    input: ConfiguredAgentToolExposure | AgentToolMcpAvailabilityContext,
  ): AgentToolMcpAvailabilityContext {
    if ("configuredExposure" in input) {
      return input;
    }
    return {
      configuredExposure: input,
      sender: null,
      executionContext: {},
    };
  }

  private resolveActiveStaticAdapters(
    configuredToolNames: string[],
    context: AgentToolMcpAvailabilityContext,
  ): Map<string, AgentToolMcpToolAdapter> {
    const activeAdapters = new Map<string, AgentToolMcpToolAdapter>();
    for (const toolName of configuredToolNames) {
      const adapter = this.adaptersByName.get(toolName);
      if (adapter?.isAvailable(context)) {
        activeAdapters.set(toolName, adapter);
      }
    }
    return activeAdapters;
  }

  private resolveProtectedStaticAdapters(
    configuredToolNames: string[],
  ): Map<string, AgentToolMcpToolAdapter> {
    const protectedAdapters = new Map<string, AgentToolMcpToolAdapter>();
    for (const toolName of configuredToolNames) {
      const adapter = this.adaptersByName.get(toolName);
      if (adapter && this.isStaticAdapterProtected(adapter)) {
        protectedAdapters.set(toolName, adapter);
      }
    }
    return protectedAdapters;
  }

  private isStaticAdapterProtected(adapter: AgentToolMcpToolAdapter): boolean {
    return (adapter.configuredMcpCollisionPolicy ?? "protect_static_adapter") === "protect_static_adapter";
  }

  private buildProtectedStaticCollisionDiagnostic(
    registeredToolName: string,
  ): ConfiguredMcpAgentToolSourceDiagnostic {
    return {
      code: "configured_mcp_tool_collision",
      registeredToolName,
      message: `Configured MCP tool '${registeredToolName}' was not exposed because it collides with a protected Agent Tools MCP adapter.`,
    };
  }

  private buildStaticMcpToolDefinition(toolName: string): AgentToolsMcpToolDefinition {
    const adapter = this.adaptersByName.get(toolName);
    if (!adapter) {
      throw new Error(`Unsupported Agent Tools MCP definition '${toolName}'.`);
    }
    return this.toMcpToolDefinition(adapter.definition);
  }

  private buildConfiguredMcpToolDefinition(
    source: ConfiguredMcpAgentToolSource,
  ): AgentToolsMcpToolDefinition | null {
    const definition = this.buildConfiguredMcpSupportedDefinition(source);
    return definition ? this.toMcpToolDefinition(definition) : null;
  }

  private buildConfiguredMcpSupportedDefinition(
    source: ConfiguredMcpAgentToolSource,
  ): AgentToolMcpSupportedToolDefinition | null {
    const definition = this.registry.getToolDefinition(source.registeredToolName);
    if (
      !definition ||
      definition.origin !== ToolOrigin.MCP ||
      definition.metadata?.["mcp_server_id"] !== source.mcpServerId
    ) {
      return null;
    }
    return {
      name: definition.name,
      description: definition.description,
      inputSchema: definition.argumentSchema ?? {},
    };
  }

  private toMcpToolDefinition(
    definition: AgentToolMcpSupportedToolDefinition,
  ): AgentToolsMcpToolDefinition {
    return {
      name: definition.name,
      description: definition.description,
      inputSchema: this.schemaMapper.toMcpInputSchema(definition.inputSchema),
    };
  }
}

export const getAgentToolMcpCatalog = (): AgentToolMcpCatalog =>
  AgentToolMcpCatalog.getInstance();

export const resetAgentToolMcpCatalogForTests = (): void => {
  AgentToolMcpCatalog.resetInstance();
};

const normalizeToolNames = (toolNames: Iterable<string>): string[] => [
  ...new Set(
    Array.from(toolNames)
      .map((toolName) => toolName.trim())
      .filter(Boolean),
  ),
];
