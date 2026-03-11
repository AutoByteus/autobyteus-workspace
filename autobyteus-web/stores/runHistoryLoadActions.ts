import { getApolloClient } from '~/utils/apolloClient';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import {
  ListRunHistory,
  ListTeamRunHistory,
} from '~/graphql/queries/runHistoryQueries';
import type {
  ListRunHistoryQueryData,
  ListTeamRunHistoryQueryData,
  RunHistoryWorkspaceGroup,
  RunResumeConfigPayload,
  TeamRunHistoryItem,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import {
  buildNextAgentAvatarIndex,
} from '~/stores/runHistoryStoreSupport';
import {
  normalizeRootPath,
} from '~/stores/runHistoryReadModel';
import {
  openRunWithCoordinator,
} from '~/services/runOpen/runOpenCoordinator';

interface RunHistoryFetchStoreLike {
  loading: boolean;
  error: string | null;
  workspaceGroups: RunHistoryWorkspaceGroup[];
  teamRuns: TeamRunHistoryItem[];
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
      throw new Error(agentHistoryResult.errors.map((error: { message: string }) => error.message).join(', '));
    }
    if (teamHistoryResult.errors && teamHistoryResult.errors.length > 0) {
      throw new Error(teamHistoryResult.errors.map((error: { message: string }) => error.message).join(', '));
    }

    store.workspaceGroups = agentHistoryResult.data?.listRunHistory || [];
    store.teamRuns = teamHistoryResult.data?.listTeamRunHistory || [];
    store.agentAvatarByDefinitionId = await buildNextAgentAvatarIndex(
      store.agentAvatarByDefinitionId,
      { loadDefinitionsIfNeeded: true },
    );
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

export const openHistoricalRun = async (
  store: RunHistoryFetchStoreLike,
  runId: string,
): Promise<void> => {
  store.openingRun = true;
  store.error = null;

  try {
    const result = await openRunWithCoordinator({
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
};
