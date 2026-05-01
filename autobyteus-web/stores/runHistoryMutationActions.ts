import { getApolloClient } from '~/utils/apolloClient';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import {
  ArchiveStoredRun,
  ArchiveStoredTeamRun,
  DeleteStoredRun,
  DeleteStoredTeamRun,
} from '~/graphql/mutations/runHistoryMutations';
import type {
  ArchiveStoredRunMutationData,
  ArchiveStoredTeamRunMutationData,
  DeleteStoredRunMutationData,
  DeleteStoredTeamRunMutationData,
  RunHistoryWorkspaceGroup,
  RunResumeConfigPayload,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import {
  removeRunFromWorkspaceGroups,
  removeTeamRunFromWorkspaceGroups,
} from '~/stores/runHistoryStoreSupport';
import { DRAFT_RUN_ID_PREFIX } from '~/utils/runTreeProjectionConstants';

type RunHistoryMutationStoreLike = {
  resumeConfigByRunId: Record<string, RunResumeConfigPayload>;
  teamResumeConfigByTeamRunId: Record<string, TeamRunResumeConfigPayload>;
  workspaceGroups: RunHistoryWorkspaceGroup[];
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  selectedTeamMemberRouteKey: string | null;
  refreshTreeQuietly(limitPerAgent?: number): Promise<void>;
};

const cleanupStoredRunLocalState = (
  store: RunHistoryMutationStoreLike,
  runId: string,
): void => {
  const nextResumeConfigs = { ...store.resumeConfigByRunId };
  delete nextResumeConfigs[runId];
  store.resumeConfigByRunId = nextResumeConfigs;
  store.workspaceGroups = removeRunFromWorkspaceGroups(store.workspaceGroups, runId);

  const agentContextsStore = useAgentContextsStore();
  if (agentContextsStore.getRun(runId)) {
    agentContextsStore.removeRun(runId);
  }

  const selectionStore = useAgentSelectionStore();
  if (
    selectionStore.selectedType === 'agent' &&
    selectionStore.selectedRunId === runId
  ) {
    selectionStore.clearSelection();
  }

  if (store.selectedRunId === runId) {
    store.selectedRunId = null;
  }
};

const cleanupStoredTeamRunLocalState = (
  store: RunHistoryMutationStoreLike,
  teamRunId: string,
): void => {
  const nextTeamResume = { ...store.teamResumeConfigByTeamRunId };
  delete nextTeamResume[teamRunId];
  store.teamResumeConfigByTeamRunId = nextTeamResume;
  store.workspaceGroups = removeTeamRunFromWorkspaceGroups(
    store.workspaceGroups,
    teamRunId,
  );

  const teamContextsStore = useAgentTeamContextsStore();
  teamContextsStore.removeTeamContext(teamRunId);

  const selectionStore = useAgentSelectionStore();
  if (
    selectionStore.selectedType === 'team' &&
    selectionStore.selectedRunId === teamRunId
  ) {
    selectionStore.clearSelection();
  }

  if (store.selectedTeamRunId === teamRunId) {
    store.selectedTeamRunId = null;
    store.selectedTeamMemberRouteKey = null;
  }
};

export const deleteRunFromHistoryStore = async (
  store: RunHistoryMutationStoreLike,
  runId: string,
): Promise<boolean> => {
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

    cleanupStoredRunLocalState(store, normalizedRunId);
    await store.refreshTreeQuietly();
    return true;
  } catch (error: any) {
    console.error(`Failed to delete run '${normalizedRunId}':`, error);
    return false;
  }
};

export const archiveRunInHistoryStore = async (
  store: RunHistoryMutationStoreLike,
  runId: string,
): Promise<boolean> => {
  const normalizedRunId = runId.trim();
  if (!normalizedRunId || normalizedRunId.startsWith(DRAFT_RUN_ID_PREFIX)) {
    return false;
  }

  try {
    const client = getApolloClient();
    const { data, errors } = await client.mutate<ArchiveStoredRunMutationData>({
      mutation: ArchiveStoredRun,
      variables: { runId: normalizedRunId },
    });

    if (errors && errors.length > 0) {
      throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
    }

    const result = data?.archiveStoredRun;
    if (!result?.success) {
      return false;
    }

    cleanupStoredRunLocalState(store, normalizedRunId);
    await store.refreshTreeQuietly();
    return true;
  } catch (error: any) {
    console.error(`Failed to archive run '${normalizedRunId}':`, error);
    return false;
  }
};

export const deleteTeamRunFromHistoryStore = async (
  store: RunHistoryMutationStoreLike,
  teamRunId: string,
): Promise<boolean> => {
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

    cleanupStoredTeamRunLocalState(store, normalizedTeamRunId);
    await store.refreshTreeQuietly();
    return true;
  } catch (error: any) {
    console.error(`Failed to delete team run '${normalizedTeamRunId}':`, error);
    return false;
  }
};

export const archiveTeamRunInHistoryStore = async (
  store: RunHistoryMutationStoreLike,
  teamRunId: string,
): Promise<boolean> => {
  const normalizedTeamRunId = teamRunId.trim();
  if (!normalizedTeamRunId || normalizedTeamRunId.startsWith('temp-')) {
    return false;
  }

  try {
    const client = getApolloClient();
    const { data, errors } = await client.mutate<ArchiveStoredTeamRunMutationData>({
      mutation: ArchiveStoredTeamRun,
      variables: { teamRunId: normalizedTeamRunId },
    });

    if (errors && errors.length > 0) {
      throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
    }

    const result = data?.archiveStoredTeamRun;
    if (!result?.success) {
      return false;
    }

    cleanupStoredTeamRunLocalState(store, normalizedTeamRunId);
    await store.refreshTreeQuietly();
    return true;
  } catch (error: any) {
    console.error(`Failed to archive team run '${normalizedTeamRunId}':`, error);
    return false;
  }
};
