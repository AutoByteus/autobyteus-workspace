import { tool, ParameterSchema, ParameterDefinition, ParameterType, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { McpConfigService } from "../../mcp-server-management/services/mcp-config-service.js";
import { toJsonString } from "../json-utils.js";
import { serializeToolSummary } from "./tool-summary.js";

const DESCRIPTION =
  "Connects to an enabled MCP server to discover and register its available tools.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "server_id",
    type: ParameterType.STRING,
    description: "The unique ID of the MCP server to discover tools from.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

export async function discoverMcpServerTools(
  context: AgentContextLike,
  server_id: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(
    `discover_mcp_server_tools tool invoked by agent ${agentId} for server_id '${server_id}'.`,
  );

  if (!server_id) {
    throw new Error("server_id is a required argument.");
  }

  try {
    const service = McpConfigService.getInstance();
    const discoveredTools = await service.discoverAndRegisterToolsForServer(server_id);
    return toJsonString(discoveredTools.map((toolDef) => serializeToolSummary(toolDef)), 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error discovering tools for server '${server_id}': ${message}`);
    throw new Error(message);
  }
}

const TOOL_NAME = "discover_mcp_server_tools";
let cachedTool: BaseTool | null = null;

export function registerDiscoverMcpServerToolsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "MCP Server Management",
    })(discoverMcpServerTools) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
