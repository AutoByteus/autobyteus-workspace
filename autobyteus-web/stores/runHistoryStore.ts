import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import {
  GetTeamMemberRunProjection,
  GetTeamRunResumeConfig,
  ListRunHistory,
  ListTeamRunHistory,
} from '~/graphql/queries/runHistoryQueries';
import { DeleteRunHistory, DeleteTeamRunHistory } from '~/graphql/mutations/runHistoryMutations';
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  type AgentRunConfig,
  type AgentRuntimeKind,
  type SkillAccessMode,
} from '~/types/agent/AgentRunConfig';
import type { Conversation } from '~/types/conversation';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import {
  buildRunTreeProjection,
  type DraftRunSnapshot,
  type RunTreeRow,
  type RunTreeWorkspaceNode,
} from '~/utils/runTreeProjection';
import { mergeRunTreeWithLiveContexts } from '~/utils/runTreeLiveStatusMerge';
import {
  DEFAULT_DRAFT_SUMMARY_PREFIX,
  DRAFT_RUN_ID_PREFIX,
} from '~/utils/runTreeProjectionConstants';
import {
  pickPreferredRunTemplate,
  resolveRunnableModelIdentifier,
} from '~/utils/runLaunchPolicy';
import {
  buildConversationFromProjection,
  openRunWithCoordinator,
  type RunProjectionConversationEntry,
} from '~/services/runOpen/runOpenCoordinator';

export type RunKnownStatus = 'ACTIVE' | 'IDLE' | 'ERROR';

export interface RunHistoryItem {
  runId: string;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: RunKnownStatus;
  isActive: boolean;
}

export interface RunHistoryAgentGroup {
  agentDefinitionId: string;
  agentName: string;
  agentAvatarUrl?: string | null;
  runs: RunHistoryItem[];
}

export interface RunHistoryWorkspaceGroup {
  workspaceRootPath: string;
  workspaceName: string;
  agents: RunHistoryAgentGroup[];
}

export interface RunEditableFieldFlags {
  llmModelIdentifier: boolean;
  llmConfig: boolean;
  autoExecuteTools: boolean;
  skillAccessMode: boolean;
  workspaceRootPath: boolean;
  runtimeKind: boolean;
}

