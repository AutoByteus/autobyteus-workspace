import type { ConfiguredAgentToolExposure } from "../../agent-execution/shared/configured-agent-tool-exposure.js";
import type { AgentToolMcpSession } from "./agent-tool-mcp-session.js";
import type {
  AgentToolMcpDefinitionProvider,
  AgentToolMcpSupportedToolDefinition,
} from "./agent-tool-mcp-definition-provider.js";
import {
  AgentToolsMcpSchemaMapper,
  getAgentToolsMcpSchemaMapper,
  type AgentToolsMcpInputSchema,
} from "./agent-tools-mcp-schema-mapper.js";
import { SendMessageToMcpDefinitionProvider } from "./providers/send-message-to-mcp-definition-provider.js";

export type AgentToolsMcpToolDefinition = {
  name: string;
  description: string;
  inputSchema: AgentToolsMcpInputSchema;
};

export type AgentToolMcpCallAvailability =
  | { ok: true; definition: AgentToolMcpSupportedToolDefinition }
  | { ok: false; reason: "unknown_tool" | "tool_not_enabled" };

export class AgentToolMcpCatalog {
  private static instance: AgentToolMcpCatalog | null = null;
  private readonly definitionsByName: Map<string, AgentToolMcpSupportedToolDefinition>;
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
    providers?: AgentToolMcpDefinitionProvider[];
    schemaMapper?: AgentToolsMcpSchemaMapper;
  } = {}) {
    this.schemaMapper = input.schemaMapper ?? getAgentToolsMcpSchemaMapper();
    this.definitionsByName = new Map(
      (input.providers ?? [new SendMessageToMcpDefinitionProvider()]).map((provider) => {
        const definition = provider.getDefinition();
        return [definition.name, definition];
      }),
    );
  }

  listSupportedToolNames(): string[] {
    return Array.from(this.definitionsByName.keys());
  }

  resolveConfiguredSupportedToolNames(exposure: ConfiguredAgentToolExposure): string[] {
    const configuredToolNames = new Set(exposure.configuredToolNames);
    return this.listSupportedToolNames().filter((toolName) => configuredToolNames.has(toolName));
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
    const definition = this.definitionsByName.get(toolName) ?? null;
    if (!definition) {
      return { ok: false, reason: "unknown_tool" };
    }
    if (!session.enabledTools.includes(toolName)) {
      return { ok: false, reason: "tool_not_enabled" };
    }
    return { ok: true, definition };
  }

  private buildMcpToolDefinition(toolName: string): AgentToolsMcpToolDefinition {
    const definition = this.definitionsByName.get(toolName);
    if (!definition) {
      throw new Error(`Unsupported Agent Tools MCP definition '${toolName}'.`);
    }
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
