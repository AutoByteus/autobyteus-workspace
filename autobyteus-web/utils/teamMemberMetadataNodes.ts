import type {
  AgentTeamMemberNode,
  SubTeamMemberNode,
  TeamMemberNode,
} from '~/types/agent/AgentTeamContext';
import type {
  TeamRunMetadataMember,
} from '~/stores/runHistoryTypes';

export const teamMemberNodesFromMetadata = (
  memberTree: readonly TeamRunMetadataMember[],
): TeamMemberNode[] =>
  memberTree.map((member) => {
    if (member.memberKind === 'agent_team') {
      return {
        memberKind: 'agent_team',
        memberName: member.memberName,
        displayName: member.memberName,
        memberPath: [...member.memberPath],
        memberRouteKey: member.memberRouteKey,
        memberRunId: member.memberRunId || null,
        role: member.role ?? null,
        description: member.description ?? null,
        teamDefinitionId: member.teamDefinitionId,
        teamRunId: member.teamRunId ?? null,
        coordinatorMemberRouteKey: member.coordinatorMemberRouteKey ?? null,
        children: teamMemberNodesFromMetadata(member.memberTree),
      } satisfies SubTeamMemberNode;
    }

    return {
      memberKind: 'agent',
      memberName: member.memberName,
      displayName: member.memberName,
      memberPath: [...member.memberPath],
      memberRouteKey: member.memberRouteKey,
      memberRunId: member.memberRunId || null,
      role: member.role ?? null,
      description: member.description ?? null,
      agentDefinitionId: member.agentDefinitionId,
    } satisfies AgentTeamMemberNode;
  });
