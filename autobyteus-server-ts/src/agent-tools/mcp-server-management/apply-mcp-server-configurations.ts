import { tool, ParameterSchema, ParameterDefinition, ParameterType, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { McpConfigService } from "../../mcp-server-management/services/mcp-config-service.js";
import { toJsonString } from "../json-utils.js";
import { serializeToolSummary } from "./tool-summary.js";

const DESCRIPTION =
  "Applies the desired state for one or more MCP server configurations from a JSON string.";

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

type ApplyResult = {
  summary: { total_processed: number; successful: number; failed: number };
  results: Record<string, { status: string; message: string; registered_tools?: unknown[] }>;
};

export async function applyMcpServerConfigurations(
  context: AgentContextLike,
  configurations_json: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`apply_mcp_server_configurations tool invoked by agent ${agentId}.`);

  if (!configurations_json) {
    throw new Error("configurations_json is a required argument.");
  }

  try {
    JSON.parse(configurations_json);
    const service = McpConfigService.getInstance();
    const result = (await service.applyAndRegisterConfigsFromJson(
      configurations_json,
    )) as ApplyResult;

    const serializedResults: ApplyResult["results"] = {};
    for (const [serverId, serverResult] of Object.entries(result.results ?? {})) {
      if (
        serverResult.status === "success" &&
        Array.isArray(serverResult.registered_tools)
      ) {
        serializedResults[serverId] = {
          ...serverResult,
          registered_tools: serverResult.registered_tools.map((toolDef) =>
            serializeToolSummary(toolDef as any),
          ),
        };
      } else {
        serializedResults[serverId] = { ...serverResult };
      }
    }

    return toJsonString({ ...result, results: serializedResults }, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof SyntaxError) {
      logger.error(`Error applying MCP server configurations from JSON: ${message}`);
      throw new Error(`Invalid JSON provided: ${message}`);
    }
    if (message.toLowerCase().includes("json")) {
      logger.error(`Error applying MCP server configurations from JSON: ${message}`);
      throw new Error(`Invalid JSON provided: ${message}`);
    }

    logger.error(`An unexpected error occurred while applying MCP server configurations: ${message}`);
    throw new Error(message);
  }
}

const TOOL_NAME = "apply_mcp_server_configurations";
let cachedTool: BaseTool | null = null;

export function registerApplyMcpServerConfigurationsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "MCP Server Management",
    })(applyMcpServerConfigurations) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
