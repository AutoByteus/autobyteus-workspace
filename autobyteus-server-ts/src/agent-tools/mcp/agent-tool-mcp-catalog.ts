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

export type AgentToolsMcpToolDefinition = {
  name: string;
  description: string;
  inputSchema: AgentToolsMcpInputSchema;
};

export type AgentToolMcpCallAvailability =
  | { ok: true; definition: AgentToolMcpSupportedToolDefinition; adapter: AgentToolMcpToolAdapter }
  | { ok: false; reason: "unknown_tool" | "tool_not_enabled" };

export class AgentToolMcpCatalog {
  private static instance: AgentToolMcpCatalog | null = null;
  private readonly adaptersByName: Map<string, AgentToolMcpToolAdapter>;
  private readonly schemaMapper: AgentToolsMcpSchemaMapper;

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
  } = {}) {
    this.schemaMapper = input.schemaMapper ?? getAgentToolsMcpSchemaMapper();
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
    const context = this.normalizeAvailabilityContext(input);
    const configuredToolNames = new Set(context.configuredExposure.configuredToolNames);
    return this.listSupportedToolNames().filter((toolName) => {
      const adapter = this.adaptersByName.get(toolName);
      return Boolean(
        adapter &&
        configuredToolNames.has(toolName) &&
        adapter.isAvailable(context),
      );
    });
  }

  listMcpToolsForSession(session: AgentToolMcpSession): AgentToolsMcpToolDefinition[] {
    const enabledTools = new Set(session.enabledTools);
    return this.listSupportedToolNames()
      .filter((toolName) => enabledTools.has(toolName))
      .map((toolName) => this.buildMcpToolDefinition(toolName));
  }

  resolveToolCallAvailability(
    session: AgentToolMcpSession,
    toolName: string,
  ): AgentToolMcpCallAvailability {
    const adapter = this.adaptersByName.get(toolName) ?? null;
    if (!adapter) {
      return { ok: false, reason: "unknown_tool" };
    }
    if (!session.enabledTools.includes(toolName)) {
      return { ok: false, reason: "tool_not_enabled" };
    }
    return { ok: true, definition: adapter.definition, adapter };
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

  private buildMcpToolDefinition(toolName: string): AgentToolsMcpToolDefinition {
    const adapter = this.adaptersByName.get(toolName);
    if (!adapter) {
      throw new Error(`Unsupported Agent Tools MCP definition '${toolName}'.`);
    }
    return {
      name: adapter.definition.name,
      description: adapter.definition.description,
      inputSchema: this.schemaMapper.toMcpInputSchema(adapter.definition.inputSchema),
    };
  }
}

export const getAgentToolMcpCatalog = (): AgentToolMcpCatalog =>
  AgentToolMcpCatalog.getInstance();

export const resetAgentToolMcpCatalogForTests = (): void => {
  AgentToolMcpCatalog.resetInstance();
};
