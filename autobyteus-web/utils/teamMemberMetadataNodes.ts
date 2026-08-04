import type { AgentTeamMemberNode, SubTeamMemberNode, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type { TeamRunMetadataMember, TeamRunMetadataSubTeamMember } from '~/stores/runHistoryTypes';
import { memberAddressBasename } from '~/types/agent/TeamExecutionAddress';

export const teamMemberNodeFromMetadata = (member: TeamRunMetadataMember): TeamMemberNode => {
  const common = {
    address: member.address,
    displayName: memberAddressBasename(member.address),
    role: member.role ?? null,
    description: member.description ?? null,
  };
  return member.kind === 'agent'
    ? {
        kind: 'agent',
        ...common,
        agentDefinitionId: member.agentDefinitionId,
        agentRunId: member.agentRunId,
      } satisfies AgentTeamMemberNode
    : {
        kind: 'agent_team',
        ...common,
        teamDefinitionId: member.teamDefinitionId,
        teamRunId: member.teamRunId,
        coordinatorAddress: member.coordinatorAddress,
        children: member.children.map(teamMemberNodeFromMetadata),
      } satisfies SubTeamMemberNode;
};

export const teamRootNodeFromMetadata = (root: TeamRunMetadataSubTeamMember): SubTeamMemberNode =>
  teamMemberNodeFromMetadata(root) as SubTeamMemberNode;

export const teamMemberNodesFromMetadata = (members: readonly TeamRunMetadataMember[]): TeamMemberNode[] =>
  members.map(teamMemberNodeFromMetadata);
