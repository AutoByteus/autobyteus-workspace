import {
  buildScopedMemberResolutionContext,
  resolveScopedAgentMemberRef,
} from "../../agent-team-definition/utils/scoped-team-member-resolution.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { appendAgentTeamAddress, createAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

export type TeamLeafAgentMember = {
  memberAddress: AgentTeamAddress;
  displayName: string;
  agentDefinitionId: string;
};

type TeamDefinitionLookup = Pick<AgentTeamDefinitionService, "getDefinitionById">;

/** Current Team traversal is deliberately one level: every configured member is an Agent. */
export class TeamDefinitionTraversalService {
  constructor(private readonly teamDefinitionService: TeamDefinitionLookup) {}

  async collectLeafAgentMembers(teamDefinitionId: string): Promise<TeamLeafAgentMember[]> {
    const id = required(teamDefinitionId, "teamDefinitionId");
    const definition = await this.teamDefinitionService.getDefinitionById(id);
    if (!definition) throw new Error(`AgentTeamDefinition with ID ${id} not found.`);
    const context = buildScopedMemberResolutionContext(definition, id);
    const root = createAgentTeamAddress([]);
    return definition.nodes.map((node) => ({
      memberAddress: appendAgentTeamAddress(root, node.memberName),
      displayName: node.memberName.trim(),
      agentDefinitionId: resolveScopedAgentMemberRef(context, node),
    }));
  }

  async resolveLeafCoordinatorMemberName(teamDefinitionId: string): Promise<string | null> {
    const definition = await this.teamDefinitionService.getDefinitionById(required(teamDefinitionId, "teamDefinitionId"));
    const coordinator = definition?.coordinatorMemberName.trim() ?? "";
    return coordinator || null;
  }
}

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};
