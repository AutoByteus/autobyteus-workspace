import type { Conversation } from '~/types/conversation';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type {
  RunHistoryItem,
  RunHistoryWorkspaceGroup,
  TeamRunHistoryItem,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';
import {
  buildRunTreeProjection,
  type DraftRunSnapshot,
  type RunTreeWorkspaceNode,
} from '~/utils/runTreeProjection';
import { mergeRunTreeWithLiveContexts } from '~/utils/runTreeLiveStatusMerge';
import {
  DEFAULT_DRAFT_SUMMARY_PREFIX,
  DRAFT_RUN_ID_PREFIX,
} from '~/utils/runTreeProjectionConstants';
import {
  buildTeamNodes,
  resolveTeamLastActivityAt,
  resolveTeamWorkspaceRootPathFromContext,
  summarizeTeamDraft,
  toHistoryTeamStatus,
  toTeamRunStatus,
} from '~/stores/runHistoryTeamHelpers';
import { flattenWorkspaceTeamRuns } from '~/stores/runHistoryStoreSupport';

export const UNASSIGNED_TEAM_WORKSPACE_KEY = 'unassigned-team-workspace';
export const UNASSIGNED_TEAM_WORKSPACE_LABEL = 'Unassigned Team Workspace';

export const normalizeRootPath = (value: string | null | undefined): string => {
  const source = (value || '').trim();
  if (!source) {
    return '';
  }
  const normalized = source.replace(/\\/g, '/');
  if (normalized === '/') {
    return normalized;
  }
  return normalized.replace(/\/+$/, '');
};

const displayWorkspaceName = (workspaceRootPath: string): string => {
  if (workspaceRootPath === UNASSIGNED_TEAM_WORKSPACE_KEY) {
    return UNASSIGNED_TEAM_WORKSPACE_LABEL;
  }
  const normalized = normalizeRootPath(workspaceRootPath);
  if (!normalized) {
    return 'workspace';
  }
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] || normalized;
};

export const resolveWorkspaceRootPath = (
  workspacesById: Record<string, {
    absolutePath?: string | null;
    workspaceConfig?: { root_path?: string | null; rootPath?: string | null } | null;
  }>,
  workspaceId: string | null,
): string => {
  if (!workspaceId) {
    return '';
  }

  const workspace = workspacesById[workspaceId];
  if (!workspace) {
    return '';
  }

  return normalizeRootPath(
    workspace.absolutePath ||
      workspace.workspaceConfig?.root_path ||
      workspace.workspaceConfig?.rootPath ||
      null,
  );
};

const summarizeDraftRun = (
  conversation: Conversation,
  agentName: string,
): string => {
  const firstUserMessage = conversation.messages.find(
    message => message.type === 'user' && message.text?.trim().length > 0,
  );
  if (firstUserMessage?.type === 'user') {
    return firstUserMessage.text.trim();
  }
  return `${DEFAULT_DRAFT_SUMMARY_PREFIX}${agentName}`.trim();
};

