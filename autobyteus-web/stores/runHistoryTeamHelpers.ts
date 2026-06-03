import { AgentContext } from '~/types/agent/AgentContext';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamTreeNode, TeamRunHistoryItem } from '~/stores/runHistoryTypes';
import { normalizeTeamRuntimeStatus } from '~/services/runHydration/runtimeStatusNormalization';
import { buildTeamRowsFromContext, buildTeamRowsFromHistoryItem, flattenTeamRows } from '~/stores/runHistoryTeamRows';

export const toHistoryTeamStatus = (
  team: Pick<TeamRunHistoryItem, 'status'>,
): AgentTeamStatus => {
  return normalizeTeamRuntimeStatus(team.status);
};

export const toTeamRunStatus = (
  status: AgentTeamStatus,
): { isActive: boolean; lastKnownStatus: 'ACTIVE' | 'IDLE' | 'ERROR' } => {
  if (status === AgentTeamStatus.Error) {
    return { isActive: false, lastKnownStatus: 'ERROR' };
  }

  if (status === AgentTeamStatus.Offline) {
    return { isActive: false, lastKnownStatus: 'IDLE' };
  }

  return { isActive: true, lastKnownStatus: 'ACTIVE' };
};

const getLeafAgentContextsByRouteKey = (
  teamContext: AgentTeamContext,
): Map<string, AgentContext> => {
  const candidate = teamContext.leafAgentContextsByRouteKey;
  if (candidate instanceof Map) {
    return candidate;
  }
  const legacyMembers = (teamContext as unknown as { members?: unknown }).members;
  return legacyMembers instanceof Map ? legacyMembers as Map<string, AgentContext> : new Map();
};

export const summarizeTeamDraft = (teamContext: AgentTeamContext, draftSummaryPrefix: string): string => {
  const coordinatorMemberRouteKey = teamContext.coordinatorMemberRouteKey?.trim() || '';
  const leafAgentContextsByRouteKey = getLeafAgentContextsByRouteKey(teamContext);
  const coordinatorContext = coordinatorMemberRouteKey
    ? leafAgentContextsByRouteKey.get(coordinatorMemberRouteKey) ?? null
    : null;

  const firstCoordinatorUserMessage = coordinatorContext?.state.conversation.messages.find(
    (message) => message.type === 'user' && message.text?.trim().length > 0,
  );
  if (firstCoordinatorUserMessage?.type === 'user') {
    return firstCoordinatorUserMessage.text.trim();
  }

  if (!coordinatorContext) {
    const firstMemberContext = leafAgentContextsByRouteKey.values().next().value ?? null;
    const firstMemberUserMessage = firstMemberContext?.state.conversation.messages.find(
      (message) => message.type === 'user' && message.text?.trim().length > 0,
    );
    if (firstMemberUserMessage?.type === 'user') {
      return firstMemberUserMessage.text.trim();
    }
  }

  return `${draftSummaryPrefix}${teamContext.config.teamDefinitionName || 'Team'}`.trim();
};

export const resolveTeamLastActivityAt = (teamContext: AgentTeamContext): string => {
  let latest = '';
  for (const member of getLeafAgentContextsByRouteKey(teamContext).values()) {
    const ts = member.state.conversation.updatedAt || member.state.conversation.createdAt || '';
    if (!ts) {
      continue;
    }
    if (!latest || ts > latest) {
      latest = ts;
    }
  }
  return latest || new Date().toISOString();
};

export const resolveTeamWorkspaceRootPathFromContext = (
  teamContext: AgentTeamContext,
  resolveWorkspaceRootPath: (workspaceId: string | null) => string,
  unassignedWorkspaceKey: string,
): string => {
  if (teamContext.config.workspaceMetadata?.workspaceRootPath) {
    return teamContext.config.workspaceMetadata.workspaceRootPath;
  }
  const fromTeamConfig = resolveWorkspaceRootPath(teamContext.config.workspaceId);
  if (fromTeamConfig) {
    return fromTeamConfig;
  }
  for (const member of getLeafAgentContextsByRouteKey(teamContext).values()) {
    if (member.config.workspaceMetadata?.workspaceRootPath) {
      return member.config.workspaceMetadata.workspaceRootPath;
    }
    const fromMemberConfig = resolveWorkspaceRootPath(member.config.workspaceId);
    if (fromMemberConfig) {
      return fromMemberConfig;
    }
  }
  return unassignedWorkspaceKey;
};

