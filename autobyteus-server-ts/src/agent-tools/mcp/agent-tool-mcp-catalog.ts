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

export type AgentToolsMcpToolDefinition = {
  name: string;
  description: string;
  inputSchema: AgentToolsMcpInputSchema;
};

export type AgentToolMcpSessionToolExposure = {
  enabledTools: string[];
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
    const configuredToolNames = new Set(context.configuredExposure.configuredToolNames);
    const enabledTools: string[] = [];
    for (const toolName of this.listSupportedToolNames()) {
      const adapter = this.adaptersByName.get(toolName);
      if (adapter && configuredToolNames.has(toolName) && adapter.isAvailable(context)) {
        enabledTools.push(toolName);
      }
    }

    const configuredMcpResolution = this.configuredMcpSourceResolver.resolve({
      configuredToolNames,
      reservedToolNames: this.listSupportedToolNames(),
    });
    for (const diagnostic of configuredMcpResolution.diagnostics) {
      if (diagnostic.code === "configured_mcp_tool_collision") {
        console.warn(diagnostic.message);
      }
    }
    enabledTools.push(...configuredMcpResolution.sources.map((source) => source.registeredToolName));

    return {
      enabledTools: [...new Set(enabledTools)],
      configuredMcpToolSources: configuredMcpResolution.sources,
      diagnostics: configuredMcpResolution.diagnostics,
    };
  }

  listMcpToolsForSession(session: AgentToolMcpSession): AgentToolsMcpToolDefinition[] {
    const enabledTools = new Set(session.enabledTools);
    const staticDefinitions = this.listSupportedToolNames()
      .filter((toolName) => enabledTools.has(toolName))
      .map((toolName) => this.buildStaticMcpToolDefinition(toolName));
    const configuredDefinitions = session.configuredMcpToolSources
      .filter((source) => enabledTools.has(source.registeredToolName))
      .map((source) => this.buildConfiguredMcpToolDefinition(source))
      .filter((definition): definition is AgentToolsMcpToolDefinition => Boolean(definition));
    return [...staticDefinitions, ...configuredDefinitions];
  }

  resolveToolCallAvailability(
    session: AgentToolMcpSession,
    toolName: string,
  ): AgentToolMcpCallAvailability {
    const enabled = session.enabledTools.includes(toolName);
    const staticAdapter = this.adaptersByName.get(toolName) ?? null;
    if (staticAdapter) {
      if (!enabled) {
        return { ok: false, reason: "tool_not_enabled" };
      }
      return { ok: true, definition: staticAdapter.definition, adapter: staticAdapter };
    }

    const configuredSource = session.configuredMcpToolSources.find(
      (source) => source.registeredToolName === toolName,
    ) ?? null;
    if (!configuredSource) {
      return { ok: false, reason: "unknown_tool" };
    }
    if (!enabled) {
      return { ok: false, reason: "tool_not_enabled" };
    }
    const definition = this.buildConfiguredMcpSupportedDefinition(configuredSource);
    if (!definition) {
      return { ok: false, reason: "unknown_tool" };
    }
    return {
      ok: true,
      definition,
      adapter: new ConfiguredMcpRegistryToolAdapter({
        source: configuredSource,
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
