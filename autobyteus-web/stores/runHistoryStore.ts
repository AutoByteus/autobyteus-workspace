import { defineStore } from 'pinia';
import { useWorkspaceStore } from '~/stores/workspace';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type {
  RunHistoryWorkspaceGroup,
  RunResumeConfigPayload,
  TeamMemberInspectionAttempt,
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
import type { RunNavigationTarget } from './runHistoryNavigationPatches';
import {
  applyRunNavigationEffectForStore,
  refreshRunNavigationTopologyForStore,
} from './runHistoryNavigationStoreActions';
import {
  inspectTeamMemberForStore,
  reconcileFocusedTeamMemberProjectionForStore,
  teamMemberInspectionIdentity,
} from './runHistoryTeamMemberInspectionActions';
import type { TeamMemberInspectionResult } from '~/services/runOpen/teamMemberInspectionCoordinator';
import { createDraftRunForHistoryStore } from './runHistoryDraftActions';
import { getApolloClient } from '~/utils/apolloClient';
import { GetAgentRunResumeConfig, GetTeamRunResumeConfig } from '~/graphql/queries/runHistoryQueries';
import { teamRunExecutionTreeDtoSchema } from '@autobyteus/team-stream-contracts';

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
    selectedTeamMemberAddress: null as string | null,
    teamMemberInspectionByIdentity: {} as Record<string, TeamMemberInspectionAttempt | undefined>,
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

    getModelConfigEditability: (state) => (runId: string) =>
      state.resumeConfigByRunId[runId]?.modelConfigEditability ?? null,

    isRunActive: (state) => (runId: string): boolean => {
      return Boolean(state.resumeConfigByRunId[runId]?.isActive);
    },

    isWorkspaceLockedForRun: (state) => (runId: string): boolean => {
      return Boolean(state.resumeConfigByRunId[runId]);
    },

    isRuntimeLockedForRun: (state) => (runId: string): boolean => {
      return Boolean(state.resumeConfigByRunId[runId]);
    },
  },

  actions: {
    async loadWorkspaceCatalogForNavigation(): Promise<void> {
      const workspaceStore = useWorkspaceStore();
      if (workspaceStore.workspacesFetched) return;
      await workspaceStore.fetchAllWorkspaces();
      if (!workspaceStore.workspacesFetched) return;
      this.refreshRunNavigationTopology('workspace-catalog-load');
    },

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
      await createDraftRunForHistoryStore(this, options);
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
          modelConfigEditability: {
            ...resumeConfig.modelConfigEditability,
            editable: false,
            reason: 'RUN_ACTIVE',
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
          modelConfigEditability: {
            ...resumeConfig.modelConfigEditability,
            editable: false,
            reason: 'REFRESH_REQUIRED',
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
          modelConfigEditability: activeSet.has(runId)
            ? { ...resumeConfig.modelConfigEditability, editable: false, reason: 'RUN_ACTIVE' }
            : resumeConfig.modelConfigEditability,
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
          modelConfigEditability: { ...existing.modelConfigEditability, editable: false, reason: 'RUN_ACTIVE' },
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
          modelConfigEditability: { ...existing.modelConfigEditability, editable: false, reason: 'REFRESH_REQUIRED' },
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
          modelConfigEditability: activeSet.has(teamRunId)
            ? { ...resumeConfig.modelConfigEditability, editable: false, reason: 'RUN_ACTIVE' }
            : resumeConfig.modelConfigEditability,
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

    async refreshAgentResumeConfig(runId: string): Promise<RunResumeConfigPayload> {
      const response = await getApolloClient().query<{ getAgentRunResumeConfig: RunResumeConfigPayload }>({
        query: GetAgentRunResumeConfig,
        variables: { runId },
        fetchPolicy: 'network-only',
      });
      if (response.errors?.length) throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '));
      const payload = response.data?.getAgentRunResumeConfig;
      if (!payload) throw new Error(`Run resume config payload missing for '${runId}'.`);
      this.resumeConfigByRunId[runId] = payload;
      return payload;
    },

    async refreshTeamResumeConfig(teamRunId: string): Promise<TeamRunResumeConfigPayload> {
      const response = await getApolloClient().query<{ getTeamRunResumeConfig: {
        teamRunId: string;
        isActive: boolean;
        executionTree: unknown;
        modelConfigEditability: TeamRunResumeConfigPayload['modelConfigEditability'];
      } }>({
        query: GetTeamRunResumeConfig,
        variables: { teamRunId },
        fetchPolicy: 'network-only',
      });
      if (response.errors?.length) throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '));
      const raw = response.data?.getTeamRunResumeConfig;
      if (!raw) throw new Error(`Team resume config payload missing for '${teamRunId}'.`);
      const payload: TeamRunResumeConfigPayload = {
        teamRunId: raw.teamRunId,
        isActive: raw.isActive,
        executionTree: teamRunExecutionTreeDtoSchema.parse(raw.executionTree),
        modelConfigEditability: raw.modelConfigEditability,
      };
      this.teamResumeConfigByTeamRunId[teamRunId] = payload;
      return payload;
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

    getTeamMemberNavigationAncestorRowKeys(
      teamRunId: string,
      agentRunId: string,
    ): string[] {
      if (!this.navigationProjection) this.refreshRunNavigationTopology('lazy-member-ancestry-read');
      const keys = this.navigationProjection?.memberAncestorExecutionKeysByIdentity[
        runHistoryMemberIndexKey(teamRunId, agentRunId)
      ] ?? [];
      return [...keys];
    },

    refreshRunNavigationTopology(reason: string): void {
      refreshRunNavigationTopologyForStore(this, reason);
    },

    applyRunNavigationEffect(target: RunNavigationTarget, effect: RunNavigationEffect): boolean {
      return applyRunNavigationEffectForStore(this, target, effect);
    },

    getTeamMemberInspectionAttempt(
      teamRunId: string,
      agentRunId: string,
    ): TeamMemberInspectionAttempt | null {
      return this.teamMemberInspectionByIdentity[
        teamMemberInspectionIdentity(teamRunId, agentRunId)
      ] ?? null;
    },

    async inspectTeamMember(
      teamRunId: string,
      agentRunId: string,
      options: { selectionMode?: RunHistorySelectionMode } = {},
    ): Promise<TeamMemberInspectionResult> {
      return inspectTeamMemberForStore(this, teamRunId, agentRunId, options);
    },

    async reconcileFocusedTeamMemberProjection(
      teamRunId: string,
      agentRunId: string,
    ): Promise<void> {
      await reconcileFocusedTeamMemberProjectionForStore(this, teamRunId, agentRunId);
    },

    async openTeamMemberRun(
      teamRunId: string,
      agentRunId: string,
      options: { selectionMode?: RunHistorySelectionMode } = {},
    ): Promise<void> {
      await openTeamMemberRunFromHistory(this, teamRunId, agentRunId, options);
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
