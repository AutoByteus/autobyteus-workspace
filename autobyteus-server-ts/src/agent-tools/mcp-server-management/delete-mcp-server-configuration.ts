import { tool, ParameterSchema, ParameterDefinition, ParameterType, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { McpConfigService } from "../../mcp-server-management/services/mcp-config-service.js";

const DESCRIPTION =
  "Deletes an MCP server configuration from the system and unregisters its associated tools.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "server_id",
    type: ParameterType.STRING,
    description: "The unique ID of the MCP server configuration to delete.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

export async function deleteMcpServerConfiguration(
  context: AgentContextLike,
  server_id: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(
    `delete_mcp_server_configuration tool invoked by agent ${agentId} for server_id '${server_id}'.`,
  );

  if (!server_id) {
    throw new Error("server_id is a required argument.");
  }

  try {
    const service = McpConfigService.getInstance();
    const success = await service.deleteMcpServer(server_id);
    if (success) {
      return `MCP server configuration with ID '${server_id}' deleted successfully.`;
    }
    return `MCP server configuration with ID '${server_id}' not found or could not be deleted.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      `An unexpected error occurred while deleting MCP server configuration '${server_id}': ${message}`,
    );
    throw new Error(message);
  }
}

const TOOL_NAME = "delete_mcp_server_configuration";
let cachedTool: BaseTool | null = null;

export function registerDeleteMcpServerConfigurationTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "MCP Server Management",
    })(deleteMcpServerConfiguration) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
