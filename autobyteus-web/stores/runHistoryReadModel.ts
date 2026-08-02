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
  type LocalRunSnapshot,
  type ProjectionWorkspaceDescriptor,
  type ProjectionRunKnownStatus,
  type RunTreeWorkspaceNode,
} from '~/utils/runTreeProjection';
import { mergeRunTreeWithLiveContexts } from '~/utils/runTreeLiveStatusMerge';
import { normalizeAgentRuntimeStatus } from '~/services/runHydration/runtimeStatusNormalization';
import {
  DEFAULT_DRAFT_SUMMARY_PREFIX,
  DRAFT_RUN_ID_PREFIX,
} from '~/utils/runTreeProjectionConstants';
import { resolveFirstUserMessageSummary } from '~/utils/runTreeSummary';
import {
  buildTeamNodes,
  resolveTeamLastActivityAt,
  resolveTeamWorkspaceRootPathFromContext,
  summarizeTeamDraft,
} from '~/stores/runHistoryTeamHelpers';
import { flattenWorkspaceTeamRuns } from '~/stores/runHistoryStoreSupport';

export const UNASSIGNED_TEAM_WORKSPACE_KEY = 'unassigned-team-workspace';
export const UNASSIGNED_TEAM_WORKSPACE_LABEL = 'Unassigned Team Workspace';
export const TEMP_WORKSPACE_ID = 'temp_ws_default';

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
    workspaceRootPath?: string | null;
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
    workspace.workspaceRootPath ||
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
  const firstUserSummary = resolveFirstUserMessageSummary(conversation);
  if (firstUserSummary) {
    return firstUserSummary;
  }
  return `${DEFAULT_DRAFT_SUMMARY_PREFIX}${agentName}`.trim();
};

const toRunStatus = (status: AgentStatus): { isActive: boolean; lastKnownStatus: ProjectionRunKnownStatus } => {
  if (status === AgentStatus.Error) {
    return { isActive: false, lastKnownStatus: 'ERROR' };
  }

  if (status === AgentStatus.Offline) {
    return { isActive: false, lastKnownStatus: 'IDLE' };
  }

  return { isActive: true, lastKnownStatus: 'ACTIVE' };
};

type WorkspaceDescriptorCandidate = ProjectionWorkspaceDescriptor & {
  isFixedTempWorkspace: boolean;
};

const resolveVisibleRunWorkspaceDescriptor = (workspace: {
  workspaceId: string;
  workspaceRootPath?: string | null;
  absolutePath?: string | null;
  name?: string | null;
  displayName?: string | null;
  kind?: string | null;
  isTemp?: boolean | null;
}): WorkspaceDescriptorCandidate | null => {
  const workspaceId = workspace.workspaceId?.trim();
  const normalizedRoot = normalizeRootPath(workspace.workspaceRootPath || workspace.absolutePath || null);
  if (!workspaceId || !normalizedRoot) {
    return null;
  }

  const isFixedTempWorkspace = workspaceId === TEMP_WORKSPACE_ID;
  const isTempWorkspace = workspace.kind === 'temp' || workspace.isTemp === true || isFixedTempWorkspace;
  const isFilesystemWorkspace = !workspace.kind || workspace.kind === 'filesystem';

  if (!isFilesystemWorkspace && !isTempWorkspace) {
    return null;
  }

  return {
    workspaceId,
    workspaceRootPath: normalizedRoot,
    workspaceName: workspace.displayName || workspace.name || displayWorkspaceName(normalizedRoot),
    workspaceKind: isTempWorkspace ? 'temp' : 'filesystem',
    canRemoveFromWorkspaces: isFilesystemWorkspace && !isTempWorkspace,
    isFixedTempWorkspace,
  };
};

