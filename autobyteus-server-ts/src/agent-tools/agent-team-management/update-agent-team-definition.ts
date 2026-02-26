import { tool, ParameterSchema, ParameterDefinition, ParameterType, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { AgentTeamDefinitionUpdate, TeamMember } from "../../agent-team-definition/domain/models.js";
import { NodeType } from "../../agent-team-definition/domain/enums.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";

const DESCRIPTION =
  "Modifies an existing agent team definition. Only the arguments provided will be updated.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "definition_id",
    type: ParameterType.STRING,
    description: "The ID of the agent team definition to update.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "name",
    type: ParameterType.STRING,
    description: "The new unique name for the team.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "description",
    type: ParameterType.STRING,
    description: "The new description for the team.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "role",
    type: ParameterType.STRING,
    description: "The new role for the team.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "nodes",
    type: ParameterType.STRING,
    description: "A new JSON string representing the list of team members.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "coordinator_member_name",
    type: ParameterType.STRING,
    description: "The new member_name of the coordinator node.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "avatar_url",
    type: ParameterType.STRING,
    description: "Optional avatar URL for the team.",
    required: false,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

const parseTeamMembers = (nodes: string): TeamMember[] => {
  const parsed = JSON.parse(nodes) as Array<Record<string, unknown>>;
  if (!Array.isArray(parsed)) {
    throw new Error("nodes must be a JSON array.");
  }

  return parsed.map((node) => {
    const memberName = node.member_name as string | undefined;
    const referenceId = node.reference_id as string | undefined;
    const referenceTypeRaw = node.reference_type as string | undefined;

    if (!memberName || !referenceId || !referenceTypeRaw) {
      throw new Error("Each node must include member_name, reference_id, and reference_type.");
    }

    const referenceType =
      referenceTypeRaw === NodeType.AGENT
        ? NodeType.AGENT
        : referenceTypeRaw === NodeType.AGENT_TEAM
          ? NodeType.AGENT_TEAM
          : null;

    if (!referenceType) {
      throw new Error("reference_type must be 'AGENT' or 'AGENT_TEAM'.");
    }

    return new TeamMember({
      memberName,
      referenceId,
      referenceType,
    });
  });
};

export async function updateAgentTeamDefinition(
  context: AgentContextLike,
  definition_id: string,
  name?: string | null,
  description?: string | null,
  role?: string | null,
  nodes?: string | null,
  coordinator_member_name?: string | null,
  avatar_url?: string | null,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(
    `update_agent_team_definition tool invoked by agent ${agentId} for ID '${definition_id}'.`,
  );

  const hasUpdates = [name, description, role, nodes, coordinator_member_name, avatar_url].some(
    (value) => value !== null && value !== undefined,
  );
  if (!hasUpdates) {
    throw new Error("At least one field must be provided to update the agent team definition.");
  }

  try {
    const teamMembers = nodes ? parseTeamMembers(nodes) : null;
    const updateData = new AgentTeamDefinitionUpdate({
      name: name ?? null,
      description: description ?? null,
      role: role ?? null,
      nodes: teamMembers,
      coordinatorMemberName: coordinator_member_name ?? null,
      avatarUrl: avatar_url ?? null,
    });

    const service = AgentTeamDefinitionService.getInstance();
    await service.updateDefinition(definition_id, updateData);
    const successMessage = `Agent team definition with ID ${definition_id} updated successfully.`;
    logger.info(successMessage);
    return successMessage;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      error instanceof SyntaxError ||
      message.includes("member_name") ||
      message.includes("reference_type")
    ) {
      logger.error(
        `Error updating agent team definition ID '${definition_id}' due to invalid input: ${message}`,
      );
      throw new Error(`Invalid input for agent team definition update: ${message}`);
    }
    logger.error(
      `An unexpected error occurred while updating agent team definition ID '${definition_id}': ${message}`,
    );
    throw new Error(`An unexpected error occurred: ${message}`);
  }
}

const TOOL_NAME = "update_agent_team_definition";
let cachedTool: BaseTool | null = null;

export function registerUpdateAgentTeamDefinitionTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Agent Team Management",
    })(updateAgentTeamDefinition) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
