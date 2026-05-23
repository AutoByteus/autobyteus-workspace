import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { AgentContext } from '~/types/agent/AgentContext';
import type {
  TeamMemberTreeRow,
  TeamRunHistoryItem,
  TeamRunMetadataMember,
} from '~/stores/runHistoryTypes';
import { normalizeAgentRuntimeStatus } from '~/services/runHydration/runtimeStatusNormalization';

const toTeamMemberRunStatus = (
  status: AgentStatus,
): Pick<TeamMemberTreeRow, 'isActive' | 'lastKnownStatus'> => {
  if (status === AgentStatus.Error) {
    return { isActive: false, lastKnownStatus: 'ERROR' };
  }

  if (status === AgentStatus.Offline) {
    return { isActive: false, lastKnownStatus: 'IDLE' };
  }

  return { isActive: true, lastKnownStatus: 'ACTIVE' };
};

const buildLeafRowFromHistory = (
  team: TeamRunHistoryItem,
  member: TeamRunHistoryItem['members'][number],
): TeamMemberTreeRow => {
  const currentStatus = normalizeAgentRuntimeStatus(member.status);
  return {
    ...toTeamMemberRunStatus(currentStatus),
    teamRunId: team.teamRunId,
    memberKind: 'agent',
    memberRouteKey: member.memberRouteKey,
    memberPath: member.memberRouteKey.split('/').filter(Boolean),
    memberName: member.memberName,
    displayName: member.memberName,
    memberRunId: member.memberRunId,
    workspaceRootPath: member.workspaceRootPath ?? null,
    summary: team.summary,
    lastActivityAt: team.createdAt,
    currentStatus,
    deleteLifecycle: 'READY' as const,
    children: [],
  };
};

const buildRowsFromMetadataTree = (
  team: TeamRunHistoryItem,
  memberTree: readonly TeamRunMetadataMember[],
  memberByRouteKey: Map<string, TeamRunHistoryItem['members'][number]>,
): TeamMemberTreeRow[] =>
  memberTree.map((member): TeamMemberTreeRow => {
    if (member.memberKind === 'agent_team') {
      const currentStatus = normalizeAgentRuntimeStatus(team.status);
      return {
        ...toTeamMemberRunStatus(currentStatus),
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
        lastActivityAt: team.createdAt,
        currentStatus,
        deleteLifecycle: 'READY' as const,
        children: buildRowsFromMetadataTree(team, member.memberTree, memberByRouteKey),
      };
    }

    const historyMember = memberByRouteKey.get(member.memberRouteKey);
    const currentStatus = normalizeAgentRuntimeStatus(historyMember?.status ?? AgentStatus.Offline);
    return {
      ...toTeamMemberRunStatus(currentStatus),
      teamRunId: team.teamRunId,
      memberKind: 'agent',
      memberRouteKey: member.memberRouteKey,
      memberPath: [...member.memberPath],
      memberName: member.memberName,
      displayName: member.memberName,
      memberRunId: member.memberRunId,
      workspaceRootPath: member.workspaceRootPath ?? null,
      summary: team.summary,
      lastActivityAt: team.createdAt,
      currentStatus,
      deleteLifecycle: 'READY' as const,
      children: [],
    };
  });

export const flattenTeamRows = (rows: readonly TeamMemberTreeRow[]): TeamMemberTreeRow[] =>
  rows.flatMap((row) => [row, ...flattenTeamRows(row.children)]);

export const buildTeamRowsFromHistoryItem = (
  team: TeamRunHistoryItem,
): TeamMemberTreeRow[] => {
  if (Array.isArray(team.memberTree) && team.memberTree.length > 0) {
    const memberByRouteKey = new Map(team.members.map((member) => [member.memberRouteKey, member]));
    return buildRowsFromMetadataTree(team, team.memberTree, memberByRouteKey);
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
  const leafAgentContextsByRouteKey =
    teamContext.leafAgentContextsByRouteKey instanceof Map
      ? teamContext.leafAgentContextsByRouteKey
      : (teamContext as unknown as { members?: unknown }).members instanceof Map
        ? (teamContext as unknown as { members: Map<string, AgentContext> }).members
        : new Map<string, AgentContext>();
  const sourceTree = Array.isArray(teamContext.memberTree) && teamContext.memberTree.length > 0
    ? teamContext.memberTree
    : Array.from(leafAgentContextsByRouteKey.entries()).map(([memberRouteKey, memberContext]) => ({
      memberKind: 'agent' as const,
      memberRouteKey,
      memberPath: [memberRouteKey],
      memberName: memberContext.config.agentDefinitionName || memberRouteKey,
      displayName: memberContext.config.agentDefinitionName || memberRouteKey,
      memberRunId: memberContext.state.runId,
      agentDefinitionId: memberContext.config.agentDefinitionId || memberRouteKey,
    }));

  const visit = (nodes: AgentTeamContext['memberTree']): TeamMemberTreeRow[] =>
    nodes.map((node) => {
      if (node.memberKind === 'agent_team') {
        const currentStatus = normalizeAgentRuntimeStatus(teamContext.currentStatus);
        return {
          ...toTeamMemberRunStatus(currentStatus),
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
          currentStatus,
          deleteLifecycle: 'READY' as const,
          children: visit(node.children),
        };
      }

      const memberContext = leafAgentContextsByRouteKey.get(node.memberRouteKey);
      const currentStatus = normalizeAgentRuntimeStatus(memberContext?.state.currentStatus ?? AgentStatus.Offline);
      return {
        ...toTeamMemberRunStatus(currentStatus),
        teamRunId: teamContext.teamRunId,
        memberKind: 'agent',
        memberRouteKey: node.memberRouteKey,
        memberPath: [...node.memberPath],
        memberName: node.memberName,
        displayName: node.displayName || node.memberName,
        memberRunId: memberContext?.state.runId ?? node.memberRunId ?? null,
        workspaceRootPath:
          memberContext?.config.workspaceMetadata?.workspaceRootPath ||
          resolveWorkspaceRootPath(memberContext?.config.workspaceId ?? null),
        summary,
        currentStatus,
        lastActivityAt:
          memberContext?.state.conversation.updatedAt ||
          memberContext?.state.conversation.createdAt ||
          fallbackLastActivityAt,
        deleteLifecycle: 'READY' as const,
        children: [],
      };
    });

  return visit(sourceTree);
};
