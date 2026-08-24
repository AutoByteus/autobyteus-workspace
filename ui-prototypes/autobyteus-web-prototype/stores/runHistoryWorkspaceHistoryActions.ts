import { getApolloClient } from '~/utils/apolloClient';
import { GetWorkspaceRunHistory } from '~/graphql/queries/runHistoryQueries';
import type {
  GetWorkspaceRunHistoryQueryData,
  RunHistoryWorkspaceGroup,
  RunResumeConfigPayload,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import { normalizeRootPath } from '~/stores/runHistoryReadModel';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { buildNextAgentAvatarIndex } from '~/stores/runHistoryStoreSupport';

interface WorkspaceHistoryStoreLike {
  workspaceGroups: RunHistoryWorkspaceGroup[];
  workspaceHistoryLoadingById: Record<string, boolean>;
  workspaceHistoryErrorById: Record<string, string | null>;
  agentAvatarByDefinitionId: Record<string, string>;
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  selectedTeamMemberAddress: string | null;
  resumeConfigByRunId: Record<string, RunResumeConfigPayload>;
  teamResumeConfigByTeamRunId: Record<string, TeamRunResumeConfigPayload>;
}

export const fetchWorkspaceHistoryForStore = async (
  store: WorkspaceHistoryStoreLike,
  workspaceId: string,
  limitPerAgent = 6,
  options: { quiet?: boolean } = {},
): Promise<void> => {
  const quiet = options.quiet === true;
  if (!quiet) {
    store.workspaceHistoryLoadingById = { ...store.workspaceHistoryLoadingById, [workspaceId]: true };
    store.workspaceHistoryErrorById = { ...store.workspaceHistoryErrorById, [workspaceId]: null };
  }
  try {
    const client = getApolloClient();
    const result = await client.query<GetWorkspaceRunHistoryQueryData>({
      query: GetWorkspaceRunHistory,
      variables: { workspaceId, limitPerAgent },
      fetchPolicy: 'network-only',
    });
    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors.map((error: { message: string }) => error.message).join(', '));
    }
    const workspaceGroup = result.data?.workspaceRunHistory;
    if (!workspaceGroup) {
      throw new Error('Workspace history was not returned.');
    }
    replaceWorkspaceGroup(store, workspaceGroup);
    store.agentAvatarByDefinitionId = await buildNextAgentAvatarIndex(
      store.agentAvatarByDefinitionId,
      { loadDefinitionsIfNeeded: true },
    );
  } catch (error: any) {
    if (!quiet) {
      store.workspaceHistoryErrorById = {
        ...store.workspaceHistoryErrorById,
        [workspaceId]: error?.message || 'Failed to load workspace history.',
      };
    }
    throw error;
  } finally {
    if (!quiet) {
      store.workspaceHistoryLoadingById = { ...store.workspaceHistoryLoadingById, [workspaceId]: false };
    }
  }
};

export const pruneWorkspaceHistoryForStore = (
  store: WorkspaceHistoryStoreLike,
  workspaceId: string,
  workspaceRootPath: string | null | undefined,
): void => {
  const normalizedRoot = normalizeRootPath(workspaceRootPath);
  if (normalizedRoot) {
    const removedGroup = store.workspaceGroups.find(
      (group) => normalizeRootPath(group.workspaceRootPath) === normalizedRoot,
    );
    store.workspaceGroups = store.workspaceGroups.filter(
      (group) => normalizeRootPath(group.workspaceRootPath) !== normalizedRoot,
    );
    clearSelectedHistoryFromGroup(store, removedGroup ?? null);
  }
  delete store.workspaceHistoryLoadingById[workspaceId];
  delete store.workspaceHistoryErrorById[workspaceId];
};

const replaceWorkspaceGroup = (
  store: WorkspaceHistoryStoreLike,
  workspaceGroup: RunHistoryWorkspaceGroup,
): void => {
  const normalizedRoot = normalizeRootPath(workspaceGroup.workspaceRootPath);
  store.workspaceGroups = [
    ...store.workspaceGroups.filter(
      (group) => normalizeRootPath(group.workspaceRootPath) !== normalizedRoot,
    ),
    workspaceGroup,
  ];
};

const clearSelectedHistoryFromGroup = (
  store: WorkspaceHistoryStoreLike,
  group: RunHistoryWorkspaceGroup | null,
): void => {
  if (!group) return;
  const runIds = new Set(group.agentDefinitions.flatMap((agent) => agent.runs.map((run) => run.runId)));
  const teamRunIds = new Set(group.teamDefinitions.flatMap((team) => team.runs.map((run) => run.teamRunId)));

  const selectionStore = useAgentSelectionStore();
  if (
    selectionStore.selectedType === 'agent' &&
    selectionStore.selectedRunId &&
    runIds.has(selectionStore.selectedRunId)
  ) {
    selectionStore.clearSelection();
  }

  if (
    selectionStore.selectedType === 'team' &&
    selectionStore.selectedRunId &&
    teamRunIds.has(selectionStore.selectedRunId)
  ) {
    selectionStore.clearSelection();
  }

  if (store.selectedRunId && runIds.has(store.selectedRunId)) {
    store.selectedRunId = null;
  }
  if (store.selectedTeamRunId && teamRunIds.has(store.selectedTeamRunId)) {
    store.selectedTeamRunId = null;
    store.selectedTeamMemberAddress = null;
  }
};
