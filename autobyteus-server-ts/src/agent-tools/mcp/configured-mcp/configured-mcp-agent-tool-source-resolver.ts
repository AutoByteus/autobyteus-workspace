import { defaultToolRegistry, type ToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import {
  CONFIGURED_MCP_AGENT_TOOL_SOURCE_KIND,
  type ConfiguredMcpAgentToolSource,
  type ConfiguredMcpAgentToolSourceDiagnostic,
  type ConfiguredMcpAgentToolSourceResolution,
} from "./configured-mcp-agent-tool-source.js";

type ConfiguredMcpAgentToolSourceResolverDeps = {
  registry?: Pick<ToolRegistry, "getToolDefinition">;
};

export type ResolveConfiguredMcpAgentToolSourcesInput = {
  configuredToolNames: Iterable<string>;
  reservedToolNames: Iterable<string>;
};

export class ConfiguredMcpAgentToolSourceResolver {
  private readonly registry: Pick<ToolRegistry, "getToolDefinition">;

  constructor(deps: ConfiguredMcpAgentToolSourceResolverDeps = {}) {
    this.registry = deps.registry ?? defaultToolRegistry;
  }

  resolve(input: ResolveConfiguredMcpAgentToolSourcesInput): ConfiguredMcpAgentToolSourceResolution {
    const reservedToolNames = new Set(normalizeNames(input.reservedToolNames));
    const sources: ConfiguredMcpAgentToolSource[] = [];
    const diagnostics: ConfiguredMcpAgentToolSourceDiagnostic[] = [];

    for (const registeredToolName of normalizeNames(input.configuredToolNames)) {
      const definition = this.registry.getToolDefinition(registeredToolName);
      if (!definition) {
        diagnostics.push({
          code: "configured_mcp_tool_missing",
          registeredToolName,
          message: `Configured tool '${registeredToolName}' is not registered and cannot be exposed through Agent Tools MCP.`,
        });
        continue;
      }
      if (definition.origin !== ToolOrigin.MCP) {
        continue;
      }
      if (reservedToolNames.has(registeredToolName)) {
        diagnostics.push({
          code: "configured_mcp_tool_collision",
          registeredToolName,
          message: `Configured MCP tool '${registeredToolName}' was not exposed because it collides with a built-in Agent Tools MCP adapter.`,
        });
        continue;
      }
      const mcpServerId = definition.metadata?.["mcp_server_id"];
      if (typeof mcpServerId !== "string" || !mcpServerId.trim()) {
        diagnostics.push({
          code: "configured_mcp_tool_missing_server_id",
          registeredToolName,
          message: `Configured MCP tool '${registeredToolName}' is missing required MCP server metadata and cannot be exposed.`,
        });
        continue;
      }
      sources.push({
        kind: CONFIGURED_MCP_AGENT_TOOL_SOURCE_KIND,
        registeredToolName,
        mcpServerId,
      });
    }

    return { sources, diagnostics };
  }
}

const normalizeNames = (toolNames: Iterable<string>): string[] => [
  ...new Set(
    Array.from(toolNames)
      .map((toolName) => toolName.trim())
      .filter(Boolean),
  ),
];