const toRunStatus = (status: AgentStatus): Pick<RunHistoryItem, 'isActive' | 'lastKnownStatus'> => {
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

export const buildRunHistoryTreeNodes = (params: {
  workspaceGroups: RunHistoryWorkspaceGroup[];
  agentAvatarByDefinitionId: Record<string, string>;
  allWorkspaces: Array<{ absolutePath?: string | null; name?: string | null }>;
  workspacesById: Record<string, {
    absolutePath?: string | null;
    workspaceConfig?: { root_path?: string | null; rootPath?: string | null } | null;
  }>;
  agentContexts: Map<string, {
    config: {
      agentDefinitionId: string;
      agentDefinitionName?: string | null;
      workspaceId?: string | null;
      agentAvatarUrl?: string | null;
    };
    state: {
      currentStatus: AgentStatus;
      conversation: Conversation;
    };
  }>;
}): RunTreeWorkspaceNode[] => {
  const workspaceDescriptors = new Map<string, string>();
  const agentAvatarByDefinitionId = new Map<string, string>(
    Object.entries(params.agentAvatarByDefinitionId),
  );

  for (const context of params.agentContexts.values()) {
    const definitionId = context.config.agentDefinitionId;
    const avatarUrl = context.config.agentAvatarUrl?.trim();
    if (definitionId && avatarUrl) {
      agentAvatarByDefinitionId.set(definitionId, avatarUrl);
    }
  }

  for (const group of params.workspaceGroups) {
    const normalizedRoot = normalizeRootPath(group.workspaceRootPath);
    if (!normalizedRoot) {
      continue;
    }
    workspaceDescriptors.set(
      normalizedRoot,
      group.workspaceName || displayWorkspaceName(normalizedRoot),
    );
  }

  for (const workspace of params.allWorkspaces) {
    const normalizedRoot = normalizeRootPath(workspace.absolutePath || null);
    if (!normalizedRoot) {
      continue;
    }
    if (!workspaceDescriptors.has(normalizedRoot)) {
      workspaceDescriptors.set(
        normalizedRoot,
        workspace.name || displayWorkspaceName(normalizedRoot),
      );
    }
  }

  const persistedWorkspaces: RunHistoryWorkspaceGroup[] = params.workspaceGroups.map((workspace) => ({
    ...workspace,
    agentDefinitions: workspace.agentDefinitions.map((agent) => ({
      ...agent,
      agentAvatarUrl:
        agent.agentAvatarUrl ??
        agentAvatarByDefinitionId.get(agent.agentDefinitionId) ??
        null,
    })),
  }));

  const draftRuns: DraftRunSnapshot[] = [];
  for (const [runId, context] of params.agentContexts.entries()) {
    if (!runId.startsWith(DRAFT_RUN_ID_PREFIX)) {
      continue;
    }

    const workspaceRootPath = resolveWorkspaceRootPath(
      params.workspacesById,
      context.config.workspaceId ?? null,
    );
    if (!workspaceRootPath) {
      continue;
    }

    const agentName = context.config.agentDefinitionName || 'Agent';
    const conversation = context.state.conversation;
    const { isActive, lastKnownStatus } = toRunStatus(context.state.currentStatus);
    const agentAvatarUrl =
      context.config.agentAvatarUrl?.trim() ||
      agentAvatarByDefinitionId.get(context.config.agentDefinitionId) ||
      null;

    draftRuns.push({
      runId,
      workspaceRootPath,
      agentDefinitionId: context.config.agentDefinitionId,
      agentName,
      agentAvatarUrl,
      summary: summarizeDraftRun(conversation, agentName),
      lastActivityAt:
        conversation.updatedAt ||
        conversation.createdAt ||
        new Date().toISOString(),
      lastKnownStatus,
      isActive,
    });
  }

  const projectedTree = buildRunTreeProjection({
    persistedWorkspaces: persistedWorkspaces.map((workspace) => ({
      workspaceRootPath: workspace.workspaceRootPath,
      workspaceName: workspace.workspaceName,
      agents: workspace.agentDefinitions,
    })),
    workspaceDescriptors: Array.from(workspaceDescriptors.entries()).map(
      ([workspaceRootPath, workspaceName]) => ({
        workspaceRootPath,
        workspaceName,
      }),
    ),
    draftRuns,
  });

  return mergeRunTreeWithLiveContexts(projectedTree, params.agentContexts);
};

export const buildRunHistoryTeamNodes = (params: {
  workspaceGroups: RunHistoryWorkspaceGroup[];
  teamContexts: AgentTeamContext[];
  workspacesById: Record<string, {
    absolutePath?: string | null;
    workspaceConfig?: { root_path?: string | null; rootPath?: string | null } | null;
  }>;
  workspaceRootPath?: string;
}): TeamTreeNode[] => {
  const resolveWorkspaceRootPathById = (workspaceId: string | null): string =>
    resolveWorkspaceRootPath(params.workspacesById, workspaceId);

  const persistedTeamRuns = flattenWorkspaceTeamRuns(params.workspaceGroups);

  return buildTeamNodes({
    teamRuns: persistedTeamRuns,
    teamContexts: params.teamContexts,
    workspaceRootPath: params.workspaceRootPath,
    normalizeRootPath,
    resolveWorkspaceRootPath: resolveWorkspaceRootPathById,
    resolveWorkspaceRootPathFromContext: (teamContext: AgentTeamContext) =>
      resolveTeamWorkspaceRootPathFromContext(
        teamContext,
        resolveWorkspaceRootPathById,
        UNASSIGNED_TEAM_WORKSPACE_KEY,
      ),
    summarizeTeamDraft: (teamContext: AgentTeamContext) =>
      summarizeTeamDraft(teamContext, DEFAULT_DRAFT_SUMMARY_PREFIX),
    resolveTeamLastActivityAt,
    toHistoryTeamStatus,
    toTeamRunStatus,
    unassignedWorkspaceKey: UNASSIGNED_TEAM_WORKSPACE_KEY,
  });
};

export const formatRunHistoryRelativeTime = (isoTime: string): string => {
  const time = Date.parse(isoTime);
  if (!Number.isFinite(time)) {
    return '';
  }

  const deltaMs = Date.now() - time;
  if (deltaMs < 60_000) {
    return 'now';
  }

  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
};

export const findAgentNameByRunId = (
  workspaceGroups: RunHistoryWorkspaceGroup[],
  runId: string,
): string | null => {
  for (const workspace of workspaceGroups) {
    for (const agent of workspace.agentDefinitions) {
      if (agent.runs.some(run => run.runId === runId)) {
        return agent.agentName;
      }
    }
  }
  return null;
};
