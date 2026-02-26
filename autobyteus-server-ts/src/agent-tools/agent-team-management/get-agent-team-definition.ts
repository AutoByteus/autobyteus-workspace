import { tool, ParameterSchema, ParameterDefinition, ParameterType, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { AgentTeamDefinition } from "../../agent-team-definition/domain/models.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";

const DESCRIPTION = "Retrieves the complete structure of a single agent team definition.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "definition_id",
    type: ParameterType.STRING,
    description: "The unique ID of the agent team definition to retrieve.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

const serializeDefinition = (definition: AgentTeamDefinition): Record<string, unknown> => ({
  id: definition.id ?? null,
  name: definition.name,
  description: definition.description,
  role: definition.role ?? null,
  avatar_url: definition.avatarUrl ?? null,
  nodes: definition.nodes.map((node) => ({
    member_name: node.memberName,
    reference_id: node.referenceId,
    reference_type: node.referenceType,
  })),
  coordinator_member_name: definition.coordinatorMemberName,
});

export async function getAgentTeamDefinition(
  context: AgentContextLike,
  definition_id: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(
    `get_agent_team_definition tool invoked by agent ${agentId} for ID '${definition_id}'.`,
  );

  if (!definition_id) {
    throw new Error("definition_id is a required argument.");
  }

  try {
    const service = AgentTeamDefinitionService.getInstance();
    const definition = await service.getDefinitionById(definition_id);
    if (!definition) {
      throw new Error(`Agent team definition with ID ${definition_id} not found.`);
    }

    return JSON.stringify(serializeDefinition(definition), null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error getting agent team definition ID '${definition_id}': ${message}`);
    throw new Error(message);
  }
}

const TOOL_NAME = "get_agent_team_definition";
let cachedTool: BaseTool | null = null;

export function registerGetAgentTeamDefinitionTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Agent Team Management",
    })(getAgentTeamDefinition) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
