import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type {
  TeamMemberTreeRow,
  TeamRunHistoryItem,
  TeamRunMetadataMember,
} from '~/stores/runHistoryTypes';

const toTeamMemberRunStatus = (
  status: AgentStatus,
): Pick<TeamRunHistoryItem, 'isActive' | 'lastKnownStatus'> => {
  if (status === AgentStatus.Error) {
    return { isActive: false, lastKnownStatus: 'ERROR' };
  }

  if (
    status === AgentStatus.Uninitialized ||
    status === AgentStatus.ShutdownComplete ||
    status === AgentStatus.ToolDenied
  ) {
    return { isActive: false, lastKnownStatus: 'IDLE' };
  }

  return { isActive: true, lastKnownStatus: 'ACTIVE' };
};

const buildLeafRowFromHistory = (
  team: TeamRunHistoryItem,
  member: TeamRunHistoryItem['members'][number],
): TeamMemberTreeRow => ({
  teamRunId: team.teamRunId,
  memberKind: 'agent',
  memberRouteKey: member.memberRouteKey,
  memberPath: member.memberRouteKey.split('/').filter(Boolean),
  memberName: member.memberName,
  displayName: member.memberName,
  memberRunId: member.memberRunId,
  workspaceRootPath: member.workspaceRootPath ?? null,
  summary: team.summary,
  lastActivityAt: team.lastActivityAt,
  lastKnownStatus: team.lastKnownStatus,
  isActive: team.isActive,
  deleteLifecycle: team.deleteLifecycle,
  children: [],
});

const buildRowsFromMetadataTree = (
  team: TeamRunHistoryItem,
  memberTree: readonly TeamRunMetadataMember[],
): TeamMemberTreeRow[] =>
  memberTree.map((member): TeamMemberTreeRow => {
    if (member.memberKind === 'agent_team') {
      return {
        teamRunId: team.teamRunId,
        memberKind: 'agent_team',
        memberRouteKey: member.memberRouteKey,
        memberPath: [...member.memberPath],
        memberName: member.memberName,
        displayName: member.memberName,
        memberRunId: member.memberRunId,
        teamDefinitionId: member.teamDefinitionId,
        teamRunIdForNode: member.teamRunId ?? null,
        coordinatorMemberRouteKey: member.coordinatorMemberRouteKey ?? null,
        workspaceRootPath: null,
        summary: team.summary,
        lastActivityAt: team.lastActivityAt,
        lastKnownStatus: team.lastKnownStatus,
        isActive: team.isActive,
        deleteLifecycle: team.deleteLifecycle,
        children: buildRowsFromMetadataTree(team, member.memberTree),
      };
    }

    return {
      teamRunId: team.teamRunId,
      memberKind: 'agent',
      memberRouteKey: member.memberRouteKey,
      memberPath: [...member.memberPath],
      memberName: member.memberName,
      displayName: member.memberName,
      memberRunId: member.memberRunId,
      workspaceRootPath: member.workspaceRootPath ?? null,
      summary: team.summary,
      lastActivityAt: team.lastActivityAt,
      lastKnownStatus: team.lastKnownStatus,
      isActive: team.isActive,
      deleteLifecycle: team.deleteLifecycle,
      children: [],
    };
  });

export const flattenTeamRows = (rows: readonly TeamMemberTreeRow[]): TeamMemberTreeRow[] =>
  rows.flatMap((row) => [row, ...flattenTeamRows(row.children)]);

export const buildTeamRowsFromHistoryItem = (
  team: TeamRunHistoryItem,
): TeamMemberTreeRow[] => {
  if (Array.isArray(team.memberTree) && team.memberTree.length > 0) {
    return buildRowsFromMetadataTree(team, team.memberTree);
  }

  return team.members
    .map((member) => buildLeafRowFromHistory(team, member))
    .sort((a, b) => a.memberName.localeCompare(b.memberName));
};

export const buildTeamRowsFromContext = (
  teamContext: AgentTeamContext,
  summary: string,
  fallbackLastActivityAt: string,
  resolveWorkspaceRootPath: (workspaceId: string | null) => string,
): TeamMemberTreeRow[] => {
  const visit = (nodes: AgentTeamContext['memberTree']): TeamMemberTreeRow[] =>
    nodes.map((node) => {
      if (node.memberKind === 'agent_team') {
        return {
          teamRunId: teamContext.teamRunId,
          memberKind: 'agent_team',
          memberRouteKey: node.memberRouteKey,
          memberPath: [...node.memberPath],
          memberName: node.memberName,
          displayName: node.displayName,
          memberRunId: node.memberRunId ?? null,
          teamDefinitionId: node.teamDefinitionId,
          teamRunIdForNode: node.teamRunId ?? null,
          coordinatorMemberRouteKey: node.coordinatorMemberRouteKey ?? null,
          workspaceRootPath: null,
          summary,
          lastActivityAt: fallbackLastActivityAt,
          lastKnownStatus: 'IDLE' as const,
          isActive: false,
          deleteLifecycle: 'READY' as const,
          children: visit(node.children),
        };
      }

      const memberContext = teamContext.leafAgentContextsByRouteKey.get(node.memberRouteKey);
      const memberStatus = memberContext
        ? toTeamMemberRunStatus(memberContext.state.currentStatus)
        : { isActive: false, lastKnownStatus: 'IDLE' as const };
      return {
        ...memberStatus,
        teamRunId: teamContext.teamRunId,
        memberKind: 'agent',
        memberRouteKey: node.memberRouteKey,
        memberPath: [...node.memberPath],
        memberName: node.memberName,
        displayName: node.displayName || node.memberName,
        memberRunId: memberContext?.state.runId ?? node.memberRunId ?? null,
        workspaceRootPath: resolveWorkspaceRootPath(memberContext?.config.workspaceId ?? null),
        summary,
        lastActivityAt:
          memberContext?.state.conversation.updatedAt ||
          memberContext?.state.conversation.createdAt ||
          fallbackLastActivityAt,
        deleteLifecycle: 'READY' as const,
        children: [],
      };
    });

  return visit(teamContext.memberTree);
};
