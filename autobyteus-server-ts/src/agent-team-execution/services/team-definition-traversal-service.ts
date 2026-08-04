import {
  buildScopedMemberResolutionContext,
  resolveScopedAgentMemberRef,
  resolveScopedTeamMemberRef,
} from "../../agent-team-definition/utils/scoped-team-member-resolution.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { appendAgentTeamAddress, createAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

export type TeamLeafAgentMember = {
  memberAddress: AgentTeamAddress;
  displayName: string;
  agentDefinitionId: string;
};

type TeamDefinitionLookup = Pick<AgentTeamDefinitionService, "getDefinitionById">;

export class TeamDefinitionTraversalService {
  constructor(private readonly teamDefinitionService: TeamDefinitionLookup) {}

  async collectLeafAgentMembers(teamDefinitionId: string): Promise<TeamLeafAgentMember[]> {
    return this.collectLeafAgentMembersRecursive(teamDefinitionId, createAgentTeamAddress([]), new Set());
  }

  async resolveLeafCoordinatorMemberName(teamDefinitionId: string): Promise<string | null> {
    return this.resolveLeafCoordinatorMemberNameRecursive(teamDefinitionId, new Set());
  }

  private async collectLeafAgentMembersRecursive(
    teamDefinitionId: string,
    parentAddress: AgentTeamAddress,
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
    const resolutionContext = buildScopedMemberResolutionContext(
      teamDefinition,
      normalizedTeamDefinitionId,
    );
    for (const node of teamNodes) {
      if (node.refType === "agent") {
        const agentDefinitionId = resolveScopedAgentMemberRef(resolutionContext, node);
        members.push({
          memberAddress: appendAgentTeamAddress(parentAddress, node.memberName),
          displayName: node.memberName.trim(),
          agentDefinitionId,
        });
        continue;
      }

      members.push(...(await this.collectLeafAgentMembersRecursive(
        resolveScopedTeamMemberRef(resolutionContext, node),
        appendAgentTeamAddress(parentAddress, node.memberName),
        new Set(visited),
      )));
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
    const resolutionContext = buildScopedMemberResolutionContext(
      teamDefinition,
      normalizedTeamDefinitionId,
    );

    return this.resolveLeafCoordinatorMemberNameRecursive(
      resolveScopedTeamMemberRef(resolutionContext, coordinatorNode),
      new Set(visited),
    );
  }
}

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};
