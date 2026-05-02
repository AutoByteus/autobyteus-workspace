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
import type {
  ListWorkspaceRunHistoryQueryData,
  RunHistoryWorkspaceGroup,
  RunResumeConfigPayload,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import {
  buildNextAgentAvatarIndex,
  flattenWorkspaceTeamRuns,
} from '~/stores/runHistoryStoreSupport';
import {
  findAgentNameByRunId,
  normalizeRootPath,
} from '~/stores/runHistoryReadModel';
import {
  openAgentRun,
} from '~/services/runOpen/agentRunOpenCoordinator';
import { hydrateLiveRunContext } from '~/services/runHydration/runContextHydrationService';
import {
  hydrateLiveTeamRunContext,
  hydrateTeamMemberActivitiesFromProjection,
} from '~/services/runHydration/teamRunContextHydrationService';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import {
  normalizeAgentRuntimeStatus,
  normalizeTeamRuntimeStatus,
} from '~/services/runHydration/runtimeStatusNormalization';

interface RunHistoryFetchStoreLike {
  loading: boolean;
  error: string | null;
  workspaceGroups: RunHistoryWorkspaceGroup[];
  agentAvatarByDefinitionId: Record<string, string>;
  resumeConfigByRunId: Record<string, RunResumeConfigPayload>;
  teamResumeConfigByTeamRunId: Record<string, TeamRunResumeConfigPayload>;
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  selectedTeamMemberRouteKey: string | null;
  openingRun: boolean;
  findAgentNameByRunId(runId: string): string | null;
  ensureWorkspaceByRootPath(rootPath: string): Promise<string | null>;
}

export const fetchRunHistoryTree = async (
  store: RunHistoryFetchStoreLike,
  limitPerAgent = 6,
  options: { quiet?: boolean } = {},
): Promise<void> => {
  const quiet = options.quiet === true;
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
    const workspaceHistoryResult = await client.query<ListWorkspaceRunHistoryQueryData>({
      query: ListWorkspaceRunHistory,
      variables: { limitPerAgent },
      fetchPolicy: 'network-only',
    });

    if (workspaceHistoryResult.errors && workspaceHistoryResult.errors.length > 0) {
      throw new Error(workspaceHistoryResult.errors.map((error: { message: string }) => error.message).join(', '));
    }

    store.workspaceGroups = workspaceHistoryResult.data?.listWorkspaceRunHistory || [];
    store.agentAvatarByDefinitionId = await buildNextAgentAvatarIndex(
      store.agentAvatarByDefinitionId,
      { loadDefinitionsIfNeeded: true },
    );
    await reconcileDiscoveredActiveRuns(store);
  } catch (error: any) {
    if (!quiet) {
      store.error = error?.message || 'Failed to load run history.';
    }
  } finally {
    if (!quiet) {
      store.loading = false;
    }
  }
};

const listActiveAgentRunIds = (
  workspaceGroups: RunHistoryWorkspaceGroup[],
): Set<string> =>
  new Set(
    workspaceGroups.flatMap((workspaceGroup) =>
      workspaceGroup.agentDefinitions.flatMap((agentGroup) =>
        agentGroup.runs
          .filter((run) => run.isActive)
          .map((run) => run.runId.trim())
          .filter(Boolean),
      ),
    ),
  );

const listActiveTeamRunIds = (
  workspaceGroups: RunHistoryWorkspaceGroup[],
): Set<string> =>
  new Set(
    flattenWorkspaceTeamRuns(workspaceGroups)
      .filter((teamRun) => teamRun.isActive)
      .map((teamRun) => teamRun.teamRunId.trim())
      .filter(Boolean),
  );

