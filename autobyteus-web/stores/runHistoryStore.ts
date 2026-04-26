import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import { DeleteStoredRun, DeleteStoredTeamRun } from '~/graphql/mutations/runHistoryMutations';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { buildEditableAgentRunSeed } from '~/composables/useDefinitionLaunchDefaults';
import type {
  DeleteStoredRunMutationData,
  DeleteStoredTeamRunMutationData,
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
} from '~/stores/runHistoryReadModel';
import {
  removeRunFromWorkspaceGroups,
  removeTeamRunFromWorkspaceGroups,
} from '~/stores/runHistoryStoreSupport';
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
} from '~/stores/runHistoryLoadActions';

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

    async openRun(runId: string): Promise<void> {
      await openHistoricalRun(this, runId);
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
          llmModelIdentifier: resolvedModelIdentifier,
          llmConfig: preserveSeedLlmConfig ? (seed.llmConfig ?? null) : null,
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
        agentDefinitions: workspace.agentDefinitions.map((agent) => ({
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
        agentDefinitions: workspace.agentDefinitions.map((agent) => ({
          ...agent,
          runs: agent.runs.map((run) =>
            run.runId === runId
              ? {
                  ...run,
                  isActive: false,
                  lastKnownStatus:
                    run.lastKnownStatus === 'ERROR' || run.lastKnownStatus === 'TERMINATED'
                      ? run.lastKnownStatus
                      : 'IDLE',
                  lastActivityAt: now,
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
            const lastKnownStatus = isActive
              ? 'ACTIVE'
              : run.lastKnownStatus === 'ERROR' || run.lastKnownStatus === 'TERMINATED'
                ? run.lastKnownStatus
                : 'IDLE';
            return {
              ...run,
              isActive,
              lastKnownStatus,
            };
          }),
        })),
      }));
    },

    markTeamAsActive(teamRunId: string): void {
      const now = new Date().toISOString();
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
                  lastKnownStatus: 'ACTIVE',
                  lastActivityAt: now,
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
      const now = new Date().toISOString();
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
                  lastKnownStatus: team.lastKnownStatus === 'ERROR' ? 'ERROR' : 'IDLE',
                  lastActivityAt: now,
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
            const lastKnownStatus = isActive
              ? 'ACTIVE'
              : team.lastKnownStatus === 'ERROR'
                ? 'ERROR'
                : 'IDLE';
            return {
              ...team,
              isActive,
              lastKnownStatus,
            };
          }),
        })),
      }));
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
        const { data, errors } = await client.mutate<DeleteStoredRunMutationData>({
          mutation: DeleteStoredRun,
          variables: { runId: normalizedRunId },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        const result = data?.deleteStoredRun;
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
        const { data, errors } = await client.mutate<DeleteStoredTeamRunMutationData>({
          mutation: DeleteStoredTeamRun,
          variables: { teamRunId: normalizedTeamRunId },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        const result = data?.deleteStoredTeamRun;
        if (!result?.success) {
          return false;
        }

        const nextTeamResume = { ...this.teamResumeConfigByTeamRunId };
        delete nextTeamResume[normalizedTeamRunId];
        this.teamResumeConfigByTeamRunId = nextTeamResume;
        this.workspaceGroups = removeTeamRunFromWorkspaceGroups(
          this.workspaceGroups,
          normalizedTeamRunId,
        );

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
        await this.fetchTree(limitPerAgent, { quiet: true });
      } catch {
        // No-op for best-effort refreshes.
      }
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

    async openTeamMemberRun(teamRunId: string, memberRouteKey: string): Promise<void> {
      await openTeamMemberRunFromHistory(this, teamRunId, memberRouteKey);
    },

    async selectTreeRun(
      row: RunTreeRow | import('~/stores/runHistoryTypes').TeamMemberTreeRow,
    ): Promise<void> {
      await selectTreeRunFromHistory(this, row);
    },

    formatRelativeTime(isoTime: string): string {
      return formatRunHistoryRelativeTime(isoTime);
    },

    async ensureWorkspaceByRootPath(rootPath: string): Promise<string | null> {
      return await ensureRunHistoryWorkspaceByRootPath(rootPath);
    },

    findAgentNameByRunId(runId: string): string | null {
      return findAgentNameFromHistory(this.workspaceGroups, runId);
    },
  },
});
