import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import { generateTeamRunIdForDefinitionName } from "../domain/team-run-id.js";
import {
  TeamRunConfig,
  type TeamRunMemberConfig,
  type TeamSubTeamMemberRunConfig,
} from "../domain/team-run-config.js";
import { TeamBackendKind } from "../domain/team-backend-kind.js";

const normalizeOptionalString = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

export class TeamRunLaunchIdentityAssignment {
  constructor(private readonly dependencies: {
    teamDefinitionService: Pick<AgentTeamDefinitionService, "getDefinitionById">;
    agentRunIdentityAllocator: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
  }) {}

  async assignRunIdsForLaunch(
    config: TeamRunConfig,
    teamRunId: string,
  ): Promise<TeamRunConfig> {
    normalizeRequiredString(teamRunId, "teamRunId");
    this.assertNoManualRunIdsForLaunch(config);
    const assignedTree = await this.assignMemberTree(config.memberTree);
    return new TeamRunConfig({
      teamDefinitionId: config.teamDefinitionId,
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberName: config.coordinatorMemberName,
      coordinatorMemberRouteKey: config.coordinatorMemberRouteKey,
      memberTree: assignedTree,
      effectiveHandoffs: config.effectiveHandoffs,
    });
  }

  assertNoManualRunIdsForLaunch(config: TeamRunConfig): void {
    this.assertMemberTreeHasNoManualRunIds(config.memberTree);
  }

  private assertMemberTreeHasNoManualRunIds(
    memberTree: readonly TeamRunMemberConfig[],
  ): void {
    for (const member of memberTree) {
      if (normalizeOptionalString(member.memberRunId)) {
        throw new Error(
          `Public team launch cannot supply memberRunId for member '${member.memberRouteKey}'.`,
        );
      }
      if (member.memberKind === "agent_team") {
        if (normalizeOptionalString(member.childTeamRunId)) {
          throw new Error(
            `Public team launch cannot supply childTeamRunId for member '${member.memberRouteKey}'.`,
          );
        }
        this.assertMemberTreeHasNoManualRunIds(member.memberConfigs);
      }
    }
  }

  private async assignMemberTree(
    memberTree: readonly TeamRunMemberConfig[],
  ): Promise<TeamRunMemberConfig[]> {
    return Promise.all(memberTree.map((member) => this.assignMember(member)));
  }

  private async assignMember(member: TeamRunMemberConfig): Promise<TeamRunMemberConfig> {
    if (member.memberKind === "agent") {
      return {
        ...member,
        memberRunId: await this.dependencies.agentRunIdentityAllocator
          .allocateForAgentDefinition(member.agentDefinitionId),
      };
    }

    const childTeamRunId = await this.allocateChildTeamRunId(member);
    return {
      ...member,
      memberRunId: childTeamRunId,
      childTeamRunId,
      memberConfigs: await this.assignMemberTree(member.memberConfigs),
    };
  }

  private async allocateChildTeamRunId(
    member: TeamSubTeamMemberRunConfig,
  ): Promise<string> {
    const definition = await this.dependencies.teamDefinitionService.getDefinitionById(
      member.teamDefinitionId,
    );
    if (!definition) {
      throw new Error(
        `AgentTeamDefinition '${member.teamDefinitionId}' cannot be loaded for child team run identity allocation.`,
      );
    }
    return generateTeamRunIdForDefinitionName(definition.name);
  }
}
