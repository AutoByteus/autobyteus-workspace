import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore';
import { watch } from 'vue';
import { useAgentSelectionStore, type WorkspaceSelectionIntent, type WorkspaceSelectionOutcome } from '~/stores/agentSelectionStore';
import type { ApolloClient, NormalizedCacheObject } from '@apollo/client/core';
import { getApolloClient } from '~/utils/apolloClient';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import {
  ListWorkspaceRunHistory,
} from '~/graphql/queries/runHistoryQueries';
import { ListCollaborationRootHistory } from '~/graphql/queries/collaborationRootHistoryQueries';
import type {
  AgentOrgRunHistoryItem,
  ListWorkspaceRunHistoryQueryData,
  RunHistoryFamilyErrors,
  RunHistoryWorkspaceGroup,
  RunResumeConfigPayload,
  TeamRunHistoryItem,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import {
  buildNextAgentAvatarIndex,
  flattenWorkspaceTeamRuns,
  parseAgentOrgHistoryItems,
} from '~/stores/runHistoryStoreSupport';
import {
  findAgentNameByRunId,
  normalizeRootPath,
} from '~/stores/runHistoryReadModel';
import {
  openAgentRun,
} from '~/services/runOpen/agentRunOpenCoordinator';
import { openTeamRun } from '~/services/runOpen/teamRunOpenCoordinator';
import { hydrateLiveRunContext } from '~/services/runHydration/runContextHydrationService';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import {
  applyActiveRuntimePlaceholder,
  applyMemberOrHistoryStatusSnapshot,
  applyOfflineOrTerminalCleanup,
} from '~/services/runStatus/agentRuntimeStatusState';

export type RunHistorySelectionMode = 'desktop' | 'mobile';

interface RunHistoryOpenOptions {
  selectionIntent?: WorkspaceSelectionIntent;
  selectionMode?: RunHistorySelectionMode;
}

export interface RunHistoryFetchStoreLike {
  loading: boolean;
  error: string | null;
  workspaceGroups: RunHistoryWorkspaceGroup[];
  agentAvatarByDefinitionId: Record<string, string>;
  resumeConfigByRunId: Record<string, RunResumeConfigPayload>;
  teamResumeConfigByTeamRunId: Record<string, TeamRunResumeConfigPayload>;
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  selectedTeamMemberAddress: string | null;
  openingRun: boolean;
  agentOrgHistory: AgentOrgRunHistoryItem[];
  historyFamilyErrors: RunHistoryFamilyErrors;
  agentOrgRequestGeneration: number;
  refreshRunNavigationTopology(reason: string): void;
  findAgentNameByRunId(runId: string): string | null;
  ensureWorkspaceByRootPath(rootPath: string): Promise<string | null>;
  resolveWorkspaceMetadataByRootPath(rootPath: string): Promise<WorkspaceMetadata | null>;
}

const readAgentOrgHistory = async (
  client: ApolloClient<NormalizedCacheObject>,
): Promise<AgentOrgRunHistoryItem[]> => {
  const result = await client.query<{ listCollaborationRootHistory: unknown }>({
    query: ListCollaborationRootHistory,
    fetchPolicy: 'network-only',
    context: { queryDeduplication: false },
  });
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(', '));
  }
  return parseAgentOrgHistoryItems(result.data?.listCollaborationRootHistory ?? []);
};

