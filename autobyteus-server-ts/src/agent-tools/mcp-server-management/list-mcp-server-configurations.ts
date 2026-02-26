import { tool, ParameterSchema, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { BaseMcpConfig } from "autobyteus-ts/tools/mcp/types.js";
import { McpConfigService } from "../../mcp-server-management/services/mcp-config-service.js";
import { toJsonString } from "../json-utils.js";

const DESCRIPTION = "Lists all saved MCP (Multi-Tool Control Protocol) server configurations.";

const argumentSchema = new ParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

const serializeMcpConfigSummary = (config: BaseMcpConfig): Record<string, unknown> => {
  const data = { ...config } as Record<string, unknown>;
  data.transport_type = config.transport_type ?? null;
  return data;
};

export async function listMcpServerConfigurations(context: AgentContextLike): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`list_mcp_server_configurations tool invoked by agent ${agentId}.`);

  try {
    const service = McpConfigService.getInstance();
    const configs = await service.getAllMcpServers();

    if (!configs || configs.length === 0) {
      return "[]";
    }

    return toJsonString(configs.map(serializeMcpConfigSummary), 2);
  } catch (error) {
    logger.error(
      `An unexpected error occurred while listing MCP server configurations: ${String(error)}`,
    );
    throw error;
  }
}

const TOOL_NAME = "list_mcp_server_configurations";
let cachedTool: BaseTool | null = null;

export function registerListMcpServerConfigurationsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "MCP Server Management",
    })(listMcpServerConfigurations) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
