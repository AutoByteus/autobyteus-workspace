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
  GetRunProjection,
  GetTeamMemberRunProjection,
  GetTeamRunResumeConfig,
  ListRunHistory,
  ListTeamRunHistory,
} from '~/graphql/queries/runHistoryQueries';
import {
  DeleteRunHistory,
  DeleteTeamRunHistory,
} from '~/graphql/mutations/runHistoryMutations';
import type { AgentRunConfig, SkillAccessMode } from '~/types/agent/AgentRunConfig';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { Conversation } from '~/types/conversation';
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
  type RunProjectionPayload,
} from '~/services/runOpen/runOpenCoordinator';

export type RunKnownStatus = 'ACTIVE' | 'IDLE' | 'ERROR';

export interface RunHistoryItem {
  agentId: string;
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
}

export interface RunManifestConfigPayload {
  agentDefinitionId: string;
  workspaceRootPath: string;
  llmModelIdentifier: string;
  llmConfig?: Record<string, unknown> | null;
  autoExecuteTools: boolean;
  skillAccessMode?: SkillAccessMode | null;
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
  memberAgentId: string;
  workspaceRootPath?: string | null;
  hostNodeId?: string | null;
}

export interface TeamRunHistoryItem {
  teamId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
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
  memberAgentId: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string | null;
  hostNodeId: string | null;
}

interface TeamRunManifestPayload {
  teamId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  coordinatorMemberRouteKey: string;
  runVersion: number;
  createdAt: string;
  updatedAt: string;
  memberBindings: TeamRunManifestMemberBinding[];
}

interface TeamRunResumeConfigPayload {
  teamId: string;
  isActive: boolean;
  manifest: TeamRunManifestPayload;
}

export interface TeamMemberTreeRow {
  teamId: string;
  memberRouteKey: string;
  memberName: string;
  memberAgentId: string;
  workspaceRootPath: string | null;
  hostNodeId: string | null;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: TeamRunKnownStatus;
  isActive: boolean;
  deleteLifecycle: TeamRunDeleteLifecycle;
}

export interface TeamTreeNode {
  teamId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: TeamRunKnownStatus;
  isActive: boolean;
  deleteLifecycle: TeamRunDeleteLifecycle;
  members: TeamMemberTreeRow[];
}

interface ListRunHistoryQueryData {
  listRunHistory: RunHistoryWorkspaceGroup[];
}

interface ListTeamRunHistoryQueryData {
  listTeamRunHistory: TeamRunHistoryItem[];
}

interface GetRunProjectionQueryData {
  getRunProjection: RunProjectionPayload;
}

interface GetTeamMemberRunProjectionQueryData {
  getTeamMemberRunProjection: RunProjectionPayload;
}

interface GetTeamRunResumeConfigQueryData {
  getTeamRunResumeConfig: TeamRunResumeConfigPayload;
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
};

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
  agentId: string,
): RunHistoryWorkspaceGroup[] => {
  return groups
    .map((workspace) => ({
      ...workspace,
      agents: workspace.agents
        .map((agent) => ({
          ...agent,
          runs: agent.runs.filter((run) => run.agentId !== agentId),
        }))
        .filter((agent) => agent.runs.length > 0),
    }))
    .filter((workspace) => workspace.agents.length > 0);
};

const removeTeamRunById = (
  rows: TeamRunHistoryItem[],
  teamId: string,
): TeamRunHistoryItem[] => rows.filter((row) => row.teamId !== teamId);

