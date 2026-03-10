import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { AgentTeamDefinition } from "../../agent-team-definition/domain/models.js";
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

type TeamInstructionDefinition = Pick<AgentTeamDefinition, "instructions">;
type AgentInstructionDefinition = Pick<AgentDefinition, "instructions">;

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

  private async resolveTeamDefinition(
    teamDefinitionId: string,
  ): Promise<TeamInstructionDefinition | null> {
    try {
      const getFreshDefinitionById = (
        this.agentTeamDefinitionService as AgentTeamDefinitionService & {
          getFreshDefinitionById?: (
            definitionId: string,
          ) => Promise<TeamInstructionDefinition | null>;
        }
      ).getFreshDefinitionById;
      if (typeof getFreshDefinitionById === "function") {
        return await getFreshDefinitionById.call(this.agentTeamDefinitionService, teamDefinitionId);
      }
      return await this.agentTeamDefinitionService.getDefinitionById(teamDefinitionId);
    } catch (error) {
      logger.warn(
        `Failed resolving team instruction source for team definition '${teamDefinitionId}': ${String(error)}`,
      );
      return null;
    }
  }

  private async resolveAgentDefinition(
    agentDefinitionId: string,
  ): Promise<AgentInstructionDefinition | null> {
    try {
      const getFreshAgentDefinitionById = (
        this.agentDefinitionService as AgentDefinitionService & {
          getFreshAgentDefinitionById?: (
            definitionId: string,
          ) => Promise<AgentInstructionDefinition | null>;
        }
      ).getFreshAgentDefinitionById;
      if (typeof getFreshAgentDefinitionById === "function") {
        return await getFreshAgentDefinitionById.call(
          this.agentDefinitionService,
          agentDefinitionId,
        );
      }
      return await this.agentDefinitionService.getAgentDefinitionById(agentDefinitionId);
    } catch (error) {
      logger.warn(
        `Failed resolving agent instruction source for agent definition '${agentDefinitionId}': ${String(error)}`,
      );
      return null;
    }
  }
}