export const fetchRunHistoryTree = async (
  store: RunHistoryFetchStoreLike,
  limitPerAgent = 6,
  options: { quiet?: boolean } = {},
): Promise<void> => {
  const quiet = options.quiet === true;
  const agentOrgGeneration = ++store.agentOrgRequestGeneration;
  if (!quiet) {
    store.loading = true;
    store.error = null;
  }

  try {
    const windowNodeContextStore = useWindowNodeContextStore();
    const isReady = await windowNodeContextStore.waitForBoundBackendReady();
    if (!isReady) {
      throw new Error(windowNodeContextStore.lastReadyError || 'Bound backend is not ready');
    }

    const client = getApolloClient();
    const workspaceBranch = (async () => {
      try {
        const result = await client.query<ListWorkspaceRunHistoryQueryData>({
          query: ListWorkspaceRunHistory,
          variables: { limitPerAgent },
          fetchPolicy: 'network-only',
        });
        if (result.errors?.length) {
          throw new Error(result.errors.map((error: { message: string }) => error.message).join(', '));
        }
        store.workspaceGroups = result.data?.listWorkspaceRunHistory || [];
        store.historyFamilyErrors = { ...store.historyFamilyErrors, workspace: null };
        store.error = null;
        store.refreshRunNavigationTopology('workspace-history-ready');
        store.agentAvatarByDefinitionId = await buildNextAgentAvatarIndex(
          store.agentAvatarByDefinitionId,
          { loadDefinitionsIfNeeded: true },
        );
        await reconcileDiscoveredActiveRuns(store);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        store.historyFamilyErrors = { ...store.historyFamilyErrors, workspace: detail };
        if (!quiet) store.error = detail;
      }
    })();

    const agentOrgBranch = (async () => {
      try {
        const rows = await readAgentOrgHistory(client);
        if (agentOrgGeneration !== store.agentOrgRequestGeneration) return;
        store.agentOrgHistory = rows;
        store.historyFamilyErrors = { ...store.historyFamilyErrors, agentOrg: null };
        store.refreshRunNavigationTopology('agent-org-history-ready');
        useAgentOrgContextsStore().reconcileRetainedHistory(rows.map((row) => row.rootRunId));
      } catch (error) {
        if (agentOrgGeneration !== store.agentOrgRequestGeneration) return;
        const detail = error instanceof Error ? error.message : String(error);
        store.historyFamilyErrors = { ...store.historyFamilyErrors, agentOrg: detail };
      }
    })();

    // Completion still includes enrichment/reconnection; visible families do not wait for it.
    await Promise.all([workspaceBranch, agentOrgBranch]);
  } catch (error: any) {
    const detail = error?.message || 'Failed to load run history.';
    store.historyFamilyErrors = {
      workspace: detail,
      agentOrg: agentOrgGeneration === store.agentOrgRequestGeneration
        ? detail
        : store.historyFamilyErrors.agentOrg,
    };
    if (!quiet) {
      store.error = detail;
    }
  } finally {
    if (!quiet) {
      store.loading = false;
    }
  }
};

export const refreshAgentOrgHistoryForStore = async (
  store: RunHistoryFetchStoreLike,
): Promise<void> => {
  const generation = ++store.agentOrgRequestGeneration;
  try {
    const windowNodeContextStore = useWindowNodeContextStore();
    const isReady = await windowNodeContextStore.waitForBoundBackendReady();
    if (!isReady) throw new Error(windowNodeContextStore.lastReadyError || 'Bound backend is not ready');
    const rows = await readAgentOrgHistory(getApolloClient());
    if (generation !== store.agentOrgRequestGeneration) return;
    store.agentOrgHistory = rows;
    useAgentOrgContextsStore().reconcileRetainedHistory(rows.map((row) => row.rootRunId));
    store.historyFamilyErrors = { ...store.historyFamilyErrors, agentOrg: null };
  } catch (error) {
    if (generation !== store.agentOrgRequestGeneration) return;
    const detail = error instanceof Error ? error.message : String(error);
    store.historyFamilyErrors = { ...store.historyFamilyErrors, agentOrg: detail };
  }
};

const listActiveAgentRuns = (
  workspaceGroups: RunHistoryWorkspaceGroup[],
): Map<string, RunHistoryWorkspaceGroup['agentDefinitions'][number]['runs'][number]> => {
  const activeRuns = new Map<string, RunHistoryWorkspaceGroup['agentDefinitions'][number]['runs'][number]>();
  workspaceGroups.forEach((workspaceGroup) => {
    workspaceGroup.agentDefinitions.forEach((agentGroup) => {
      agentGroup.runs
        .filter((run) => run.isActive || run.shouldConnectStream === true)
        .forEach((run) => {
          const runId = run.runId.trim();
          if (runId) {
            activeRuns.set(runId, run);
          }
        });
    });
  });
  return activeRuns;
};

const listActiveTeamRuns = (
  workspaceGroups: RunHistoryWorkspaceGroup[],
): TeamRunHistoryItem[] =>
  flattenWorkspaceTeamRuns(workspaceGroups).filter((teamRun) => teamRun.isActive);

