import { tool, ParameterSchema, ParameterDefinition, ParameterType, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { AgentTeamDefinition, TeamMember } from "../../agent-team-definition/domain/models.js";
import { NodeType } from "../../agent-team-definition/domain/enums.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";

const DESCRIPTION =
  "Creates a new agent team definition, defining the structure of a collaborative group of agents.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "name",
    type: ParameterType.STRING,
    description: "A unique name for the agent team definition.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "description",
    type: ParameterType.STRING,
    description: "A description of what this team is designed to accomplish.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "nodes",
    type: ParameterType.STRING,
    description:
      "A JSON string representing the list of team members (member_name, reference_id, reference_type).",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "coordinator_member_name",
    type: ParameterType.STRING,
    description: "The member_name of the agent node that acts as the team's coordinator.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "role",
    type: ParameterType.STRING,
    description: "The role of this team if it's nested inside another team.",
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

export async function createAgentTeamDefinition(
  context: AgentContextLike,
  name: string,
  description: string,
  nodes: string,
  coordinator_member_name: string,
  role?: string | null,
  avatar_url?: string | null,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(
    `create_agent_team_definition tool invoked by agent ${agentId} for team name '${name}'.`,
  );

  try {
    const teamMembers = parseTeamMembers(nodes);
    const definition = new AgentTeamDefinition({
      name,
      description,
      role: role ?? null,
      avatarUrl: avatar_url ?? null,
      nodes: teamMembers,
      coordinatorMemberName: coordinator_member_name,
    });

    const service = AgentTeamDefinitionService.getInstance();
    const created = await service.createDefinition(definition);
    const successMessage = `Agent team definition '${name}' created successfully with ID: ${String(
      created.id,
    )}.`;
    logger.info(successMessage);
    return successMessage;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      error instanceof SyntaxError ||
      message.includes("member_name") ||
      message.includes("reference_type")
    ) {
      logger.error(`Error creating agent team definition '${name}' due to invalid input: ${message}`);
      throw new Error(`Invalid input for agent team definition: ${message}`);
    }
    logger.error(`An unexpected error occurred while creating agent team definition '${name}': ${message}`);
    throw new Error(`An unexpected error occurred: ${message}`);
  }
}

const TOOL_NAME = "create_agent_team_definition";
let cachedTool: BaseTool | null = null;

export function registerCreateAgentTeamDefinitionTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Agent Team Management",
    })(createAgentTeamDefinition) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
