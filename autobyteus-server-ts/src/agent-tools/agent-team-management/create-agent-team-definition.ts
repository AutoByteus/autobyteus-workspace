import { tool, ParameterSchema, ParameterDefinition, ParameterType, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { AgentTeamDefinition, TeamMember, type TeamMemberRefScope } from "../../agent-team-definition/domain/models.js";
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
    name: "instructions",
    type: ParameterType.STRING,
    description: "Team coordinator instructions.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "nodes",
    type: ParameterType.STRING,
    description: "A JSON string representing team members (member_name, ref, ref_type).",
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
    name: "category",
    type: ParameterType.STRING,
    description: "Optional category label for this team.",
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

type AgentContextLike = {
  agentId?: string;
};

const toRefType = (value: unknown): "agent" | "agent_team" | null => {
  if (typeof value !== "string") {
    return null;
  }
  if (value === "AGENT") {
    return "agent";
  }
  if (value === "AGENT_TEAM") {
    return "agent_team";
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "agent") {
    return "agent";
  }
  if (normalized === "agent_team" || normalized === "agentteam") {
    return "agent_team";
  }
  return null;
};

const toRefScope = (value: unknown): TeamMemberRefScope | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "shared") {
    return "shared";
  }
  if (normalized === "team_local" || normalized === "team-local") {
    return "team_local";
  }
  return null;
};

const parseTeamMembers = (nodes: string): TeamMember[] => {
  const parsed = JSON.parse(nodes) as Array<Record<string, unknown>>;
  if (!Array.isArray(parsed)) {
    throw new Error("nodes must be a JSON array.");
  }

  return parsed.map((node) => {
    const memberName = node.member_name as string | undefined;
    const ref = node.ref as string | undefined;
    const refTypeRaw = node.ref_type as string | undefined;
    const refScopeRaw = node.ref_scope as string | undefined;

    if (!memberName || !ref || !refTypeRaw) {
      throw new Error("Each node must include member_name, ref, and ref_type.");
    }

    const refType = toRefType(refTypeRaw);
    if (!refType) {
      throw new Error("ref_type must be 'agent' or 'agent_team'.");
    }
    const refScope = toRefType(refTypeRaw) === "agent" ? toRefScope(refScopeRaw) : null;
    if (refType === "agent" && !refScope) {
      throw new Error("Agent nodes must include ref_scope 'shared' or 'team_local'.");
    }
    if (refType === "agent_team" && refScopeRaw !== undefined) {
      throw new Error("Nested team nodes must not include ref_scope.");
    }

    return new TeamMember({
      memberName,
      ref,
      refType,
      refScope,
    });
  });
};

export async function createAgentTeamDefinition(
  context: AgentContextLike,
  name: string,
  description: string,
  instructions: string,
  nodes: string,
  coordinator_member_name: string,
  category?: string | null,
  avatar_url?: string | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(
    `create_agent_team_definition tool invoked by agent run ${agentRunId} for team name '${name}'.`,
  );

  try {
    const teamMembers = parseTeamMembers(nodes);
    const definition = new AgentTeamDefinition({
      name,
      description,
      instructions,
      category: category ?? undefined,
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
      message.includes("ref_type")
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
