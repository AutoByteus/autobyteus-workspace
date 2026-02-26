import { tool, ParameterSchema, ParameterDefinition, ParameterType, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { McpConfigService as CoreMcpConfigService } from "autobyteus-ts";
import { McpConfigService as ServerMcpConfigService } from "../../mcp-server-management/services/mcp-config-service.js";
import { toJsonString } from "../json-utils.js";
import { serializeToolSummary } from "./tool-summary.js";

const DESCRIPTION =
  "Statelessly previews tools available from MCP server configurations without saving them.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "configurations_json",
    type: ParameterType.STRING,
    description:
      "A JSON string with a top-level 'mcpServers' object where each key is a server_id.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

export async function previewMcpServerTools(
  context: AgentContextLike,
  configurations_json: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`preview_mcp_server_tools tool invoked by agent ${agentId}.`);

  if (!configurations_json) {
    throw new Error("configurations_json is a required argument.");
  }

  try {
    const data = JSON.parse(configurations_json) as Record<string, unknown>;
    const mcpServers = data?.mcpServers;
    if (!mcpServers || typeof mcpServers !== "object" || Array.isArray(mcpServers)) {
      throw new Error("JSON must contain a top-level 'mcpServers' object.");
    }

    const results: Record<string, unknown> = {};
    const service = ServerMcpConfigService.getInstance();

    for (const [serverId, configDetails] of Object.entries(
      mcpServers as Record<string, unknown>,
    )) {
      try {
        const configObj = CoreMcpConfigService.parseMcpConfigDict({
          [serverId]: configDetails as Record<string, unknown>,
        });
        const discoveredTools = await service.previewMcpServerTools(configObj);
        const toolSummaries = discoveredTools.map((toolDef) => serializeToolSummary(toolDef));
        results[serverId] = {
          status: "success",
          tool_count: toolSummaries.length,
          tools: toolSummaries,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to preview tools for server '${serverId}': ${message}`);
        results[serverId] = {
          status: "error",
          message,
        };
      }
    }

    return toJsonString({ results }, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof SyntaxError || message.toLowerCase().includes("json")) {
      logger.error(`Error previewing MCP server tools from JSON: ${message}`);
      throw new Error(`Invalid JSON provided: ${message}`);
    }
    logger.error(`An unexpected error occurred while previewing MCP server tools: ${message}`);
    throw new Error(message);
  }
}

const TOOL_NAME = "preview_mcp_server_tools";
let cachedTool: BaseTool | null = null;

export function registerPreviewMcpServerToolsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "MCP Server Management",
    })(previewMcpServerTools) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
