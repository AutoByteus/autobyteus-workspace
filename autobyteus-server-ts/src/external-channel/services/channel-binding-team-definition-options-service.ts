import { GraphQLError } from "graphql";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";

export type ChannelBindingTeamDefinitionOption = {
  teamDefinitionId: string;
  teamDefinitionName: string;
  description: string;
  coordinatorMemberName: string;
  memberCount: number;
};

type TeamDefinitionPort = Pick<
  AgentTeamDefinitionService,
  "getAllDefinitions" | "getDefinitionById"
>;

export class ChannelBindingTeamDefinitionOptionsService {
  constructor(
    private readonly teamDefinitionService: TeamDefinitionPort = AgentTeamDefinitionService.getInstance(),
  ) {}

  async listTeamDefinitionOptions(): Promise<ChannelBindingTeamDefinitionOption[]> {
    const definitions = await this.teamDefinitionService.getAllDefinitions();
    return definitions
      .filter((definition) => typeof definition.id === "string" && definition.id.trim().length > 0)
      .map((definition) => ({
        teamDefinitionId: definition.id!.trim(),
        teamDefinitionName: definition.name.trim(),
        description: definition.description.trim(),
        coordinatorMemberName: definition.coordinatorMemberName.trim(),
        memberCount: definition.nodes.length,
      }))
      .sort((left, right) => left.teamDefinitionName.localeCompare(right.teamDefinitionName));
  }

  async requireTeamDefinition(
    teamDefinitionId: string,
  ): Promise<ChannelBindingTeamDefinitionOption> {
    const normalizedTeamDefinitionId = normalizeRequiredString(
      teamDefinitionId,
      "targetTeamDefinitionId",
    );
    const definition = await this.teamDefinitionService.getDefinitionById(normalizedTeamDefinitionId);
    if (!definition || typeof definition.id !== "string" || definition.id.trim().length === 0) {
      throw new GraphQLError("Selected team definition does not exist.", {
        extensions: {
          code: "TARGET_TEAM_DEFINITION_NOT_FOUND",
          field: "targetTeamDefinitionId",
          detail: `Team definition '${normalizedTeamDefinitionId}' was not found.`,
        },
      });
    }

    return {
      teamDefinitionId: definition.id.trim(),
      teamDefinitionName: definition.name.trim(),
      description: definition.description.trim(),
      coordinatorMemberName: definition.coordinatorMemberName.trim(),
      memberCount: definition.nodes.length,
    };
  }
}

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};