const normalizeRunHistoryGroups = (groups: unknown[]): RunHistoryWorkspaceGroup[] => {
  return groups.map((workspace) => {
    const workspaceRecord = asRecord(workspace);
    const agents = Array.isArray(workspaceRecord.agents) ? workspaceRecord.agents : [];
    return {
      workspaceRootPath: String(workspaceRecord.workspaceRootPath || ''),
      workspaceName: String(workspaceRecord.workspaceName || ''),
      agents: agents.map((agent) => {
        const agentRecord = asRecord(agent);
        const runs = Array.isArray(agentRecord.runs) ? agentRecord.runs : [];
        return {
          agentDefinitionId: String(agentRecord.agentDefinitionId || ''),
          agentName: String(agentRecord.agentName || ''),
          runs: runs.map((run) => {
            const runRecord = asRecord(run);
            return {
              agentId: String(runRecord.runId || runRecord.agentId || ''),
              summary: String(runRecord.summary || ''),
              lastActivityAt: String(runRecord.lastActivityAt || ''),
              lastKnownStatus: String(runRecord.lastKnownStatus || 'IDLE') as RunKnownStatus,
              isActive: Boolean(runRecord.isActive),
            };
          }),
        };
      }),
    };
  });
};

const normalizeTeamRunHistoryRows = (rows: unknown[]): TeamRunHistoryItem[] => {
  return rows.map((row) => {
    const rowRecord = asRecord(row);
    const members = Array.isArray(rowRecord.members) ? rowRecord.members : [];
    return {
      teamId: String(rowRecord.teamRunId || rowRecord.teamId || ''),
      teamDefinitionId: String(rowRecord.teamDefinitionId || ''),
      teamDefinitionName: String(rowRecord.teamDefinitionName || ''),
      summary: String(rowRecord.summary || ''),
      lastActivityAt: String(rowRecord.lastActivityAt || ''),
      lastKnownStatus: String(rowRecord.lastKnownStatus || 'IDLE') as TeamRunKnownStatus,
      deleteLifecycle: String(rowRecord.deleteLifecycle || 'READY') as TeamRunDeleteLifecycle,
      isActive: Boolean(rowRecord.isActive),
      members: members.map((member) => {
        const memberRecord = asRecord(member);
        return {
          memberRouteKey: String(memberRecord.memberRouteKey || ''),
          memberName: String(memberRecord.memberName || ''),
          memberAgentId: String(memberRecord.memberAgentId || memberRecord.memberRunId || ''),
          workspaceRootPath:
            typeof memberRecord.workspaceRootPath === 'string' ? memberRecord.workspaceRootPath : null,
          hostNodeId: typeof memberRecord.hostNodeId === 'string' ? memberRecord.hostNodeId : null,
        };
      }),
    };
  });
};

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
          memberAgentId: String(binding.memberAgentId || ''),
          agentDefinitionId: String(binding.agentDefinitionId || ''),
          llmModelIdentifier: String(binding.llmModelIdentifier || ''),
          autoExecuteTools: Boolean(binding.autoExecuteTools),
          llmConfig:
            binding.llmConfig && typeof binding.llmConfig === 'object' && !Array.isArray(binding.llmConfig)
              ? (binding.llmConfig as Record<string, unknown>)
              : null,
          workspaceRootPath:
            typeof binding.workspaceRootPath === 'string' ? binding.workspaceRootPath : null,
          hostNodeId: typeof binding.hostNodeId === 'string' ? binding.hostNodeId : null,
        };
      })
    : [];
  return {
    teamId: String(payload.teamRunId || payload.teamId || ''),
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

export const useRunTreeStore = defineStore('runHistory', {
  state: () => ({
    workspaceGroups: [] as RunHistoryWorkspaceGroup[],
    teamRuns: [] as TeamRunHistoryItem[],
    agentAvatarByDefinitionId: {} as Record<string, string>,
    resumeConfigByAgentId: {} as Record<string, RunResumeConfigPayload>,
    teamResumeConfigByTeamId: {} as Record<string, TeamRunResumeConfigPayload>,
    selectedAgentId: null as string | null,
    selectedTeamId: null as string | null,
    selectedTeamMemberRouteKey: null as string | null,
    teamDraftProjectionRevision: 0,
    loading: false,
    openingRun: false,
    error: null as string | null,
  }),

  getters: {
    getResumeConfig: (state) => (agentId: string): RunResumeConfigPayload | null => {
      return state.resumeConfigByAgentId[agentId] || null;
    },

    getEditableFields: (state) => (agentId: string): RunEditableFieldFlags | null => {
      return state.resumeConfigByAgentId[agentId]?.editableFields || null;
    },

    isRunActive: (state) => (agentId: string): boolean => {
      return Boolean(state.resumeConfigByAgentId[agentId]?.isActive);
    },

    isWorkspaceLockedForRun: (state) => (agentId: string): boolean => {
      const editable = state.resumeConfigByAgentId[agentId]?.editableFields;
      if (!editable) {
        return false;
      }
      return !editable.workspaceRootPath;
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

        this.workspaceGroups = normalizeRunHistoryGroups(agentHistoryResult.data?.listRunHistory || []);
        this.teamRuns = normalizeTeamRunHistoryRows(teamHistoryResult.data?.listTeamRunHistory || []);
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

    async openRun(agentId: string): Promise<void> {
      this.openingRun = true;
      this.error = null;

      try {
        const result = await openRunWithCoordinator({
          runId: agentId,
          fallbackAgentName: this.findAgentNameByAgentId(agentId),
          ensureWorkspaceByRootPath: (rootPath: string) => this.ensureWorkspaceByRootPath(rootPath),
        });

        this.resumeConfigByAgentId[agentId] = result.resumeConfig;
        this.selectedAgentId = result.runId;
        this.selectedTeamId = null;
        this.selectedTeamMemberRouteKey = null;
      } catch (error: any) {
        this.error = error?.message || `Failed to open run '${agentId}'.`;
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
          if (llmProviderConfigStore.models.length === 0) {
            await llmProviderConfigStore.fetchProvidersWithModels();
          }
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
      this.selectedAgentId = null;
      this.selectedTeamId = null;
      this.selectedTeamMemberRouteKey = null;
    },

    async createWorkspace(rootPath: string): Promise<string> {
      const workspaceStore = useWorkspaceStore();
      const workspaceId = await workspaceStore.createWorkspace({ root_path: rootPath });
      const workspace = workspaceStore.workspaces[workspaceId];
      return workspace?.absolutePath || rootPath;
    },

    markRunAsActive(agentId: string): void {
      const resumeConfig = this.resumeConfigByAgentId[agentId];
      if (resumeConfig) {
        this.resumeConfigByAgentId[agentId] = {
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
            run.agentId === agentId
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

    markRunAsInactive(agentId: string): void {
      const resumeConfig = this.resumeConfigByAgentId[agentId];
      if (resumeConfig) {
        this.resumeConfigByAgentId[agentId] = {
          ...resumeConfig,
          isActive: false,
          editableFields: {
            llmModelIdentifier: true,
            llmConfig: true,
            autoExecuteTools: true,
            skillAccessMode: true,
            workspaceRootPath: false,
          },
        };
      }

      const now = new Date().toISOString();
      this.workspaceGroups = this.workspaceGroups.map((workspace) => ({
        ...workspace,
        agents: workspace.agents.map((agent) => ({
          ...agent,
          runs: agent.runs.map((run) =>
            run.agentId === agentId
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

    markTeamAsActive(teamId: string): void {
      const now = new Date().toISOString();
      this.teamRuns = this.teamRuns.map((team) => {
        if (team.teamId !== teamId) {
          return team;
        }
        return {
          ...team,
          isActive: true,
          lastKnownStatus: 'ACTIVE',
          lastActivityAt: now,
        };
      });

      const existing = this.teamResumeConfigByTeamId[teamId];
      if (existing) {
        this.teamResumeConfigByTeamId[teamId] = {
          ...existing,
          isActive: true,
        };
      }
    },

    markTeamAsInactive(teamId: string): void {
      const now = new Date().toISOString();
      this.teamRuns = this.teamRuns.map((team) => {
        if (team.teamId !== teamId) {
          return team;
        }
        return {
          ...team,
          isActive: false,
          lastKnownStatus: team.lastKnownStatus === 'ERROR' ? 'ERROR' : 'IDLE',
          lastActivityAt: now,
        };
      });

      const existing = this.teamResumeConfigByTeamId[teamId];
      if (existing) {
        this.teamResumeConfigByTeamId[teamId] = {
          ...existing,
          isActive: false,
        };
      }
    },

    markTeamDraftProjectionDirty(): void {
      this.teamDraftProjectionRevision += 1;
    },

    async deleteRun(agentId: string): Promise<boolean> {
      const normalizedAgentId = agentId.trim();
      if (!normalizedAgentId || normalizedAgentId.startsWith(DRAFT_RUN_ID_PREFIX)) {
        return false;
      }

      try {
        const client = getApolloClient();
        const { data, errors } = await client.mutate<DeleteRunHistoryMutationData>({
          mutation: DeleteRunHistory,
          variables: { runId: normalizedAgentId },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        const result = data?.deleteRunHistory;
        if (!result?.success) {
          return false;
        }

        const nextResumeConfigs = { ...this.resumeConfigByAgentId };
        delete nextResumeConfigs[normalizedAgentId];
        this.resumeConfigByAgentId = nextResumeConfigs;
        this.workspaceGroups = removeRunFromWorkspaceGroups(this.workspaceGroups, normalizedAgentId);

        const agentContextsStore = useAgentContextsStore();
        const hadContext = Boolean(agentContextsStore.getRun(normalizedAgentId));
        if (hadContext) {
          agentContextsStore.removeRun(normalizedAgentId);
        }

        const selectionStore = useAgentSelectionStore();
        const selectedBySelectionStore =
          selectionStore.selectedType === 'agent' &&
          selectionStore.selectedRunId === normalizedAgentId;
        if (selectedBySelectionStore && !hadContext) {
          selectionStore.clearSelection();
        }

        if (this.selectedAgentId === normalizedAgentId) {
          this.selectedAgentId = null;
        }

        await this.refreshTreeQuietly();
        return true;
      } catch (error: any) {
        console.error(`Failed to delete run '${normalizedAgentId}':`, error);
        return false;
      }
    },

    async deleteTeamRun(teamId: string): Promise<boolean> {
      const normalizedTeamId = teamId.trim();
      if (!normalizedTeamId || normalizedTeamId.startsWith('temp-')) {
        return false;
      }

      try {
        const client = getApolloClient();
        const { data, errors } = await client.mutate<DeleteTeamRunHistoryMutationData>({
          mutation: DeleteTeamRunHistory,
          variables: { teamRunId: normalizedTeamId },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        const result = data?.deleteTeamRunHistory;
        if (!result?.success) {
          return false;
        }

        const nextTeamResume = { ...this.teamResumeConfigByTeamId };
        delete nextTeamResume[normalizedTeamId];
        this.teamResumeConfigByTeamId = nextTeamResume;
        this.teamRuns = removeTeamRunById(this.teamRuns, normalizedTeamId);

        const teamContextsStore = useAgentTeamContextsStore();
        teamContextsStore.removeTeamContext(normalizedTeamId);
        const selectionStore = useAgentSelectionStore();
        if (
          selectionStore.selectedType === 'team' &&
          selectionStore.selectedRunId === normalizedTeamId
        ) {
          selectionStore.clearSelection();
        }
        if (this.selectedTeamId === normalizedTeamId) {
          this.selectedTeamId = null;
          this.selectedTeamMemberRouteKey = null;
        }

        await this.refreshTreeQuietly();
        return true;
      } catch (error: any) {
        console.error(`Failed to delete team run '${normalizedTeamId}':`, error);
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
      for (const [agentId, context] of agentContextsStore.runs.entries()) {
        if (!agentId.startsWith(DRAFT_RUN_ID_PREFIX)) {
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
          agentId,
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

    getTeamNodes(): TeamTreeNode[] {
      // Touch revision so computed consumers rerender when draft team contexts change.
      void this.teamDraftProjectionRevision;

      const workspaceStore = useWorkspaceStore();
      const teamContextsStore = useAgentTeamContextsStore();

      const nodesByTeamId = new Map<string, TeamTreeNode>(
        this.teamRuns.map((team) => [
          team.teamId,
          {
            teamId: team.teamId,
            teamDefinitionId: team.teamDefinitionId,
            teamDefinitionName: team.teamDefinitionName,
            summary: team.summary,
            lastActivityAt: team.lastActivityAt,
            lastKnownStatus: team.lastKnownStatus,
            isActive: team.isActive,
            deleteLifecycle: team.deleteLifecycle,
            members: team.members
              .map((member) => ({
                teamId: team.teamId,
                memberRouteKey: member.memberRouteKey,
                memberName: member.memberName,
                memberAgentId: member.memberAgentId,
                workspaceRootPath: member.workspaceRootPath ?? null,
                hostNodeId: member.hostNodeId ?? null,
                summary: team.summary,
                lastActivityAt: team.lastActivityAt,
                lastKnownStatus: team.lastKnownStatus,
                isActive: team.isActive,
                deleteLifecycle: team.deleteLifecycle,
              }))
              .sort((a, b) => a.memberName.localeCompare(b.memberName)),
          },
        ]),
      );

      for (const teamContext of teamContextsStore.allTeamRuns ?? []) {
        if (nodesByTeamId.has(teamContext.teamId)) {
          continue;
        }

        const { isActive, lastKnownStatus } = toTeamRunStatus(teamContext.currentStatus);
        const summary = summarizeTeamDraft(teamContext);
        const lastActivityAt = resolveTeamLastActivityAt(teamContext);
        const members = Array.from(teamContext.members.entries())
          .map(([memberRouteKey, memberContext]) => ({
            teamId: teamContext.teamId,
            memberRouteKey,
            memberName: memberContext.config.agentDefinitionName || memberRouteKey,
            memberAgentId: memberContext.state.agentId,
            workspaceRootPath: resolveWorkspaceRootPath(workspaceStore, memberContext.config.workspaceId),
            hostNodeId: null,
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

        nodesByTeamId.set(teamContext.teamId, {
          teamId: teamContext.teamId,
          teamDefinitionId: teamContext.config.teamDefinitionId,
          teamDefinitionName: teamContext.config.teamDefinitionName || 'Team',
          summary,
          lastActivityAt,
          lastKnownStatus,
          isActive,
          deleteLifecycle: 'READY',
          members,
        });
      }

      return Array.from(nodesByTeamId.values()).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    },

    async openTeamMemberRun(teamId: string, memberRouteKey: string): Promise<void> {
      this.openingRun = true;
      this.error = null;
      try {
        const client = getApolloClient();
        const { data, errors } = await client.query<GetTeamRunResumeConfigQueryData>({
          query: GetTeamRunResumeConfig,
          variables: { teamRunId: teamId },
          fetchPolicy: 'network-only',
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        const resumeConfig = data?.getTeamRunResumeConfig;
        if (!resumeConfig) {
          throw new Error(`Team resume config payload missing for '${teamId}'.`);
        }
        const manifest = parseTeamRunManifest(resumeConfig.manifest);
        if (!manifest.teamId) {
          throw new Error(`Team manifest is invalid for '${teamId}'.`);
        }

        this.teamResumeConfigByTeamId[teamId] = {
          teamId: manifest.teamId,
          isActive: resumeConfig.isActive,
          manifest,
        };

        const teamContextStore = useAgentTeamContextsStore();
        const selectionStore = useAgentSelectionStore();
        const projectionByMemberRouteKey = new Map<string, RunProjectionPayload | null>();
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
                  teamRunId: teamId,
                  memberRouteKey: normalizedMemberRouteKey,
                  memberAgentId: binding.memberAgentId || null,
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
                projectionResponse.data?.getTeamMemberRunProjection
                  ? {
                      ...projectionResponse.data.getTeamMemberRunProjection,
                      agentId: String(
                        (projectionResponse.data.getTeamMemberRunProjection as Record<string, unknown>).runId ||
                          (projectionResponse.data.getTeamMemberRunProjection as Record<string, unknown>).agentId ||
                          '',
                      ),
                    }
                  : null,
              );
            } catch (projectionError) {
              console.warn(
                `[runTreeStore] Failed to fetch team-member projection for '${binding.memberRouteKey}'`,
                projectionError,
              );
              projectionByMemberRouteKey.set(normalizedMemberRouteKey, null);
            }
          }),
        );

        const members = new Map<string, AgentContext>();
        let firstWorkspaceId: string | null = null;
        for (const binding of manifest.memberBindings) {
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
            workspaceId,
            autoExecuteTools: binding.autoExecuteTools,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: binding.llmConfig ?? null,
            isLocked: resumeConfig.isActive,
          };
          const memberAgentId = binding.memberAgentId || binding.memberRouteKey;
          const projection =
            projectionByMemberRouteKey.get(toTeamMemberKey(binding)) || null;
          const conversation = projection
            ? buildConversationFromProjection(
              memberAgentId,
              projection.conversation || [],
              {
                agentDefinitionId: binding.agentDefinitionId,
                agentName: binding.memberName,
                llmModelIdentifier: binding.llmModelIdentifier,
              },
            )
            : {
              id: `${teamId}::${binding.memberRouteKey}`,
              messages: [],
              createdAt: manifest.createdAt,
              updatedAt: manifest.updatedAt,
              agentDefinitionId: binding.agentDefinitionId,
              agentName: binding.memberName,
              llmModelIdentifier: binding.llmModelIdentifier,
            };

          conversation.id = `${teamId}::${binding.memberRouteKey}`;
          if (conversation.messages.length === 0) {
            conversation.createdAt = manifest.createdAt;
            conversation.updatedAt = projection?.lastActivityAt || manifest.updatedAt;
          } else if (projection?.lastActivityAt) {
            conversation.updatedAt = projection.lastActivityAt;
          }

          const state = new AgentRunState(memberAgentId, conversation);
          state.currentStatus = resumeConfig.isActive ? AgentStatus.Uninitialized : AgentStatus.ShutdownComplete;
          members.set(
            binding.memberRouteKey,
            new AgentContext(memberConfig, state),
          );
        }

        if (!members.has(memberRouteKey)) {
          const fallbackMember = manifest.memberBindings.find((member) => toTeamMemberKey(member) === memberRouteKey);
          if (fallbackMember) {
            const fallbackMemberAgentId = fallbackMember.memberAgentId || memberRouteKey;
            const fallbackProjection =
              projectionByMemberRouteKey.get(toTeamMemberKey(fallbackMember)) || null;
            const fallbackConversation = fallbackProjection
              ? buildConversationFromProjection(
                fallbackMemberAgentId,
                fallbackProjection.conversation || [],
                {
                  agentDefinitionId: fallbackMember.agentDefinitionId,
                  agentName: fallbackMember.memberName,
                  llmModelIdentifier: fallbackMember.llmModelIdentifier,
                },
              )
              : {
                id: `${teamId}::${memberRouteKey}`,
                messages: [],
                createdAt: manifest.createdAt,
                updatedAt: manifest.updatedAt,
                agentDefinitionId: fallbackMember.agentDefinitionId,
                agentName: fallbackMember.memberName,
                llmModelIdentifier: fallbackMember.llmModelIdentifier,
              };
            fallbackConversation.id = `${teamId}::${memberRouteKey}`;
            if (fallbackConversation.messages.length === 0) {
              fallbackConversation.createdAt = manifest.createdAt;
              fallbackConversation.updatedAt = fallbackProjection?.lastActivityAt || manifest.updatedAt;
            } else if (fallbackProjection?.lastActivityAt) {
              fallbackConversation.updatedAt = fallbackProjection.lastActivityAt;
            }

            members.set(
              memberRouteKey,
              new AgentContext(
                {
                  agentDefinitionId: fallbackMember.agentDefinitionId,
                  agentDefinitionName: fallbackMember.memberName,
                  llmModelIdentifier: fallbackMember.llmModelIdentifier,
                  workspaceId: firstWorkspaceId,
                  autoExecuteTools: fallbackMember.autoExecuteTools,
                  skillAccessMode: 'PRELOADED_ONLY',
                  llmConfig: fallbackMember.llmConfig ?? null,
                  isLocked: resumeConfig.isActive,
                },
                new AgentRunState(fallbackMemberAgentId, fallbackConversation),
              ),
            );
          }
        }

        const firstMemberKey = manifest.memberBindings[0]?.memberRouteKey || '';
        const focusKey = members.has(memberRouteKey) ? memberRouteKey : firstMemberKey;
        if (!focusKey) {
          throw new Error(`Team '${teamId}' has no members in manifest.`);
        }

        teamContextStore.addTeamContext({
          teamId: manifest.teamId,
          config: {
            teamDefinitionId: manifest.teamDefinitionId,
            teamDefinitionName: manifest.teamDefinitionName,
            workspaceId: firstWorkspaceId,
            llmModelIdentifier:
              manifest.memberBindings.find((member) => member.memberRouteKey === focusKey)
                ?.llmModelIdentifier || '',
            autoExecuteTools:
              manifest.memberBindings.find((member) => member.memberRouteKey === focusKey)
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
        } as any);

        selectionStore.selectRun(manifest.teamId, 'team');
        this.selectedTeamId = manifest.teamId;
        this.selectedTeamMemberRouteKey = focusKey;
        this.selectedAgentId = null;
        useTeamRunConfigStore().clearConfig();
        useAgentRunConfigStore().clearConfig();

        if (resumeConfig.isActive) {
          useAgentTeamRunStore().connectToTeamStream(manifest.teamId);
        } else {
          const activeTeam = teamContextStore.getTeamContextById(manifest.teamId);
          if (activeTeam?.unsubscribe) {
            activeTeam.unsubscribe();
            activeTeam.isSubscribed = false;
          }
        }

      } catch (error: any) {
        this.error = error?.message || `Failed to open team '${teamId}'.`;
        throw error;
      } finally {
        this.openingRun = false;
      }
    },

    async selectTreeRun(row: RunTreeRow | TeamMemberTreeRow): Promise<void> {
      if ('teamId' in row) {
        const teamContextStore = useAgentTeamContextsStore();
        const selectionStore = useAgentSelectionStore();
        const localTeamContext = teamContextStore.getTeamContextById(row.teamId);
        if (localTeamContext) {
          teamContextStore.setFocusedMember?.(row.memberRouteKey);
          selectionStore.selectRun(row.teamId, 'team');
          this.selectedTeamId = row.teamId;
          this.selectedTeamMemberRouteKey = row.memberRouteKey;
          this.selectedAgentId = null;
          useTeamRunConfigStore().clearConfig();
          useAgentRunConfigStore().clearConfig();
          return;
        }
        await this.openTeamMemberRun(row.teamId, row.memberRouteKey);
        return;
      }

      if (row.source === 'history') {
        await this.openRun(row.agentId);
        return;
      }

      const contextsStore = useAgentContextsStore();
      const context = contextsStore.getRun(row.agentId);
      if (!context) {
        return;
      }

      const selectionStore = useAgentSelectionStore();
      selectionStore.selectRun(row.agentId, 'agent');
      this.selectedAgentId = row.agentId;
      this.selectedTeamId = null;
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

    findAgentNameByAgentId(agentId: string): string | null {
      for (const workspace of this.workspaceGroups) {
        for (const agent of workspace.agents) {
          if (agent.runs.some(run => run.agentId === agentId)) {
            return agent.agentName;
          }
        }
      }
      return null;
    },
  },
});
