import { defineStore } from 'pinia';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildEditableAgentRunSeed } from '~/composables/useDefinitionLaunchDefaults';
import type {
  RunEditableFieldFlags,
  RunHistoryWorkspaceGroup,
  RunResumeConfigPayload,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import {
  findAgentNameByRunId as findAgentNameFromHistory,
  formatRunHistoryRelativeTime,
} from '~/stores/runHistoryReadModel';
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
import {
  runHistoryMemberIndexKey,
  type RunHistoryAgentNavigationAncestry,
  type RunHistoryNavigationProjectionState,
  type RunHistoryTeamNavigationAncestry,
} from './runHistoryNavigationProjection';
import type { RunNavigationEffect } from '~/services/agentStreaming/agentStreamMutationEffects';
import type { TaskExecutionProjectionMutation } from '~/services/agentStreaming/teamTaskExecutionProjection';
import type { RunNavigationTarget } from './runHistoryNavigationPatches';
import {
  applyRunNavigationEffectForStore,
  applyRunNavigationTeamFocusForStore,
  commitTaskProjectionNavigationMutationForStore,
  focusTeamMemberAndEnsureHydratedForStore,
  refreshRunNavigationTopologyForStore,
} from './runHistoryNavigationStoreActions';

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
    navigationProjection: null as RunHistoryNavigationProjectionState | null,
    navigationTopologyRevision: 0,
    navigationPatchRevision: 0,
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
      this.refreshRunNavigationTopology('history-fetch');
    },

    async openRun(runId: string, options: { selectionMode?: RunHistorySelectionMode } = {}): Promise<void> {
      await openHistoricalRun(this, runId, options);
      this.refreshRunNavigationTopology('standalone-open');
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
      this.refreshRunNavigationTopology('workspace-create');
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
      this.refreshRunNavigationTopology('run-active');
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
      this.refreshRunNavigationTopology('run-inactive');
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
      this.refreshRunNavigationTopology('run-reconcile');
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
      this.refreshRunNavigationTopology('team-active');
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
      this.refreshRunNavigationTopology('team-inactive');
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
              members: team.members.map((member) => ({
                ...member,
                status: isActive ? member.status : AgentStatus.Offline,
              })),
            };
          }),
        })),
      }));
      this.refreshRunNavigationTopology('team-reconcile');
    },

    async deleteRun(runId: string): Promise<boolean> {
      const changed = await deleteRunFromHistoryStore(this, runId);
      if (changed) this.refreshRunNavigationTopology('run-delete');
      return changed;
    },

    async archiveRun(runId: string): Promise<boolean> {
      const changed = await archiveRunInHistoryStore(this, runId);
      if (changed) this.refreshRunNavigationTopology('run-archive');
      return changed;
    },

    async deleteTeamRun(teamRunId: string): Promise<boolean> {
      const changed = await deleteTeamRunFromHistoryStore(this, teamRunId);
      if (changed) this.refreshRunNavigationTopology('team-delete');
      return changed;
    },

    async archiveTeamRun(teamRunId: string): Promise<boolean> {
      const changed = await archiveTeamRunInHistoryStore(this, teamRunId);
      if (changed) this.refreshRunNavigationTopology('team-archive');
      return changed;
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
      this.refreshRunNavigationTopology('workspace-history-fetch');
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
      this.refreshRunNavigationTopology('workspace-prune');
    },

    getTreeNodes(): RunTreeWorkspaceNode[] {
      if (!this.navigationProjection) this.refreshRunNavigationTopology('lazy-tree-read');
      return this.navigationProjection?.workspaceNodes ?? [];
    },

    getTeamNodes(workspaceRootPath?: string): import('~/stores/runHistoryTypes').TeamTreeNode[] {
      if (!this.navigationProjection) this.refreshRunNavigationTopology('lazy-team-read');
      if (!workspaceRootPath) return this.navigationProjection?.teamNodes ?? [];
      return this.navigationProjection?.teamNodesByWorkspaceRoot[workspaceRootPath] ?? [];
    },

    getAgentNavigationAncestry(runId: string): RunHistoryAgentNavigationAncestry | null {
      if (!this.navigationProjection) this.refreshRunNavigationTopology('lazy-agent-ancestry-read');
      return this.navigationProjection?.runAncestryById[runId] ?? null;
    },

    getTeamNavigationAncestry(teamRunId: string): RunHistoryTeamNavigationAncestry | null {
      if (!this.navigationProjection) this.refreshRunNavigationTopology('lazy-team-ancestry-read');
      return this.navigationProjection?.teamAncestryById[teamRunId] ?? null;
    },

    getTeamMemberNavigationAncestorRouteKeys(teamRunId: string, memberRouteKey: string): string[] {
      if (!this.navigationProjection) this.refreshRunNavigationTopology('lazy-member-ancestry-read');
      return this.navigationProjection?.memberAncestorRouteKeysByIdentity[
        runHistoryMemberIndexKey(teamRunId, memberRouteKey)
      ] ?? [];
    },

    refreshRunNavigationTopology(reason: string): void {
      refreshRunNavigationTopologyForStore(this, reason);
    },

    applyRunNavigationEffect(target: RunNavigationTarget, effect: RunNavigationEffect): boolean {
      return applyRunNavigationEffectForStore(this, target, effect);
    },

    commitTaskProjectionNavigationMutation(
      teamRunId: string,
      mutation: TaskExecutionProjectionMutation,
    ): boolean {
      return commitTaskProjectionNavigationMutationForStore(this, teamRunId, mutation);
    },

    applyRunNavigationTeamFocus(teamRunId: string, memberRouteKey: string): boolean {
      return applyRunNavigationTeamFocusForStore(this, teamRunId, memberRouteKey);
    },

    async focusTeamMemberAndEnsureHydrated(teamRunId: string, memberRouteKey: string): Promise<boolean> {
      return focusTeamMemberAndEnsureHydratedForStore(this, teamRunId, memberRouteKey);
    },

    async openTeamMemberRun(
      teamRunId: string,
      memberRouteKey: string,
      options: { selectionMode?: RunHistorySelectionMode } = {},
    ): Promise<void> {
      await openTeamMemberRunFromHistory(this, teamRunId, memberRouteKey, options);
      this.refreshRunNavigationTopology('team-open');
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