export const reconcileDiscoveredActiveRuns = async (
  store: RunHistoryFetchStoreLike,
): Promise<void> => {
  const activeAgentRunById = listActiveAgentRuns(store.workspaceGroups);
  const activeAgentRunIds = new Set(activeAgentRunById.keys());
  const activeTeamRuns = listActiveTeamRuns(store.workspaceGroups);
  const activeTeamRunById = new Map<string, TeamRunHistoryItem>();
  activeTeamRuns.forEach((teamRun) => {
    const teamRunId = teamRun.teamRunId.trim();
    if (teamRunId) {
      activeTeamRunById.set(teamRunId, teamRun);
    }
  });
  const activeTeamRunIds = new Set(activeTeamRunById.keys());
  const agentContextsStore = useAgentContextsStore();
  const agentRunStore = useAgentRunStore();
  const teamContextsStore = useAgentTeamContextsStore();
  const agentTeamRunStore = useAgentTeamRunStore();

  for (const [runId, context] of agentContextsStore.runs.entries()) {
    if (runId.startsWith('temp-') || activeAgentRunIds.has(runId)) {
      continue;
    }

    if (agentRunStore.isAgentStreamReady(runId)) {
      agentRunStore.disconnectAgentStream(runId);
    }
    if (context.state.currentStatus !== AgentStatus.Error) {
      applyOfflineOrTerminalCleanup(context);
    } else {
      applyOfflineOrTerminalCleanup(context, AgentStatus.Error);
    }
  }

  for (const runId of activeAgentRunIds) {
    const activeRun = activeAgentRunById.get(runId);
    const existingContext = agentContextsStore.getRun(runId);
    if (existingContext) {
      existingContext.config.isLocked = true;
      const streamConnected = agentRunStore.isAgentStreamReady(runId);
      applyActiveRuntimePlaceholder(existingContext, { preserveExistingLive: true, streamConnected });
      if (!streamConnected) {
        agentRunStore.connectToAgentStream(runId);
      }
      continue;
    }

    try {
      await hydrateLiveRunContext({
        runId,
        fallbackAgentName: findAgentNameByRunId(store.workspaceGroups, runId),
        resolveWorkspaceMetadataByRootPath: (rootPath: string) =>
          store.resolveWorkspaceMetadataByRootPath(rootPath),
        ensureWorkspaceByRootPath: (rootPath: string) => store.ensureWorkspaceByRootPath(rootPath),
        currentStatus: activeRun?.status ?? AgentStatus.Running,
      });
      agentRunStore.connectToAgentStream(runId);
    } catch (error) {
      console.warn(`[runHistorySync] Failed to hydrate active run '${runId}'.`, error);
    }
  }

  for (const teamContext of teamContextsStore.allTeamRuns) {
    const rootTeamRunId = teamContext.view.getRootTeamRunId();
    if (activeTeamRunIds.has(rootTeamRunId)) {
      continue;
    }

    if (agentTeamRunStore.isTeamStreamReady(rootTeamRunId)) {
      agentTeamRunStore.disconnectTeamStream(rootTeamRunId);
    }
    teamContext.view.setRootTeamActive(false);
    teamContext.view.listAgentContextEntries().forEach(({ agentContext }) => {
      if (agentContext.state.currentStatus !== AgentStatus.Error) {
        applyOfflineOrTerminalCleanup(agentContext);
      } else {
        applyOfflineOrTerminalCleanup(agentContext, AgentStatus.Error);
      }
    });
  }

  for (const [teamRunId, activeTeamRun] of activeTeamRunById.entries()) {
    const existingTeamContext = teamContextsStore.getTeamContextById(teamRunId);
    if (existingTeamContext) {
      existingTeamContext.view.setRootTeamActive(true);
      const streamReopenRequired = agentTeamRunStore.isTeamStreamReopenRequired(teamRunId);
      const streamConnected = agentTeamRunStore.isTeamStreamReady(teamRunId);
      if (!streamReopenRequired) {
        // Retired executions keep their terminal history status even when the root is active.
        existingTeamContext.view.listLiveAgentContextEntries().forEach(({ agentContext }) => {
          agentContext.config.isLocked = true;
          applyActiveRuntimePlaceholder(agentContext, {
            preserveExistingLive: true,
            streamConnected,
          });
        });
      }
      if (!streamConnected && !streamReopenRequired) {
        agentTeamRunStore.connectToTeamStream(teamRunId);
      }
      continue;
    }

    try {
      await openTeamRun({
        teamRunId,
        agentRunId: activeTeamRun.members.find(
          (member) => member.memberAddress === activeTeamRun.coordinatorAddress,
        )?.agentRunId ?? null,
        resolveWorkspaceMetadataByRootPath: (rootPath: string) =>
          store.resolveWorkspaceMetadataByRootPath(rootPath),
        ensureWorkspaceByRootPath: (rootPath: string) => store.ensureWorkspaceByRootPath(rootPath),
        selectRun: false,
      });
    } catch (error) {
      console.warn(`[runHistorySync] Failed to hydrate active team run '${teamRunId}'.`, error);
    }
  }
};