export interface RunManifestConfigPayload {
  agentDefinitionId: string;
  workspaceRootPath: string;
  llmModelIdentifier: string;
  llmConfig?: Record<string, unknown> | null;
  autoExecuteTools: boolean;
  skillAccessMode?: SkillAccessMode | null;
  runtimeKind?: AgentRuntimeKind | null;
  runtimeReference?: {
    runtimeKind: string;
    sessionId?: string | null;
    threadId?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
}

export interface RunResumeConfigPayload {
  runId: string;
  isActive: boolean;
  manifestConfig: RunManifestConfigPayload;
  editableFields: RunEditableFieldFlags;
}

export type TeamRunKnownStatus = 'ACTIVE' | 'IDLE' | 'ERROR';
export type TeamRunDeleteLifecycle = 'READY' | 'CLEANUP_PENDING';

export interface TeamRunMemberHistoryItem {
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  workspaceRootPath?: string | null;
}

export interface TeamRunHistoryItem {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath?: string | null;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: TeamRunKnownStatus;
  deleteLifecycle: TeamRunDeleteLifecycle;
  isActive: boolean;
  members: TeamRunMemberHistoryItem[];
}

interface TeamRunManifestMemberBinding {
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string | null;
}

interface TeamRunManifestPayload {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  coordinatorMemberRouteKey: string;
  runVersion: number;
  createdAt: string;
  updatedAt: string;
  memberBindings: TeamRunManifestMemberBinding[];
}

interface TeamRunResumeConfigPayload {
  teamRunId: string;
  isActive: boolean;
  manifest: TeamRunManifestPayload;
}

export interface TeamMemberTreeRow {
  teamRunId: string;
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  workspaceRootPath: string | null;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: TeamRunKnownStatus;
  isActive: boolean;
  deleteLifecycle: TeamRunDeleteLifecycle;
}

export interface TeamTreeNode {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath: string;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: TeamRunKnownStatus;
  isActive: boolean;
  currentStatus: AgentTeamStatus;
  deleteLifecycle: TeamRunDeleteLifecycle;
  focusedMemberName: string;
  members: TeamMemberTreeRow[];
}

interface ListRunHistoryQueryData {
  listRunHistory: RunHistoryWorkspaceGroup[];
}

interface ListTeamRunHistoryQueryData {
  listTeamRunHistory: TeamRunHistoryItem[];
}

interface TeamMemberRunProjectionPayload {
  agentRunId: string;
  conversation: RunProjectionConversationEntry[];
  summary?: string | null;
  lastActivityAt?: string | null;
}

interface GetTeamMemberRunProjectionQueryData {
  getTeamMemberRunProjection: TeamMemberRunProjectionPayload;
}

interface GetTeamRunResumeConfigQueryData {
  getTeamRunResumeConfig: {
    teamRunId: string;
    isActive: boolean;
    manifest: unknown;
  };
}

interface DeleteRunHistoryMutationData {
  deleteRunHistory: {
    success: boolean;
    message: string;
  };
}

interface DeleteTeamRunHistoryMutationData {
  deleteTeamRunHistory: {
    success: boolean;
    message: string;
  };
}

const FALSE_EDITABLE_FIELDS: RunEditableFieldFlags = {
  llmModelIdentifier: false,
  llmConfig: false,
  autoExecuteTools: false,
  skillAccessMode: false,
  workspaceRootPath: false,
  runtimeKind: false,
};

const UNASSIGNED_TEAM_WORKSPACE_KEY = 'unassigned-team-workspace';
const UNASSIGNED_TEAM_WORKSPACE_LABEL = 'Unassigned Team Workspace';

const normalizeRootPath = (value: string | null | undefined): string => {
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

const resolveWorkspaceRootPath = (
  workspaceStore: ReturnType<typeof useWorkspaceStore>,
  workspaceId: string | null,
): string => {
  if (!workspaceId) {
    return '';
  }

  const workspace = workspaceStore.workspaces[workspaceId];
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

const removeRunFromWorkspaceGroups = (
  groups: RunHistoryWorkspaceGroup[],
  runId: string,
): RunHistoryWorkspaceGroup[] => {
  return groups
    .map((workspace) => ({
      ...workspace,
      agents: workspace.agents
        .map((agent) => ({
          ...agent,
          runs: agent.runs.filter((run) => run.runId !== runId),
        }))
        .filter((agent) => agent.runs.length > 0),
    }))
    .filter((workspace) => workspace.agents.length > 0);
};

const removeTeamRunById = (
  rows: TeamRunHistoryItem[],
  teamRunId: string,
): TeamRunHistoryItem[] => rows.filter((row) => row.teamRunId !== teamRunId);

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const parseTeamRunManifest = (value: unknown): TeamRunManifestPayload => {
  const payload = asRecord(value);
  const memberBindings = Array.isArray(payload.memberBindings)
    ? payload.memberBindings.map((item) => {
        const binding = asRecord(item);
        return {
          memberRouteKey: String(binding.memberRouteKey || ''),
          memberName: String(binding.memberName || ''),
          memberRunId: String(binding.memberRunId ?? ''),
          agentDefinitionId: String(binding.agentDefinitionId || ''),
          llmModelIdentifier: String(binding.llmModelIdentifier || ''),
          autoExecuteTools: Boolean(binding.autoExecuteTools),
          llmConfig:
            binding.llmConfig && typeof binding.llmConfig === 'object' && !Array.isArray(binding.llmConfig)
              ? (binding.llmConfig as Record<string, unknown>)
              : null,
          workspaceRootPath:
            typeof binding.workspaceRootPath === 'string' ? binding.workspaceRootPath : null,
        };
      })
    : [];
  return {
    teamRunId: String(payload.teamRunId ?? ''),
    teamDefinitionId: String(payload.teamDefinitionId || ''),
    teamDefinitionName: String(payload.teamDefinitionName || ''),
    coordinatorMemberRouteKey: String(payload.coordinatorMemberRouteKey || ''),
    runVersion: Number(payload.runVersion || 1),
    createdAt: String(payload.createdAt || new Date().toISOString()),
    updatedAt: String(payload.updatedAt || new Date().toISOString()),
    memberBindings,
  };
};

const toTeamMemberKey = (member: { memberRouteKey: string; memberName: string }): string =>
  member.memberRouteKey || member.memberName;

const toHistoryTeamStatus = (team: Pick<TeamRunHistoryItem, 'isActive' | 'lastKnownStatus'>): AgentTeamStatus => {
  if (team.lastKnownStatus === 'ERROR') {
    return AgentTeamStatus.Error;
  }
  if (!team.isActive) {
    return AgentTeamStatus.ShutdownComplete;
  }
  return AgentTeamStatus.Processing;
};

const toTeamRunStatus = (
  status: AgentTeamStatus,
): Pick<TeamRunHistoryItem, 'isActive' | 'lastKnownStatus'> => {
  if (status === AgentTeamStatus.Error) {
    return { isActive: false, lastKnownStatus: 'ERROR' };
  }

  if (
    status === AgentTeamStatus.Uninitialized ||
    status === AgentTeamStatus.ShutdownComplete
  ) {
    return { isActive: false, lastKnownStatus: 'IDLE' };
  }

  return { isActive: true, lastKnownStatus: 'ACTIVE' };
};

const summarizeTeamDraft = (teamContext: AgentTeamContext): string => {
  const focusedContext = teamContext.members.get(teamContext.focusedMemberName) ?? null;
  const candidateContexts = focusedContext
    ? [focusedContext, ...Array.from(teamContext.members.values()).filter((member) => member !== focusedContext)]
    : Array.from(teamContext.members.values());

  for (const member of candidateContexts) {
    const firstUserMessage = member.state.conversation.messages.find(
      (message) => message.type === 'user' && message.text?.trim().length > 0,
    );
    if (firstUserMessage?.type === 'user') {
      return firstUserMessage.text.trim();
    }
  }

  return `${DEFAULT_DRAFT_SUMMARY_PREFIX}${teamContext.config.teamDefinitionName || 'Team'}`.trim();
};

const resolveTeamLastActivityAt = (teamContext: AgentTeamContext): string => {
  let latest = '';
  for (const member of teamContext.members.values()) {
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

const resolveTeamWorkspaceRootPathFromContext = (
  workspaceStore: ReturnType<typeof useWorkspaceStore>,
  teamContext: AgentTeamContext,
): string => {
  const fromTeamConfig = resolveWorkspaceRootPath(workspaceStore, teamContext.config.workspaceId);
  if (fromTeamConfig) {
    return fromTeamConfig;
  }
  for (const member of teamContext.members.values()) {
    const fromMemberConfig = resolveWorkspaceRootPath(workspaceStore, member.config.workspaceId);
    if (fromMemberConfig) {
      return fromMemberConfig;
    }
  }
  return UNASSIGNED_TEAM_WORKSPACE_KEY;
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

export const useRunHistoryStore = defineStore('runHistory', {
  state: () => ({
    workspaceGroups: [] as RunHistoryWorkspaceGroup[],
    teamRuns: [] as TeamRunHistoryItem[],
    agentAvatarByDefinitionId: {} as Record<string, string>,
    resumeConfigByRunId: {} as Record<string, RunResumeConfigPayload>,
    teamResumeConfigByTeamRunId: {} as Record<string, TeamRunResumeConfigPayload>,
    selectedRunId: null as string | null,
    selectedTeamRunId: null as string | null,
    selectedTeamMemberRouteKey: null as string | null,
    teamDraftProjectionRevision: 0,
    loading: false,
    openingRun: false,
    error: null as string | null,
  }),

  getters: {
    getResumeConfig: (state) => (runId: string): RunResumeConfigPayload | null => {
      return state.resumeConfigByRunId[runId] || null;
    },

    getEditableFields: (state) => (runId: string): RunEditableFieldFlags | null => {
      return state.resumeConfigByRunId[runId]?.editableFields || null;
    },

    isRunActive: (state) => (runId: string): boolean => {
      return Boolean(state.resumeConfigByRunId[runId]?.isActive);
    },

    isWorkspaceLockedForRun: (state) => (runId: string): boolean => {
      const editable = state.resumeConfigByRunId[runId]?.editableFields;
      if (!editable) {
        return false;
      }
      return !editable.workspaceRootPath;
    },

    isRuntimeLockedForRun: (state) => (runId: string): boolean => {
      const editable = state.resumeConfigByRunId[runId]?.editableFields;
      if (!editable) {
        return false;
      }
      return !editable.runtimeKind;
    },
  },

  actions: {
    async fetchTree(limitPerAgent = 6): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        const windowNodeContextStore = useWindowNodeContextStore();
        const isReady = await windowNodeContextStore.waitForBoundBackendReady();
        if (!isReady) {
          throw new Error(windowNodeContextStore.lastReadyError || 'Bound backend is not ready');
        }

        const client = getApolloClient();
        const [agentHistoryResult, teamHistoryResult] = await Promise.all([
          client.query<ListRunHistoryQueryData>({
            query: ListRunHistory,
            variables: { limitPerAgent },
            fetchPolicy: 'network-only',
          }),
          client.query<ListTeamRunHistoryQueryData>({
            query: ListTeamRunHistory,
            fetchPolicy: 'network-only',
          }),
        ]);

        if (agentHistoryResult.errors && agentHistoryResult.errors.length > 0) {
          throw new Error(agentHistoryResult.errors.map((e: { message: string }) => e.message).join(', '));
        }
        if (teamHistoryResult.errors && teamHistoryResult.errors.length > 0) {
          throw new Error(teamHistoryResult.errors.map((e: { message: string }) => e.message).join(', '));
        }

        this.workspaceGroups = agentHistoryResult.data?.listRunHistory || [];
        this.teamRuns = teamHistoryResult.data?.listTeamRunHistory || [];
        await this.refreshAgentAvatarIndex({ loadDefinitionsIfNeeded: true });
      } catch (error: any) {
        this.error = error?.message || 'Failed to load run history.';
      } finally {
        this.loading = false;
      }
    },

    async refreshAgentAvatarIndex(options: { loadDefinitionsIfNeeded?: boolean } = {}): Promise<void> {
      const agentDefinitionStore = useAgentDefinitionStore();
      const agentContextsStore = useAgentContextsStore();
      const shouldLoadDefinitions = options.loadDefinitionsIfNeeded ?? false;

      if (shouldLoadDefinitions && agentDefinitionStore.agentDefinitions.length === 0) {
        try {
          await agentDefinitionStore.fetchAllAgentDefinitions();
        } catch {
          // Best-effort hydration only.
        }
      }

      const next: Record<string, string> = { ...this.agentAvatarByDefinitionId };

      for (const definition of agentDefinitionStore.agentDefinitions) {
        const avatarUrl = definition.avatarUrl?.trim();
        if (avatarUrl) {
          next[definition.id] = avatarUrl;
        }
      }

      for (const context of agentContextsStore.runs.values()) {
        const definitionId = context.config.agentDefinitionId;
        const avatarUrl = context.config.agentAvatarUrl?.trim();
        if (definitionId && avatarUrl) {
          next[definitionId] = avatarUrl;
        }
      }

      this.agentAvatarByDefinitionId = next;
    },

    async openRun(runId: string): Promise<void> {
      this.openingRun = true;
      this.error = null;

      try {
        const result = await openRunWithCoordinator({
          runId,
          fallbackAgentName: this.findAgentNameByRunId(runId),
          ensureWorkspaceByRootPath: (rootPath: string) => this.ensureWorkspaceByRootPath(rootPath),
        });

        this.resumeConfigByRunId[runId] = result.resumeConfig;
        this.selectedRunId = result.runId;
        this.selectedTeamRunId = null;
        this.selectedTeamMemberRouteKey = null;
      } catch (error: any) {
        this.error = error?.message || `Failed to open run '${runId}'.`;
        throw error;
      } finally {
        this.openingRun = false;
      }
    },

    async createDraftRun(options: {
      workspaceRootPath: string;
      agentDefinitionId: string;
    }): Promise<void> {
      const agentDefinitionStore = useAgentDefinitionStore();
      if (agentDefinitionStore.agentDefinitions.length === 0) {
        await agentDefinitionStore.fetchAllAgentDefinitions();
      }

      const definition = agentDefinitionStore.getAgentDefinitionById(options.agentDefinitionId);
      if (!definition) {
        throw new Error(`Agent definition '${options.agentDefinitionId}' was not found.`);
      }

      const workspaceId = await this.ensureWorkspaceByRootPath(options.workspaceRootPath);
      if (!workspaceId) {
        throw new Error(`Workspace '${options.workspaceRootPath}' could not be resolved.`);
      }

      const agentRunConfigStore = useAgentRunConfigStore();
      const llmProviderConfigStore = useLLMProviderConfigStore();
      const teamRunConfigStore = useTeamRunConfigStore();
      const selectionStore = useAgentSelectionStore();
      const agentContextsStore = useAgentContextsStore();

      const templateCandidates = Array.from(agentContextsStore.runs.values()).filter(
        (context) => context.config.agentDefinitionId === options.agentDefinitionId,
      );
      const preferredTemplate = pickPreferredRunTemplate(templateCandidates, workspaceId);

      const bufferedModelCandidate =
        agentRunConfigStore.config?.agentDefinitionId === options.agentDefinitionId
          ? agentRunConfigStore.config.llmModelIdentifier
          : '';
      const resolvedModelIdentifier = await resolveRunnableModelIdentifier({
        candidateModels: [
          preferredTemplate?.config.llmModelIdentifier,
          bufferedModelCandidate,
        ],
        getKnownModels: () => llmProviderConfigStore.models,
        ensureModelsLoaded: async () => {
          await llmProviderConfigStore.fetchProvidersWithModels(
            preferredTemplate?.config.runtimeKind ?? DEFAULT_AGENT_RUNTIME_KIND,
          );
        },
      });

      if (!resolvedModelIdentifier) {
        throw new Error('No model is available to start a new run.');
      }

      teamRunConfigStore.clearConfig();
      if (preferredTemplate) {
        agentRunConfigStore.setAgentConfig({
          ...preferredTemplate.config,
          agentDefinitionId: definition.id,
          agentDefinitionName: definition.name,
          agentAvatarUrl: definition.avatarUrl ?? preferredTemplate.config.agentAvatarUrl ?? null,
          workspaceId,
          llmModelIdentifier: resolvedModelIdentifier,
          isLocked: false,
        });
      } else {
        agentRunConfigStore.setTemplate(definition);
        agentRunConfigStore.updateAgentConfig({
          workspaceId,
          llmModelIdentifier: resolvedModelIdentifier,
        });
      }

      selectionStore.clearSelection();
      this.selectedRunId = null;
      this.selectedTeamRunId = null;
      this.selectedTeamMemberRouteKey = null;
    },

    async createWorkspace(rootPath: string): Promise<string> {
      const workspaceStore = useWorkspaceStore();
      const workspaceId = await workspaceStore.createWorkspace({ root_path: rootPath });
      const workspace = workspaceStore.workspaces[workspaceId];
      return workspace?.absolutePath || rootPath;
    },

    markRunAsActive(runId: string): void {
      const resumeConfig = this.resumeConfigByRunId[runId];
      if (resumeConfig) {
        this.resumeConfigByRunId[runId] = {
          ...resumeConfig,
          isActive: true,
          editableFields: { ...FALSE_EDITABLE_FIELDS },
        };
      }

      const now = new Date().toISOString();
      this.workspaceGroups = this.workspaceGroups.map((workspace) => ({
        ...workspace,
        agents: workspace.agents.map((agent) => ({
          ...agent,
          runs: agent.runs.map((run) =>
            run.runId === runId
              ? {
                  ...run,
                  isActive: true,
                  lastKnownStatus: 'ACTIVE',
                  lastActivityAt: now,
                }
              : run,
          ),
        })),
      }));
    },

    markRunAsInactive(runId: string): void {
      const resumeConfig = this.resumeConfigByRunId[runId];
      if (resumeConfig) {
        this.resumeConfigByRunId[runId] = {
          ...resumeConfig,
          isActive: false,
          editableFields: {
            llmModelIdentifier: true,
            llmConfig: true,
            autoExecuteTools: true,
            skillAccessMode: true,
            workspaceRootPath: false,
            runtimeKind: false,
          },
        };
      }

      const now = new Date().toISOString();
      this.workspaceGroups = this.workspaceGroups.map((workspace) => ({
        ...workspace,
        agents: workspace.agents.map((agent) => ({
          ...agent,
          runs: agent.runs.map((run) =>
            run.runId === runId
              ? {
                  ...run,
                  isActive: false,
                  lastKnownStatus: run.lastKnownStatus === 'ERROR' ? 'ERROR' : 'IDLE',
                  lastActivityAt: now,
                }
              : run,
          ),
        })),
      }));
    },

    markTeamAsActive(teamRunId: string): void {
      const now = new Date().toISOString();
      this.teamRuns = this.teamRuns.map((team) => {
        if (team.teamRunId !== teamRunId) {
          return team;
        }
        return {
          ...team,
          isActive: true,
          lastKnownStatus: 'ACTIVE',
          lastActivityAt: now,
        };
      });

      const existing = this.teamResumeConfigByTeamRunId[teamRunId];
      if (existing) {
        this.teamResumeConfigByTeamRunId[teamRunId] = {
          ...existing,
          isActive: true,
        };
      }
    },

    markTeamAsInactive(teamRunId: string): void {
      const now = new Date().toISOString();
      this.teamRuns = this.teamRuns.map((team) => {
        if (team.teamRunId !== teamRunId) {
          return team;
        }
        return {
          ...team,
          isActive: false,
          lastKnownStatus: team.lastKnownStatus === 'ERROR' ? 'ERROR' : 'IDLE',
          lastActivityAt: now,
        };
      });

      const existing = this.teamResumeConfigByTeamRunId[teamRunId];
      if (existing) {
        this.teamResumeConfigByTeamRunId[teamRunId] = {
          ...existing,
          isActive: false,
        };
      }
    },

    markTeamDraftProjectionDirty(): void {
      this.teamDraftProjectionRevision += 1;
    },

    async deleteRun(runId: string): Promise<boolean> {
      const normalizedRunId = runId.trim();
      if (!normalizedRunId || normalizedRunId.startsWith(DRAFT_RUN_ID_PREFIX)) {
        return false;
      }

      try {
        const client = getApolloClient();
        const { data, errors } = await client.mutate<DeleteRunHistoryMutationData>({
          mutation: DeleteRunHistory,
          variables: { runId: normalizedRunId },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        const result = data?.deleteRunHistory;
        if (!result?.success) {
          return false;
        }

        const nextResumeConfigs = { ...this.resumeConfigByRunId };
        delete nextResumeConfigs[normalizedRunId];
        this.resumeConfigByRunId = nextResumeConfigs;
        this.workspaceGroups = removeRunFromWorkspaceGroups(this.workspaceGroups, normalizedRunId);

        const agentContextsStore = useAgentContextsStore();
        const hadContext = Boolean(agentContextsStore.getRun(normalizedRunId));
        if (hadContext) {
          agentContextsStore.removeRun(normalizedRunId);
        }

        const selectionStore = useAgentSelectionStore();
        const selectedBySelectionStore =
          selectionStore.selectedType === 'agent' &&
          selectionStore.selectedRunId === normalizedRunId;
        if (selectedBySelectionStore && !hadContext) {
          selectionStore.clearSelection();
        }

        if (this.selectedRunId === normalizedRunId) {
          this.selectedRunId = null;
        }

        await this.refreshTreeQuietly();
        return true;
      } catch (error: any) {
        console.error(`Failed to delete run '${normalizedRunId}':`, error);
        return false;
      }
    },

    async deleteTeamRun(teamRunId: string): Promise<boolean> {
      const normalizedTeamRunId = teamRunId.trim();
      if (!normalizedTeamRunId || normalizedTeamRunId.startsWith('temp-')) {
        return false;
      }

      try {
        const client = getApolloClient();
        const { data, errors } = await client.mutate<DeleteTeamRunHistoryMutationData>({
          mutation: DeleteTeamRunHistory,
          variables: { teamRunId: normalizedTeamRunId },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        const result = data?.deleteTeamRunHistory;
        if (!result?.success) {
          return false;
        }

        const nextTeamResume = { ...this.teamResumeConfigByTeamRunId };
        delete nextTeamResume[normalizedTeamRunId];
        this.teamResumeConfigByTeamRunId = nextTeamResume;
        this.teamRuns = removeTeamRunById(this.teamRuns, normalizedTeamRunId);

        const teamContextsStore = useAgentTeamContextsStore();
        teamContextsStore.removeTeamContext(normalizedTeamRunId);

        const selectionStore = useAgentSelectionStore();
        if (
          selectionStore.selectedType === 'team' &&
          selectionStore.selectedRunId === normalizedTeamRunId
        ) {
          selectionStore.clearSelection();
        }

        if (this.selectedTeamRunId === normalizedTeamRunId) {
          this.selectedTeamRunId = null;
          this.selectedTeamMemberRouteKey = null;
        }

        await this.refreshTreeQuietly();
        return true;
      } catch (error: any) {
        console.error(`Failed to delete team run '${normalizedTeamRunId}':`, error);
        return false;
      }
    },

    async refreshTreeQuietly(limitPerAgent = 6): Promise<void> {
      try {
        await this.fetchTree(limitPerAgent);
      } catch {
        // No-op for best-effort refreshes.
      }
    },

    getTreeNodes(): RunTreeWorkspaceNode[] {
      const workspaceStore = useWorkspaceStore();
      const agentContextsStore = useAgentContextsStore();
      const workspaceDescriptors = new Map<string, string>();
      const agentAvatarByDefinitionId = new Map<string, string>(
        Object.entries(this.agentAvatarByDefinitionId),
      );

      for (const context of agentContextsStore.runs.values()) {
        const definitionId = context.config.agentDefinitionId;
        const avatarUrl = context.config.agentAvatarUrl?.trim();
        if (definitionId && avatarUrl) {
          agentAvatarByDefinitionId.set(definitionId, avatarUrl);
        }
      }

      for (const group of this.workspaceGroups) {
        const normalizedRoot = normalizeRootPath(group.workspaceRootPath);
        if (!normalizedRoot) {
          continue;
        }
        workspaceDescriptors.set(
          normalizedRoot,
          group.workspaceName || displayWorkspaceName(normalizedRoot),
        );
      }

      for (const workspace of workspaceStore.allWorkspaces) {
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

      const persistedWorkspaces: RunHistoryWorkspaceGroup[] = this.workspaceGroups.map((workspace) => ({
        ...workspace,
        agents: workspace.agents.map((agent) => ({
          ...agent,
          agentAvatarUrl:
            agent.agentAvatarUrl ??
            agentAvatarByDefinitionId.get(agent.agentDefinitionId) ??
            null,
        })),
      }));

      const draftRuns: DraftRunSnapshot[] = [];
      for (const [runId, context] of agentContextsStore.runs.entries()) {
        if (!runId.startsWith(DRAFT_RUN_ID_PREFIX)) {
          continue;
        }

        const workspaceRootPath = resolveWorkspaceRootPath(
          workspaceStore,
          context.config.workspaceId,
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
        persistedWorkspaces,
        workspaceDescriptors: Array.from(workspaceDescriptors.entries()).map(
          ([workspaceRootPath, workspaceName]) => ({
            workspaceRootPath,
            workspaceName,
          }),
        ),
        draftRuns,
      });

      return mergeRunTreeWithLiveContexts(projectedTree, agentContextsStore.runs);
    },

    getTeamNodes(workspaceRootPath?: string): TeamTreeNode[] {
      void this.teamDraftProjectionRevision;

      const workspaceStore = useWorkspaceStore();
      const teamContextsStore = useAgentTeamContextsStore();
      const nodesByTeamRunId = new Map<string, TeamTreeNode>();

      for (const team of this.teamRuns) {
        const fallbackWorkspaceRootPath = team.members
          .map((member) => normalizeRootPath(member.workspaceRootPath))
          .find((value) => Boolean(value))
          || UNASSIGNED_TEAM_WORKSPACE_KEY;
        const normalizedWorkspaceRootPath =
          normalizeRootPath(team.workspaceRootPath) ||
          fallbackWorkspaceRootPath;
        const sortedMembers = team.members
          .map((member) => ({
            teamRunId: team.teamRunId,
            memberRouteKey: member.memberRouteKey,
            memberName: member.memberName,
            memberRunId: member.memberRunId,
            workspaceRootPath: member.workspaceRootPath ?? null,
            summary: team.summary,
            lastActivityAt: team.lastActivityAt,
            lastKnownStatus: team.lastKnownStatus,
            isActive: team.isActive,
            deleteLifecycle: team.deleteLifecycle,
          }))
          .sort((a, b) => a.memberName.localeCompare(b.memberName));
        const focusedMemberName = sortedMembers[0]?.memberRouteKey || '';

        nodesByTeamRunId.set(team.teamRunId, {
          teamRunId: team.teamRunId,
          teamDefinitionId: team.teamDefinitionId,
          teamDefinitionName: team.teamDefinitionName || 'Team',
          workspaceRootPath: normalizedWorkspaceRootPath,
          summary: team.summary,
          lastActivityAt: team.lastActivityAt,
          lastKnownStatus: team.lastKnownStatus,
          isActive: team.isActive,
          currentStatus: toHistoryTeamStatus(team),
          deleteLifecycle: team.deleteLifecycle,
          focusedMemberName,
          members: sortedMembers,
        });
      }

      for (const teamContext of teamContextsStore.allTeamRuns ?? []) {
        const workspaceRootPath = resolveTeamWorkspaceRootPathFromContext(workspaceStore, teamContext);
        const { isActive, lastKnownStatus } = toTeamRunStatus(teamContext.currentStatus);
        const summary = summarizeTeamDraft(teamContext);
        const lastActivityAt = resolveTeamLastActivityAt(teamContext);
        const members = Array.from(teamContext.members.entries())
          .map(([memberRouteKey, memberContext]) => ({
            teamRunId: teamContext.teamRunId,
            memberRouteKey,
            memberName: memberContext.config.agentDefinitionName || memberRouteKey,
            memberRunId: memberContext.state.runId,
            workspaceRootPath: resolveWorkspaceRootPath(workspaceStore, memberContext.config.workspaceId),
            summary,
            lastActivityAt:
              memberContext.state.conversation.updatedAt ||
              memberContext.state.conversation.createdAt ||
              lastActivityAt,
            lastKnownStatus,
            isActive,
            deleteLifecycle: 'READY' as const,
          }))
          .sort((a, b) => a.memberName.localeCompare(b.memberName));
        const existing = nodesByTeamRunId.get(teamContext.teamRunId);
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
          currentStatus: teamContext.currentStatus,
          deleteLifecycle,
          focusedMemberName: teamContext.focusedMemberName,
          members,
        });
      }

      const allNodes = Array.from(nodesByTeamRunId.values())
        .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
      if (!workspaceRootPath) {
        return allNodes;
      }
      const normalizedWorkspaceRootPath = normalizeRootPath(workspaceRootPath);
      return allNodes.filter((node) => node.workspaceRootPath === normalizedWorkspaceRootPath);
    },

    async openTeamMemberRun(teamRunId: string, memberRouteKey: string): Promise<void> {
      this.openingRun = true;
      this.error = null;
      try {
        const client = getApolloClient();
        const { data, errors } = await client.query<GetTeamRunResumeConfigQueryData>({
          query: GetTeamRunResumeConfig,
          variables: { teamRunId },
          fetchPolicy: 'network-only',
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        const resumeConfig = data?.getTeamRunResumeConfig;
        if (!resumeConfig) {
          throw new Error(`Team resume config payload missing for '${teamRunId}'.`);
        }
        const manifest = parseTeamRunManifest(resumeConfig.manifest);
        if (!manifest.teamRunId) {
          throw new Error(`Team manifest is invalid for '${teamRunId}'.`);
        }

        this.teamResumeConfigByTeamRunId[teamRunId] = {
          teamRunId: manifest.teamRunId,
          isActive: resumeConfig.isActive,
          manifest,
        };

        const teamContextsStore = useAgentTeamContextsStore();
        const selectionStore = useAgentSelectionStore();
        const projectionByMemberRouteKey = new Map<string, TeamMemberRunProjectionPayload | null>();
        await Promise.all(
          manifest.memberBindings.map(async (binding) => {
            const normalizedMemberRouteKey = toTeamMemberKey(binding).trim();
            if (!normalizedMemberRouteKey) {
              return;
            }

            try {
              const projectionResponse = await client.query<GetTeamMemberRunProjectionQueryData>({
                query: GetTeamMemberRunProjection,
                variables: {
                  teamRunId,
                  memberRouteKey: normalizedMemberRouteKey,
                },
                fetchPolicy: 'network-only',
              });

              if (projectionResponse.errors && projectionResponse.errors.length > 0) {
                throw new Error(
                  projectionResponse.errors.map((e: { message: string }) => e.message).join(', '),
                );
              }

              projectionByMemberRouteKey.set(
                normalizedMemberRouteKey,
                projectionResponse.data?.getTeamMemberRunProjection || null,
              );
            } catch (projectionError) {
              console.warn(
                `[runHistoryStore] Failed to fetch team-member projection for '${binding.memberRouteKey}'`,
                projectionError,
              );
              projectionByMemberRouteKey.set(normalizedMemberRouteKey, null);
            }
          }),
        );

        const members = new Map<string, AgentContext>();
        let firstWorkspaceId: string | null = null;
        for (const binding of manifest.memberBindings) {
          const normalizedMemberRouteKey = toTeamMemberKey(binding).trim();
          if (!normalizedMemberRouteKey) {
            continue;
          }
          let workspaceId: string | null = null;
          if (binding.workspaceRootPath) {
            workspaceId = await this.ensureWorkspaceByRootPath(binding.workspaceRootPath);
            if (workspaceId && !firstWorkspaceId) {
              firstWorkspaceId = workspaceId;
            }
          }
          const memberConfig: AgentRunConfig = {
            agentDefinitionId: binding.agentDefinitionId,
            agentDefinitionName: binding.memberName,
            llmModelIdentifier: binding.llmModelIdentifier,
            runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
            workspaceId,
            autoExecuteTools: binding.autoExecuteTools,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: binding.llmConfig ?? null,
            isLocked: resumeConfig.isActive,
          };
          const memberRunId = binding.memberRunId || normalizedMemberRouteKey;
          const projection = projectionByMemberRouteKey.get(toTeamMemberKey(binding)) || null;
          const conversation = projection
            ? buildConversationFromProjection(
              memberRunId,
              projection.conversation || [],
              {
                agentDefinitionId: binding.agentDefinitionId,
                agentName: binding.memberName,
                llmModelIdentifier: binding.llmModelIdentifier,
              },
            )
            : {
              id: `${teamRunId}::${normalizedMemberRouteKey}`,
              messages: [],
              createdAt: manifest.createdAt,
              updatedAt: manifest.updatedAt,
              agentDefinitionId: binding.agentDefinitionId,
              agentName: binding.memberName,
              llmModelIdentifier: binding.llmModelIdentifier,
            };

          conversation.id = `${teamRunId}::${normalizedMemberRouteKey}`;
          if (conversation.messages.length === 0) {
            conversation.createdAt = manifest.createdAt;
            conversation.updatedAt = projection?.lastActivityAt || manifest.updatedAt;
          } else if (projection?.lastActivityAt) {
            conversation.updatedAt = projection.lastActivityAt;
          }

          const state = new AgentRunState(memberRunId, conversation);
          state.currentStatus = resumeConfig.isActive ? AgentStatus.Uninitialized : AgentStatus.ShutdownComplete;
          members.set(
            normalizedMemberRouteKey,
            new AgentContext(memberConfig, state),
          );
        }

        const firstMemberKey = manifest.memberBindings
          .map((member) => toTeamMemberKey(member).trim())
          .find((memberKey) => memberKey.length > 0) || '';
        const focusKey = members.has(memberRouteKey) ? memberRouteKey : firstMemberKey;
        if (!focusKey) {
          throw new Error(`Team '${teamRunId}' has no members in manifest.`);
        }

        teamContextsStore.addTeamContext({
          teamRunId: manifest.teamRunId,
          config: {
            teamDefinitionId: manifest.teamDefinitionId,
            teamDefinitionName: manifest.teamDefinitionName,
            workspaceId: firstWorkspaceId,
            llmModelIdentifier:
              manifest.memberBindings.find((member) => toTeamMemberKey(member).trim() === focusKey)
                ?.llmModelIdentifier || '',
            autoExecuteTools:
              manifest.memberBindings.find((member) => toTeamMemberKey(member).trim() === focusKey)
                ?.autoExecuteTools ?? false,
            memberOverrides: Object.fromEntries(
              manifest.memberBindings.map((member) => [
                member.memberName,
                {
                  agentDefinitionId: member.agentDefinitionId,
                  llmModelIdentifier: member.llmModelIdentifier,
                  autoExecuteTools: member.autoExecuteTools,
                  llmConfig: member.llmConfig ?? null,
                },
              ]),
            ),
            isLocked: resumeConfig.isActive,
          },
          members,
          focusedMemberName: focusKey,
          currentStatus: resumeConfig.isActive ? AgentTeamStatus.Uninitialized : AgentTeamStatus.Idle,
          isSubscribed: false,
          taskPlan: null,
          taskStatuses: null,
        });

        selectionStore.selectRun(manifest.teamRunId, 'team');
        this.selectedTeamRunId = manifest.teamRunId;
        this.selectedTeamMemberRouteKey = focusKey;
        this.selectedRunId = null;
        useTeamRunConfigStore().clearConfig();
        useAgentRunConfigStore().clearConfig();

        if (resumeConfig.isActive) {
          useAgentTeamRunStore().connectToTeamStream(manifest.teamRunId);
        } else {
          const activeTeam = teamContextsStore.getTeamContextById(manifest.teamRunId);
          if (activeTeam?.unsubscribe) {
            activeTeam.unsubscribe();
            activeTeam.isSubscribed = false;
          }
        }
      } catch (error: any) {
        this.error = error?.message || `Failed to open team '${teamRunId}'.`;
        throw error;
      } finally {
        this.openingRun = false;
      }
    },

    async selectTreeRun(row: RunTreeRow | TeamMemberTreeRow): Promise<void> {
      if ('teamRunId' in row) {
        const teamContextsStore = useAgentTeamContextsStore();
        const selectionStore = useAgentSelectionStore();
        const localTeamContext = teamContextsStore.getTeamContextById(row.teamRunId);
        if (localTeamContext) {
          teamContextsStore.setFocusedMember?.(row.memberRouteKey);
          selectionStore.selectRun(row.teamRunId, 'team');
          this.selectedTeamRunId = row.teamRunId;
          this.selectedTeamMemberRouteKey = row.memberRouteKey;
          this.selectedRunId = null;
          useTeamRunConfigStore().clearConfig();
          useAgentRunConfigStore().clearConfig();
          return;
        }
        await this.openTeamMemberRun(row.teamRunId, row.memberRouteKey);
        return;
      }

      if (row.source === 'history') {
        await this.openRun(row.runId);
        return;
      }

      const contextsStore = useAgentContextsStore();
      const context = contextsStore.getRun(row.runId);
      if (!context) {
        return;
      }

      const selectionStore = useAgentSelectionStore();
      selectionStore.selectRun(row.runId, 'agent');
      this.selectedRunId = row.runId;
      this.selectedTeamRunId = null;
      this.selectedTeamMemberRouteKey = null;
      useTeamRunConfigStore().clearConfig();
      useAgentRunConfigStore().clearConfig();
    },

    formatRelativeTime(isoTime: string): string {
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
    },

    async ensureWorkspaceByRootPath(rootPath: string): Promise<string | null> {
      const workspaceStore = useWorkspaceStore();
      if (!rootPath.trim()) {
        return null;
      }

      if (!workspaceStore.workspacesFetched) {
        try {
          await workspaceStore.fetchAllWorkspaces();
        } catch {
          // Fallback to direct creation below.
        }
      }

      try {
        const normalizedRootPath = normalizeRootPath(rootPath) || rootPath.trim();
        return await workspaceStore.createWorkspace({ root_path: normalizedRootPath });
      } catch {
        return null;
      }
    },

    findAgentNameByRunId(runId: string): string | null {
      for (const workspace of this.workspaceGroups) {
        for (const agent of workspace.agents) {
          if (agent.runs.some(run => run.runId === runId)) {
            return agent.agentName;
          }
        }
      }
      return null;
    },
  },
});
