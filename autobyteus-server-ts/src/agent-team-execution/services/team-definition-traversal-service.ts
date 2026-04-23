import { buildTeamLocalAgentDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-agent-definition-id.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";
import type { TeamMemberRunConfig } from "../domain/team-run-config.js";

export type TeamLeafAgentMember = {
  memberName: string;
  memberRouteKey: string;
  agentDefinitionId: string;
};

type TeamDefinitionLookup = Pick<AgentTeamDefinitionService, "getDefinitionById">;

export class TeamDefinitionTraversalService {
  constructor(private readonly teamDefinitionService: TeamDefinitionLookup) {}

  async collectLeafAgentMembers(teamDefinitionId: string): Promise<TeamLeafAgentMember[]> {
    return this.collectLeafAgentMembersRecursive(teamDefinitionId, new Set());
  }

  async resolveCoordinatorMemberName(
    teamDefinitionId: string,
    memberConfigs: TeamMemberRunConfig[],
  ): Promise<string | null> {
    const configuredCoordinatorMemberName = await this.resolveLeafCoordinatorMemberName(
      teamDefinitionId,
    );

    if (!configuredCoordinatorMemberName) {
      return memberConfigs[0]?.memberName?.trim() || null;
    }

    return (
      memberConfigs.find((memberConfig) => memberConfig.memberName === configuredCoordinatorMemberName)
        ?.memberName ?? configuredCoordinatorMemberName
    );
  }

  async resolveLeafCoordinatorMemberName(teamDefinitionId: string): Promise<string | null> {
    return this.resolveLeafCoordinatorMemberNameRecursive(teamDefinitionId, new Set());
  }

  private async collectLeafAgentMembersRecursive(
    teamDefinitionId: string,
    visited: Set<string>,
  ): Promise<TeamLeafAgentMember[]> {
    const normalizedTeamDefinitionId = normalizeRequiredString(teamDefinitionId, "teamDefinitionId");
    if (visited.has(normalizedTeamDefinitionId)) {
      throw new Error(
        `Circular dependency detected in team definitions involving ID: ${normalizedTeamDefinitionId}`,
      );
    }
    visited.add(normalizedTeamDefinitionId);

    const teamDefinition =
      await this.teamDefinitionService.getDefinitionById(normalizedTeamDefinitionId);
    if (!teamDefinition) {
      throw new Error(`AgentTeamDefinition with ID ${normalizedTeamDefinitionId} not found.`);
    }

    const members: TeamLeafAgentMember[] = [];
    const teamNodes = Array.isArray(teamDefinition.nodes) ? teamDefinition.nodes : [];
    for (const node of teamNodes) {
      if (node.refType === "agent") {
        const agentDefinitionId =
          node.refScope === "team_local"
            ? buildTeamLocalAgentDefinitionId(normalizedTeamDefinitionId, node.ref)
            : normalizeRequiredString(node.ref, "agentDefinitionId");
        members.push({
          memberName: node.memberName.trim(),
          memberRouteKey: normalizeMemberRouteKey(node.memberName),
          agentDefinitionId,
        });
        continue;
      }

      members.push(...(await this.collectLeafAgentMembersRecursive(node.ref, new Set(visited))));
    }

    return members;
  }

  private async resolveLeafCoordinatorMemberNameRecursive(
    teamDefinitionId: string,
    visited: Set<string>,
  ): Promise<string | null> {
    const normalizedTeamDefinitionId = normalizeRequiredString(teamDefinitionId, "teamDefinitionId");
    if (visited.has(normalizedTeamDefinitionId)) {
      throw new Error(
        `Circular dependency detected in team definitions involving ID: ${normalizedTeamDefinitionId}`,
      );
    }
    visited.add(normalizedTeamDefinitionId);

    const teamDefinition =
      await this.teamDefinitionService.getDefinitionById(normalizedTeamDefinitionId);
    const coordinatorMemberName =
      typeof teamDefinition?.coordinatorMemberName === "string" &&
      teamDefinition.coordinatorMemberName.trim().length > 0
        ? teamDefinition.coordinatorMemberName.trim()
        : null;
    if (!teamDefinition || !coordinatorMemberName) {
      return null;
    }

    const teamNodes = Array.isArray(teamDefinition.nodes) ? teamDefinition.nodes : [];
    const coordinatorNode = teamNodes.find(
      (node) => node.memberName.trim() === coordinatorMemberName,
    );
    if (!coordinatorNode || coordinatorNode.refType === "agent") {
      return coordinatorMemberName;
    }

    return this.resolveLeafCoordinatorMemberNameRecursive(coordinatorNode.ref, new Set(visited));
  }
}

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};
