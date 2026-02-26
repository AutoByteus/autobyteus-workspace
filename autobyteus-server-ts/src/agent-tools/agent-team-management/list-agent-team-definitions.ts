import { tool, ParameterSchema, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { AgentTeamDefinition } from "../../agent-team-definition/domain/models.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";

const DESCRIPTION = "Lists all available agent team definitions for discovery.";

const argumentSchema = new ParameterSchema();

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

export async function listAgentTeamDefinitions(context: AgentContextLike): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`list_agent_team_definitions tool invoked by agent ${agentId}.`);

  try {
    const service = AgentTeamDefinitionService.getInstance();
    const definitions = await service.getAllDefinitions();

    if (!definitions || definitions.length === 0) {
      return "[]";
    }

    return JSON.stringify(definitions.map(serializeDefinition), null, 2);
  } catch (error) {
    logger.error(`An unexpected error occurred while listing agent team definitions: ${String(error)}`);
    throw error;
  }
}

const TOOL_NAME = "list_agent_team_definitions";
let cachedTool: BaseTool | null = null;

export function registerListAgentTeamDefinitionsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Agent Team Management",
    })(listAgentTeamDefinitions) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