const reconcileDiscoveredActiveRuns = async (
  store: RunHistoryFetchStoreLike,
): Promise<void> => {
  const activeAgentRunIds = listActiveAgentRunIds(store.workspaceGroups);
  const activeTeamRunIds = listActiveTeamRunIds(store.workspaceGroups);
  const agentContextsStore = useAgentContextsStore();
  const agentRunStore = useAgentRunStore();
  const teamContextsStore = useAgentTeamContextsStore();
  const agentTeamRunStore = useAgentTeamRunStore();

  for (const [runId, context] of agentContextsStore.runs.entries()) {
    if (runId.startsWith('temp-') || activeAgentRunIds.has(runId)) {
      continue;
    }

    if (context.isSubscribed) {
      agentRunStore.disconnectAgentStream(runId);
    }
    if (context.state.currentStatus !== AgentStatus.Error) {
      context.state.currentStatus = AgentStatus.ShutdownComplete;
    }
  }

  for (const runId of activeAgentRunIds) {
    const existingContext = agentContextsStore.getRun(runId);
    if (existingContext) {
      existingContext.config.isLocked = true;
      existingContext.state.currentStatus = normalizeAgentRuntimeStatus('ACTIVE');
      if (!existingContext.isSubscribed) {
        agentRunStore.connectToAgentStream(runId);
      }
      continue;
    }

    try {
      await hydrateLiveRunContext({
        runId,
        fallbackAgentName: findAgentNameByRunId(store.workspaceGroups, runId),
        ensureWorkspaceByRootPath: (rootPath: string) => store.ensureWorkspaceByRootPath(rootPath),
        currentStatus: 'ACTIVE',
      });
      agentRunStore.connectToAgentStream(runId);
    } catch (error) {
      console.warn(`[runHistorySync] Failed to hydrate active run '${runId}'.`, error);
    }
  }

  for (const teamContext of teamContextsStore.allTeamRuns) {
    if (teamContext.teamRunId.startsWith('temp-') || activeTeamRunIds.has(teamContext.teamRunId)) {
      continue;
    }

    if (teamContext.isSubscribed) {
      agentTeamRunStore.disconnectTeamStream(teamContext.teamRunId);
    }
    if (teamContext.currentStatus !== AgentTeamStatus.Error) {
      teamContext.currentStatus = AgentTeamStatus.ShutdownComplete;
    }
    teamContext.members.forEach((memberContext) => {
      if (memberContext.state.currentStatus !== AgentStatus.Error) {
        memberContext.state.currentStatus = AgentStatus.ShutdownComplete;
      }
    });
  }

  for (const teamRunId of activeTeamRunIds) {
    const existingTeamContext = teamContextsStore.getTeamContextById(teamRunId);
    if (existingTeamContext) {
      existingTeamContext.config.isLocked = true;
      existingTeamContext.currentStatus = normalizeTeamRuntimeStatus('ACTIVE');
      existingTeamContext.members.forEach((memberContext) => {
        memberContext.config.isLocked = true;
      });
      if (!existingTeamContext.isSubscribed) {
        agentTeamRunStore.connectToTeamStream(teamRunId);
      }
      continue;
    }

    try {
      const result = await hydrateLiveTeamRunContext({
        teamRunId,
        memberRouteKey: null,
        ensureWorkspaceByRootPath: (rootPath: string) => store.ensureWorkspaceByRootPath(rootPath),
        currentStatus: 'ACTIVE',
        memberStatuses: [],
      });
      teamContextsStore.addTeamContext(result.hydratedContext);
      hydrateTeamMemberActivitiesFromProjection({
        members: result.hydratedContext.members,
        projectionByMemberRouteKey: result.projectionByMemberRouteKey,
      });
      agentTeamRunStore.connectToTeamStream(teamRunId);
    } catch (error) {
      console.warn(`[runHistorySync] Failed to hydrate active team run '${teamRunId}'.`, error);
    }
  }
};

export const openHistoricalRun = async (
  store: RunHistoryFetchStoreLike,
  runId: string,
): Promise<void> => {
  store.openingRun = true;
  store.error = null;

  try {
    const result = await openAgentRun({
      runId,
      fallbackAgentName: store.findAgentNameByRunId(runId),
      ensureWorkspaceByRootPath: (rootPath: string) => store.ensureWorkspaceByRootPath(rootPath),
    });

    store.resumeConfigByRunId[runId] = result.resumeConfig;
    store.selectedRunId = result.runId;
    store.selectedTeamRunId = null;
    store.selectedTeamMemberRouteKey = null;
  } catch (error: any) {
    store.error = error?.message || `Failed to open run '${runId}'.`;
    throw error;
  } finally {
    store.openingRun = false;
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
