import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const normalizeInstructionText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export type MemberRuntimeInstructionSources = {
  teamDefinitionId: string;
  teamInstructions: string | null;
  agentInstructions: string | null;
};

export class MemberRuntimeInstructionSourceResolver {
  constructor(
    private readonly agentDefinitionService: AgentDefinitionService,
    private readonly agentTeamDefinitionService: AgentTeamDefinitionService,
  ) {}

  async resolveForMember(input: {
    teamDefinitionId: string;
    agentDefinitionId: string;
  }): Promise<MemberRuntimeInstructionSources> {
    const [teamDefinition, agentDefinition] = await Promise.all([
      this.resolveTeamDefinition(input.teamDefinitionId),
      this.resolveAgentDefinition(input.agentDefinitionId),
    ]);

    return {
      teamDefinitionId: input.teamDefinitionId,
      teamInstructions: normalizeInstructionText(teamDefinition?.instructions),
      agentInstructions: normalizeInstructionText(agentDefinition?.instructions),
    };
  }

  private async resolveTeamDefinition(teamDefinitionId: string) {
    try {
      return await this.agentTeamDefinitionService.getDefinitionById(teamDefinitionId);
    } catch (error) {
      logger.warn(
        `Failed resolving team instruction source for team definition '${teamDefinitionId}': ${String(error)}`,
      );
      return null;
    }
  }

  private async resolveAgentDefinition(agentDefinitionId: string) {
    try {
      return await this.agentDefinitionService.getAgentDefinitionById(agentDefinitionId);
    } catch (error) {
      logger.warn(
        `Failed resolving agent instruction source for agent definition '${agentDefinitionId}': ${String(error)}`,
      );
      return null;
    }
  }
}