export const buildTeamNodes = (params: {
  teamRuns: TeamRunHistoryItem[];
  teamContexts: AgentTeamContext[];
  workspaceRootPath?: string;
  normalizeRootPath: (value: string | null | undefined) => string;
  resolveWorkspaceRootPath: (workspaceId: string | null) => string;
  resolveWorkspaceRootPathFromContext: (teamContext: AgentTeamContext) => string;
  summarizeTeamDraft: (teamContext: AgentTeamContext) => string;
  resolveTeamLastActivityAt: (teamContext: AgentTeamContext) => string;
  toHistoryTeamStatus: (
    team: Pick<TeamRunHistoryItem, 'status'>,
  ) => AgentTeamStatus;
  toTeamRunStatus: (
    status: AgentTeamStatus,
  ) => { isActive: boolean; lastKnownStatus: 'ACTIVE' | 'IDLE' | 'ERROR' };
  unassignedWorkspaceKey: string;
}): TeamTreeNode[] => {
  const nodesByTeamRunId = new Map<string, TeamTreeNode>();

  for (const team of params.teamRuns) {
    const fallbackWorkspaceRootPath = team.members
      .map((member) => params.normalizeRootPath(member.workspaceRootPath))
      .find((value) => Boolean(value))
      || params.unassignedWorkspaceKey;
    const normalizedWorkspaceRootPath =
      params.normalizeRootPath(team.workspaceRootPath) ||
      fallbackWorkspaceRootPath;
    const memberTree = buildTeamRowsFromHistoryItem(team);
    const sortedMembers = flattenTeamRows(memberTree);
    const coordinatorMemberRouteKey = team.coordinatorMemberRouteKey?.trim() || '';
    const focusedMemberRouteKey =
      sortedMembers.find((member) => member.memberRouteKey === coordinatorMemberRouteKey)?.memberRouteKey ||
      sortedMembers[0]?.memberRouteKey ||
      '';

    nodesByTeamRunId.set(team.teamRunId, {
      teamRunId: team.teamRunId,
      teamDefinitionId: team.teamDefinitionId,
      teamDefinitionName: team.teamDefinitionName || 'Team',
      workspaceRootPath: normalizedWorkspaceRootPath,
      summary: team.summary,
      lastActivityAt: team.createdAt,
      lastKnownStatus: params.toTeamRunStatus(params.toHistoryTeamStatus(team)).lastKnownStatus,
      isActive: team.isActive,
      currentStatus: params.toHistoryTeamStatus(team),
      deleteLifecycle: 'READY' as const,
      focusedMemberRouteKey,
      members: sortedMembers,
      memberTree,
    });
  }

  for (const teamContext of params.teamContexts) {
    const existing = nodesByTeamRunId.get(teamContext.teamRunId);
    const workspaceRootPath = existing?.workspaceRootPath || params.resolveWorkspaceRootPathFromContext(teamContext);
    const currentStatus = normalizeTeamRuntimeStatus(teamContext.currentStatus);
    const { isActive, lastKnownStatus } = params.toTeamRunStatus(currentStatus);
    const summary = existing?.summary?.trim() || params.summarizeTeamDraft(teamContext);
    const lastActivityAt = existing?.lastActivityAt || params.resolveTeamLastActivityAt(teamContext);
    const memberTree = buildTeamRowsFromContext(
      teamContext,
      summary,
      lastActivityAt,
      params.resolveWorkspaceRootPath,
    );
    const members = flattenTeamRows(memberTree);
    const focusedMemberRouteKey =
      members.find((member) => member.memberRouteKey === teamContext.focusedMemberRouteKey)?.memberRouteKey ||
      members[0]?.memberRouteKey || '';
    const deleteLifecycle = existing?.deleteLifecycle ?? ('READY' as const);
    const teamDefinitionId =
      existing?.teamDefinitionId ||
      teamContext.config.teamDefinitionId ||
      teamContext.teamRunId;

    nodesByTeamRunId.set(teamContext.teamRunId, {
      teamRunId: teamContext.teamRunId,
      teamDefinitionId,
      teamDefinitionName: teamContext.config.teamDefinitionName || existing?.teamDefinitionName || 'Team',
      workspaceRootPath,
      summary,
      lastActivityAt,
      lastKnownStatus,
      isActive,
      currentStatus,
      deleteLifecycle,
      focusedMemberRouteKey,
      members,
      memberTree,
    });
  }

  // Preserve source/insertion order to avoid dynamic recency-based row jumping in the tree.
  const allNodes = Array.from(nodesByTeamRunId.values());
  if (!params.workspaceRootPath) {
    return allNodes;
  }
  const normalizedWorkspaceRootPath = params.normalizeRootPath(params.workspaceRootPath);
  return allNodes.filter((node) => node.workspaceRootPath === normalizedWorkspaceRootPath);
};