export const openHistoricalRun = async (
  store: RunHistoryFetchStoreLike,
  runId: string,
  options: RunHistoryOpenOptions = {},
): Promise<WorkspaceSelectionOutcome> => {
  const intent = options.selectionIntent ?? useAgentSelectionStore().beginSelectionIntent();
  if (!intent.isCurrent()) return { disposition: 'superseded' };
  const stopWatching = watch(intent.isCurrent, (current) => { if (!current) store.openingRun = false; }, { flush: 'sync' });
  store.openingRun = true;
  store.error = null;

  try {
    const result = await openAgentRun({
      runId,
      selectionIntent: intent,
      fallbackAgentName: store.findAgentNameByRunId(runId),
      resolveWorkspaceMetadataByRootPath: (rootPath: string) =>
        store.resolveWorkspaceMetadataByRootPath(rootPath),
      selectionMode: options.selectionMode,
    });

    if (result.disposition === 'superseded' || !intent.isCurrent()) return { disposition: 'superseded' };
    store.resumeConfigByRunId[runId] = result.resumeConfig;
    store.selectedRunId = result.runId;
    store.selectedTeamRunId = null;
    store.selectedTeamMemberAddress = null;
    return { disposition: 'committed' };
  } catch (error: any) {
    if (!intent.isCurrent()) return { disposition: 'superseded' };
    store.error = error?.message || `Failed to open run '${runId}'.`;
    throw error;
  } finally {
    stopWatching();
    if (intent.isCurrent()) store.openingRun = false;
  }
};

export const resolveRunHistoryWorkspaceMetadataByRootPath = async (
  rootPath: string,
): Promise<WorkspaceMetadata | null> => {
  const workspaceStore = useWorkspaceStore();
  try {
    return await workspaceStore.resolveWorkspaceMetadataByRootPath(rootPath);
  } catch {
    return null;
  }
};

export const ensureRunHistoryWorkspaceByRootPath = async (
  rootPath: string,
): Promise<string | null> => {
  const workspaceStore = useWorkspaceStore();
  if (!rootPath.trim()) {
    return null;
  }

  const normalizedRootPath = normalizeRootPath(rootPath) || rootPath.trim();
  const findWorkspaceIdByRootPath = (): string | null => {
    const matchingWorkspace = workspaceStore.allWorkspaces.find((workspace) => {
      const normalizedWorkspaceRoot = normalizeRootPath(
        workspace.absolutePath
          || workspace.workspaceConfig?.root_path
          || workspace.workspaceConfig?.rootPath
          || null,
      );
      return normalizedWorkspaceRoot === normalizedRootPath;
    });
    return matchingWorkspace?.workspaceId || null;
  };

  const cachedWorkspaceId = findWorkspaceIdByRootPath();
  if (cachedWorkspaceId) {
    return cachedWorkspaceId;
  }

  if (!workspaceStore.workspacesFetched) {
    try {
      await workspaceStore.fetchAllWorkspaces();
    } catch {
      // Fallback to direct creation below.
    }
  }

  try {
    const fetchedWorkspaceId = findWorkspaceIdByRootPath();
    if (fetchedWorkspaceId) {
      return fetchedWorkspaceId;
    }

    return await workspaceStore.createWorkspace({ root_path: normalizedRootPath });
  } catch {
    return null;
  }
};
