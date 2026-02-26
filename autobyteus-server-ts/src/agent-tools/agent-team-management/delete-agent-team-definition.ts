import { tool, ParameterSchema, ParameterDefinition, ParameterType, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";

const DESCRIPTION = "Permanently deletes an agent team definition from the system.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "definition_id",
    type: ParameterType.STRING,
    description: "The ID of the agent team definition to delete.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

export async function deleteAgentTeamDefinition(
  context: AgentContextLike,
  definition_id: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(
    `delete_agent_team_definition tool invoked by agent ${agentId} for ID '${definition_id}'.`,
  );

  try {
    const service = AgentTeamDefinitionService.getInstance();
    const result = await service.deleteDefinition(definition_id);
    if (result) {
      const successMessage = `Agent team definition with ID ${definition_id} deleted successfully.`;
      logger.info(successMessage);
      return successMessage;
    }

    const notFoundMessage = `Agent team definition with ID ${definition_id} could not be deleted.`;
    logger.warn(notFoundMessage);
    return notFoundMessage;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error deleting agent team definition ID '${definition_id}': ${message}`);
    throw new Error(message);
  }
}

const TOOL_NAME = "delete_agent_team_definition";
let cachedTool: BaseTool | null = null;

export function registerDeleteAgentTeamDefinitionTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Agent Team Management",
    })(deleteAgentTeamDefinition) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
