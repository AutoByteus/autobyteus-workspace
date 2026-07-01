import { defineStore } from 'pinia';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { buildEditableAgentRunSeed } from '~/composables/useDefinitionLaunchDefaults';
import type {
  RunEditableFieldFlags,
  RunHistoryWorkspaceGroup,
  RunResumeConfigPayload,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import {
  buildRunHistoryTeamNodes,
  buildRunHistoryTreeNodes,
  findAgentNameByRunId as findAgentNameFromHistory,
  formatRunHistoryRelativeTime,
  normalizeRootPath,
} from '~/stores/runHistoryReadModel';
import {
  buildWorkspaceHistorySessionRows,
  type WorkspaceHistorySessionRow,
} from '~/stores/runHistorySessionProjection';
import { openTeamMemberRunFromHistory, selectTreeRunFromHistory } from '~/stores/runHistorySelectionActions';
import {
  type RunTreeRow,
  type RunTreeWorkspaceNode,
} from '~/utils/runTreeProjection';
import {
  pickPreferredRunTemplate,
  resolveRunnableModelIdentifier,
} from '~/utils/runLaunchPolicy';
import {
  ensureRunHistoryWorkspaceByRootPath,
  fetchRunHistoryTree,
  openHistoricalRun,
  resolveRunHistoryWorkspaceMetadataByRootPath,
  type RunHistorySelectionMode,
} from '~/stores/runHistoryLoadActions';
import {
  archiveRunInHistoryStore,
  archiveTeamRunInHistoryStore,
  deleteRunFromHistoryStore,
  deleteTeamRunFromHistoryStore,
} from '~/stores/runHistoryMutationActions';
import { fetchWorkspaceHistoryForStore, pruneWorkspaceHistoryForStore } from '~/stores/runHistoryWorkspaceHistoryActions';

const FALSE_EDITABLE_FIELDS: RunEditableFieldFlags = {
  llmModelIdentifier: false,
  llmConfig: false,
  autoExecuteTools: false,
  skillAccessMode: false,
  workspaceRootPath: false,
  runtimeKind: false,
};

export const useRunHistoryStore = defineStore('runHistory', {
  state: () => ({
    workspaceGroups: [] as RunHistoryWorkspaceGroup[],
    workspaceHistoryLoadingById: {} as Record<string, boolean>,
    workspaceHistoryErrorById: {} as Record<string, string | null>,
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
    async fetchTree(limitPerAgent = 6, options: { quiet?: boolean } = {}): Promise<void> {
      await fetchRunHistoryTree(this, limitPerAgent, options);
    },

    async openRun(runId: string, options: { selectionMode?: RunHistorySelectionMode } = {}): Promise<void> {
      await openHistoricalRun(this, runId, options);
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
      const workspaceMetadata = await this.resolveWorkspaceMetadataByRootPath(options.workspaceRootPath);
      if (!workspaceMetadata) {
        throw new Error(`Workspace '${options.workspaceRootPath}' reference could not be resolved.`);
      }

      const agentRunConfigStore = useAgentRunConfigStore();
      const llmProviderConfigStore = useLLMProviderConfigStore();
      const teamRunConfigStore = useTeamRunConfigStore();
      const selectionStore = useAgentSelectionStore();
      const agentContextsStore = useAgentContextsStore();

      const selectedTemplate = selectionStore.selectedType === 'agent' && selectionStore.selectedRunId
        ? agentContextsStore.runs.get(selectionStore.selectedRunId) ?? null : null;
      const selectedSameDefinitionTemplate = selectedTemplate?.config.agentDefinitionId === options.agentDefinitionId
        ? selectedTemplate
        : null;
      const templateCandidates = Array.from(agentContextsStore.runs.values()).filter(
        (context) => context.config.agentDefinitionId === options.agentDefinitionId,
      );
      const preferredTemplate = selectedSameDefinitionTemplate ?? pickPreferredRunTemplate(templateCandidates, workspaceId);

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
        const seed = buildEditableAgentRunSeed(preferredTemplate.config);
        const preserveSeedLlmConfig =
          (seed.llmModelIdentifier || '').trim() === (resolvedModelIdentifier || '').trim();
        agentRunConfigStore.setAgentConfig({
          ...seed,
          agentDefinitionId: definition.id,
          agentDefinitionName: definition.name,
          agentAvatarUrl: definition.avatarUrl ?? seed.agentAvatarUrl ?? null,
          workspaceId,
          workspaceMetadata,
          llmModelIdentifier: resolvedModelIdentifier,
          llmConfig: preserveSeedLlmConfig ? (seed.llmConfig ?? null) : null,
          isLocked: false,
        });
      } else {
        agentRunConfigStore.setTemplate(definition);
        agentRunConfigStore.updateAgentConfig({
          workspaceId,
          workspaceMetadata,
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

      this.workspaceGroups = this.workspaceGroups.map((workspace) => ({
        ...workspace,
        agentDefinitions: workspace.agentDefinitions.map((agent) => ({
          ...agent,
          runs: agent.runs.map((run) =>
            run.runId === runId
              ? {
                  ...run,
                  isActive: true,
                  status: AgentStatus.Running,
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

      this.workspaceGroups = this.workspaceGroups.map((workspace) => ({
        ...workspace,
        agentDefinitions: workspace.agentDefinitions.map((agent) => ({
          ...agent,
          runs: agent.runs.map((run) =>
            run.runId === runId
              ? {
                  ...run,
                  isActive: false,
                  status: AgentStatus.Offline,
                }
              : run,
          ),
        })),
      }));
    },

    reconcileActiveRunIds(activeRunIds: Iterable<string>): void {
      const activeSet = new Set(
        Array.from(activeRunIds).map((runId) => runId.trim()).filter(Boolean),
      );

      const nextResumeConfigs: Record<string, RunResumeConfigPayload> = {};
      for (const [runId, resumeConfig] of Object.entries(this.resumeConfigByRunId)) {
        nextResumeConfigs[runId] = {
          ...resumeConfig,
          isActive: activeSet.has(runId),
        };
      }
      this.resumeConfigByRunId = nextResumeConfigs;

      this.workspaceGroups = this.workspaceGroups.map((workspace) => ({
        ...workspace,
        agentDefinitions: workspace.agentDefinitions.map((agent) => ({
          ...agent,
          runs: agent.runs.map((run) => {
            const isActive = activeSet.has(run.runId);
            return {
              ...run,
              isActive,
              status: isActive ? AgentStatus.Running : AgentStatus.Offline,
            };
          }),
        })),
      }));
    },

    markTeamAsActive(teamRunId: string): void {
      this.workspaceGroups = this.workspaceGroups.map((workspace) => ({
        ...workspace,
        teamDefinitions: workspace.teamDefinitions.map((teamDefinition) => ({
          ...teamDefinition,
          runs: teamDefinition.runs.map((team) =>
            team.teamRunId !== teamRunId
              ? team
              : {
                  ...team,
                  isActive: true,
                  status: AgentTeamStatus.Running,
                }),
        })),
      }));

      const existing = this.teamResumeConfigByTeamRunId[teamRunId];
      if (existing) {
        this.teamResumeConfigByTeamRunId[teamRunId] = {
          ...existing,
          isActive: true,
        };
      }
    },

    markTeamAsInactive(teamRunId: string): void {
      this.workspaceGroups = this.workspaceGroups.map((workspace) => ({
        ...workspace,
        teamDefinitions: workspace.teamDefinitions.map((teamDefinition) => ({
          ...teamDefinition,
          runs: teamDefinition.runs.map((team) =>
            team.teamRunId !== teamRunId
              ? team
              : {
                  ...team,
                  isActive: false,
                  status: team.status === AgentTeamStatus.Error ? AgentTeamStatus.Error : AgentTeamStatus.Offline,
                  members: team.members.map((member) => ({
                    ...member,
                    status: AgentStatus.Offline,
                  })),
                }),
        })),
      }));

      const existing = this.teamResumeConfigByTeamRunId[teamRunId];
      if (existing) {
        this.teamResumeConfigByTeamRunId[teamRunId] = {
          ...existing,
          isActive: false,
        };
      }
    },

    reconcileActiveTeamRunIds(activeTeamRunIds: Iterable<string>): void {
      const activeSet = new Set(
        Array.from(activeTeamRunIds).map((teamRunId) => teamRunId.trim()).filter(Boolean),
      );

      const nextTeamResumeConfigs: Record<string, TeamRunResumeConfigPayload> = {};
      for (const [teamRunId, resumeConfig] of Object.entries(this.teamResumeConfigByTeamRunId)) {
        nextTeamResumeConfigs[teamRunId] = {
          ...resumeConfig,
          isActive: activeSet.has(teamRunId),
        };
      }
      this.teamResumeConfigByTeamRunId = nextTeamResumeConfigs;

      this.workspaceGroups = this.workspaceGroups.map((workspace) => ({
        ...workspace,
        teamDefinitions: workspace.teamDefinitions.map((teamDefinition) => ({
          ...teamDefinition,
          runs: teamDefinition.runs.map((team) => {
            const isActive = activeSet.has(team.teamRunId);
            return {
              ...team,
              isActive,
              status: isActive
                ? AgentTeamStatus.Running
                : team.status === AgentTeamStatus.Error
                  ? AgentTeamStatus.Error
                  : AgentTeamStatus.Offline,
              members: team.members.map((member) => ({
                ...member,
                status: isActive ? member.status : AgentStatus.Offline,
              })),
            };
          }),
        })),
      }));
    },

    markTeamDraftProjectionDirty(): void {
      this.teamDraftProjectionRevision += 1;
    },

    async deleteRun(runId: string): Promise<boolean> {
      return deleteRunFromHistoryStore(this, runId);
    },

    async archiveRun(runId: string): Promise<boolean> {
      return archiveRunInHistoryStore(this, runId);
    },

    async deleteTeamRun(teamRunId: string): Promise<boolean> {
      return deleteTeamRunFromHistoryStore(this, teamRunId);
    },

    async archiveTeamRun(teamRunId: string): Promise<boolean> {
      return archiveTeamRunInHistoryStore(this, teamRunId);
    },

    async refreshTreeQuietly(limitPerAgent = 6): Promise<void> {
      try {
        await this.fetchTree(limitPerAgent, { quiet: true });
      } catch {
        // No-op for best-effort refreshes.
      }
    },

    async fetchWorkspaceHistory(workspaceId: string, limitPerAgent = 6, options: { quiet?: boolean } = {}): Promise<void> {
      await fetchWorkspaceHistoryForStore(this, workspaceId, limitPerAgent, options);
    },

    async refreshWorkspaceHistoryQuietly(workspaceId: string, limitPerAgent = 6): Promise<void> {
      try {
        await this.fetchWorkspaceHistory(workspaceId, limitPerAgent, { quiet: true });
      } catch {
        // No-op for best-effort refreshes.
      }
    },

    pruneWorkspace(workspaceId: string, workspaceRootPath: string | null | undefined): void {
      pruneWorkspaceHistoryForStore(this, workspaceId, workspaceRootPath);
    },

    getTreeNodes(): RunTreeWorkspaceNode[] {
      const workspaceStore = useWorkspaceStore();
      const agentContextsStore = useAgentContextsStore();
      return buildRunHistoryTreeNodes({
        workspaceGroups: this.workspaceGroups,
        agentAvatarByDefinitionId: this.agentAvatarByDefinitionId,
        allWorkspaces: workspaceStore.allWorkspaces,
        workspacesById: workspaceStore.workspaces,
        agentContexts: agentContextsStore.runs,
      });
    },

    getTeamNodes(workspaceRootPath?: string): import('~/stores/runHistoryTypes').TeamTreeNode[] {
      void this.teamDraftProjectionRevision;
      const workspaceStore = useWorkspaceStore();
      const teamContextsStore = useAgentTeamContextsStore();
      return buildRunHistoryTeamNodes({
        workspaceGroups: this.workspaceGroups,
        teamContexts: teamContextsStore.allTeamRuns ?? [],
        workspacesById: workspaceStore.workspaces,
        workspaceRootPath,
      });
    },

    getWorkspaceSessionNodes(workspaceRootPath?: string): WorkspaceHistorySessionRow[] {
      const workspaceNodes = this.getTreeNodes();
      const normalizedTargetRoot = normalizeRootPath(workspaceRootPath);
      const targetWorkspaces = normalizedTargetRoot
        ? workspaceNodes.filter((workspaceNode) =>
            normalizeRootPath(workspaceNode.workspaceRootPath) === normalizedTargetRoot)
        : workspaceNodes;
      if (targetWorkspaces.length === 0) {
        return [];
      }

      const teamNodes = this.getTeamNodes(normalizedTargetRoot || undefined);
      const teamsByWorkspaceRoot = new Map<string, import('~/stores/runHistoryTypes').TeamTreeNode[]>();
      for (const team of teamNodes) {
        const key = normalizeRootPath(team.workspaceRootPath);
        const existing = teamsByWorkspaceRoot.get(key) ?? [];
        existing.push(team);
        teamsByWorkspaceRoot.set(key, existing);
      }

      return targetWorkspaces.flatMap((workspaceNode) =>
        buildWorkspaceHistorySessionRows({
          workspaceNode,
          teamNodes: teamsByWorkspaceRoot.get(normalizeRootPath(workspaceNode.workspaceRootPath)) ?? [],
        }));
    },

    async openTeamMemberRun(
      teamRunId: string,
      memberRouteKey: string,
      options: { selectionMode?: RunHistorySelectionMode } = {},
    ): Promise<void> {
      await openTeamMemberRunFromHistory(this, teamRunId, memberRouteKey, options);
    },

    async selectTreeRun(
      row: RunTreeRow | import('~/stores/runHistoryTypes').TeamMemberFocusTarget,
    ): Promise<void> {
      await selectTreeRunFromHistory(this, row);
    },

    formatRelativeTime(isoTime: string): string {
      return formatRunHistoryRelativeTime(isoTime);
    },

    async ensureWorkspaceByRootPath(rootPath: string): Promise<string | null> {
      return await ensureRunHistoryWorkspaceByRootPath(rootPath);
    },

    async resolveWorkspaceMetadataByRootPath(rootPath: string) {
      return await resolveRunHistoryWorkspaceMetadataByRootPath(rootPath);
    },

    findAgentNameByRunId(runId: string): string | null {
      return findAgentNameFromHistory(this.workspaceGroups, runId);
    },
  },
});