const buildVisibleRunWorkspaceDescriptors = (
  workspaces: Array<{
    workspaceId: string;
    workspaceRootPath?: string | null;
    absolutePath?: string | null;
    name?: string | null;
    displayName?: string | null;
    kind?: string | null;
    isTemp?: boolean | null;
  }>,
): ProjectionWorkspaceDescriptor[] => {
  const workspaceDescriptors = new Map<string, WorkspaceDescriptorCandidate>();

  for (const workspace of workspaces) {
    const descriptor = resolveVisibleRunWorkspaceDescriptor(workspace);
    if (!descriptor) {
      continue;
    }

    const existing = workspaceDescriptors.get(descriptor.workspaceRootPath);
    if (!existing || descriptor.isFixedTempWorkspace) {
      workspaceDescriptors.set(descriptor.workspaceRootPath, descriptor);
    }
  }

  return Array.from(workspaceDescriptors.values()).map((descriptor) => ({
    workspaceId: descriptor.workspaceId,
    workspaceRootPath: descriptor.workspaceRootPath,
    workspaceName: descriptor.workspaceName,
    workspaceKind: descriptor.workspaceKind,
    canRemoveFromWorkspaces: descriptor.canRemoveFromWorkspaces,
  }));
};

export const buildRunHistoryTreeNodes = (params: {
  workspaceGroups: RunHistoryWorkspaceGroup[];
  agentAvatarByDefinitionId: Record<string, string>;
  allWorkspaces: Array<{
    workspaceId: string;
    workspaceRootPath?: string | null;
    absolutePath?: string | null;
    name?: string | null;
    displayName?: string | null;
    kind?: string | null;
    isTemp?: boolean | null;
  }>;
  workspacesById: Record<string, {
    workspaceRootPath?: string | null;
    absolutePath?: string | null;
    workspaceConfig?: { root_path?: string | null; rootPath?: string | null } | null;
  }>;
  agentContexts: Map<string, {
    config: {
      agentDefinitionId: string;
      agentDefinitionName?: string | null;
      workspaceId?: string | null;
      workspaceMetadata?: { workspaceRootPath?: string | null } | null;
      agentAvatarUrl?: string | null;
    };
    state: {
      currentStatus: AgentStatus;
      conversation: Conversation;
    };
  }>;
}): RunTreeWorkspaceNode[] => {
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

  const workspaceDescriptors = buildVisibleRunWorkspaceDescriptors(params.allWorkspaces);

  const persistedWorkspaces = params.workspaceGroups.map((workspace) => ({
    ...workspace,
    agentDefinitions: workspace.agentDefinitions.map((agent) => ({
      ...agent,
      agentAvatarUrl:
        agent.agentAvatarUrl ??
        agentAvatarByDefinitionId.get(agent.agentDefinitionId) ??
        null,
      runs: agent.runs.map((run) => {
        const currentStatus = normalizeAgentRuntimeStatus(run.status);
        const { lastKnownStatus } = toRunStatus(currentStatus);
        return {
          ...run,
          lastActivityAt: run.createdAt,
          currentStatus,
          lastKnownStatus,
        };
      }),
    })),
  }));

  const localRuns: LocalRunSnapshot[] = [];
  for (const [runId, context] of params.agentContexts.entries()) {
    const workspaceRootPath =
      context.config.workspaceMetadata?.workspaceRootPath ||
      resolveWorkspaceRootPath(
        params.workspacesById,
        context.config.workspaceId ?? null,
      );
    if (!workspaceRootPath) {
      continue;
    }

    const agentName = context.config.agentDefinitionName || 'Agent';
    const conversation = context.state.conversation;
    const currentStatus = normalizeAgentRuntimeStatus(context.state.currentStatus);
    const { isActive, lastKnownStatus } = toRunStatus(currentStatus);
    const agentAvatarUrl =
      context.config.agentAvatarUrl?.trim() ||
      agentAvatarByDefinitionId.get(context.config.agentDefinitionId) ||
      null;

    localRuns.push({
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
      currentStatus,
      lastKnownStatus,
      isActive,
      source: runId.startsWith(DRAFT_RUN_ID_PREFIX) ? 'draft' : 'local',
    });
  }

  const projectedTree = buildRunTreeProjection({
    persistedWorkspaces: persistedWorkspaces.map((workspace) => ({
      workspaceRootPath: workspace.workspaceRootPath,
      workspaceName: workspace.workspaceName,
      agents: workspace.agentDefinitions,
    })),
    workspaceDescriptors,
    localRuns,
  });

  return mergeRunTreeWithLiveContexts(projectedTree, params.agentContexts);
};

export const buildRunHistoryTeamNodes = (params: {
  workspaceGroups: RunHistoryWorkspaceGroup[];
  teamContexts: AgentTeamContext[];
  workspacesById: Record<string, {
    workspaceRootPath?: string | null;
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
