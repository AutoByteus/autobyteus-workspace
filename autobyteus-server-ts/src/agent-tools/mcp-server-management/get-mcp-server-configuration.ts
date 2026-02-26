import { tool, ParameterSchema, ParameterDefinition, ParameterType, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { BaseMcpConfig } from "autobyteus-ts/tools/mcp/types.js";
import { McpConfigService } from "../../mcp-server-management/services/mcp-config-service.js";
import { toJsonString } from "../json-utils.js";

const DESCRIPTION = "Retrieves the detailed configuration of a single MCP server by its ID.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "server_id",
    type: ParameterType.STRING,
    description: "The unique ID of the MCP server configuration to retrieve.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

const serializeMcpConfig = (config: BaseMcpConfig): Record<string, unknown> => {
  const data = { ...config } as Record<string, unknown>;
  data.transport_type = config.transport_type ?? null;
  return data;
};

export async function getMcpServerConfiguration(
  context: AgentContextLike,
  server_id: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(
    `get_mcp_server_configuration tool invoked by agent ${agentId} for server_id '${server_id}'.`,
  );

  if (!server_id) {
    throw new Error("server_id is a required argument.");
  }

  try {
    const service = McpConfigService.getInstance();
    const config = await service.getMcpServerById(server_id);
    if (!config) {
      throw new Error(`MCP server configuration with ID '${server_id}' not found.`);
    }

    return toJsonString(serializeMcpConfig(config), 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error getting MCP server configuration '${server_id}': ${message}`);
    throw new Error(message);
  }
}

const TOOL_NAME = "get_mcp_server_configuration";
let cachedTool: BaseTool | null = null;

export function registerGetMcpServerConfigurationTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "MCP Server Management",
    })(getMcpServerConfiguration) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
