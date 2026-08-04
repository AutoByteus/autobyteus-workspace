import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type {
  TeamMemberTreeRow,
  TeamRunHistoryItem,
  TeamRunMetadataMember,
} from '~/stores/runHistoryTypes';
import { normalizeAgentRuntimeStatus } from '~/services/runHydration/runtimeStatusNormalization';
import {
  createTeamExecutionAddress,
  memberAddressBasename,
  serializeTeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';

const isTeamMemberRunActive = (status: AgentStatus): boolean => (
  status !== AgentStatus.Error && status !== AgentStatus.Offline
);

const historyLeafRow = (
  team: TeamRunHistoryItem,
  member: TeamRunHistoryItem['members'][number],
): TeamMemberTreeRow => {
  const currentStatus = normalizeAgentRuntimeStatus(member.status);
  return {
    isActive: isTeamMemberRunActive(currentStatus),
    teamRunId: team.teamRunId,
    kind: 'agent',
    memberAddress: member.memberAddress,
    displayName: member.displayName || memberAddressBasename(member.memberAddress),
    agentRunId: member.agentRunId,
    workspaceRootPath: member.workspaceRootPath ?? null,
    summary: team.summary,
    lastActivityAt: team.createdAt,
    currentStatus,
    deleteLifecycle: 'READY',
    children: [],
  };
};

const metadataRows = (
  team: TeamRunHistoryItem,
  nodes: readonly TeamRunMetadataMember[],
  historyByAddress: Map<string, TeamRunHistoryItem['members'][number]>,
): TeamMemberTreeRow[] => nodes.map((node): TeamMemberTreeRow => {
  if (node.kind === 'agent_team') {
    return {
      isActive: false,
      teamRunId: team.teamRunId,
      kind: 'agent_team',
      memberAddress: node.address,
      displayName: memberAddressBasename(node.address),
      teamDefinitionId: node.teamDefinitionId,
      teamRunIdForNode: node.teamRunId,
      coordinatorAddress: node.coordinatorAddress,
      workspaceRootPath: null,
      summary: team.summary,
      lastActivityAt: team.createdAt,
      currentStatus: null,
      deleteLifecycle: 'READY',
      children: metadataRows(team, node.children, historyByAddress),
    };
  }
  const historyMember = historyByAddress.get(node.address);
  const currentStatus = normalizeAgentRuntimeStatus(historyMember?.status ?? AgentStatus.Offline);
  return {
    isActive: isTeamMemberRunActive(currentStatus),
    teamRunId: team.teamRunId,
    kind: 'agent',
    memberAddress: node.address,
    displayName: historyMember?.displayName || memberAddressBasename(node.address),
    agentRunId: historyMember?.agentRunId || node.agentRunId,
    workspaceRootPath: node.workspaceRootPath,
    summary: team.summary,
    lastActivityAt: team.createdAt,
    currentStatus,
    deleteLifecycle: 'READY',
    children: [],
  };
});

export const flattenTeamRows = (rows: readonly TeamMemberTreeRow[]): TeamMemberTreeRow[] =>
  rows.flatMap((row) => [row, ...flattenTeamRows(row.children)]);

export const buildTeamRowsFromHistoryItem = (team: TeamRunHistoryItem): TeamMemberTreeRow[] => {
  const historyByAddress = new Map(team.members.map((member) => [member.memberAddress, member]));
  if (team.rootTeam.children.length > 0) {
    return metadataRows(team, team.rootTeam.children, historyByAddress);
  }
  return team.members.map((member) => historyLeafRow(team, member))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
};

export const buildTeamRowsFromContext = (
  teamContext: AgentTeamContext,
  summary: string,
  fallbackLastActivityAt: string,
  resolveWorkspaceRootPath: (workspaceId: string | null) => string,
): TeamMemberTreeRow[] => {
  const visit = (nodes: readonly TeamMemberNode[]): TeamMemberTreeRow[] =>
    nodes.filter((node) => !node.isTaskExecution).map((node): TeamMemberTreeRow => {
      if (node.kind === 'agent_team') {
        return {
          isActive: false,
          teamRunId: teamContext.teamRunId,
          kind: 'agent_team',
          memberAddress: node.address,
          displayName: node.displayName,
          teamDefinitionId: node.teamDefinitionId,
          teamRunIdForNode: node.teamRunId,
          coordinatorAddress: node.coordinatorAddress,
          workspaceRootPath: null,
          summary,
          lastActivityAt: fallbackLastActivityAt,
          currentStatus: null,
          deleteLifecycle: 'READY',
          children: visit(node.children),
        };
      }
      const executionKey = serializeTeamExecutionAddress(createTeamExecutionAddress({
        rootTeamRunId: teamContext.teamRunId,
        memberAddress: node.address,
      }));
      const memberContext = teamContext.agentExecutionsByKey.get(executionKey);
      const currentStatus = normalizeAgentRuntimeStatus(memberContext?.state.currentStatus ?? AgentStatus.Offline);
      return {
        isActive: isTeamMemberRunActive(currentStatus),
        teamRunId: teamContext.teamRunId,
        kind: 'agent',
        memberAddress: node.address,
        displayName: node.displayName,
        agentRunId: memberContext?.state.runId ?? node.agentRunId,
        workspaceRootPath: memberContext?.config.workspaceMetadata?.workspaceRootPath
          || resolveWorkspaceRootPath(memberContext?.config.workspaceId ?? null),
        summary,
        currentStatus,
        lastActivityAt: memberContext?.state.conversation.updatedAt
          || memberContext?.state.conversation.createdAt
          || fallbackLastActivityAt,
        deleteLifecycle: 'READY',
        children: [],
      };
    });
  return visit(teamContext.rootTeam.children);
};
