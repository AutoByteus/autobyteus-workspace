import { getApolloClient } from '~/utils/apolloClient';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore';
import {
  ArchiveStoredAgentRunGroup,
  ArchiveStoredRun,
  ArchiveStoredTeamRun,
  DeleteStoredRun,
  DeleteStoredTeamRun,
} from '~/graphql/mutations/runHistoryMutations';
import {
  ArchiveStoredAgentOrgRun,
  DeleteStoredAgentOrgRun,
} from '~/graphql/mutations/agentOrgRunMutations';
import type {
  AgentRunGroupArchiveOutcome,
  ArchiveStoredAgentOrgRunMutationData,
  ArchiveStoredAgentRunGroupMutationData,
  ArchiveStoredRunMutationData,
  ArchiveStoredTeamRunMutationData,
  DeleteStoredAgentOrgRunMutationData,
  DeleteStoredRunMutationData,
  DeleteStoredTeamRunMutationData,
  AgentOrgRunHistoryItem,
  RunGroupArchiveOutcome,
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
  agentOrgHistory: AgentOrgRunHistoryItem[];
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  selectedTeamMemberAddress: string | null;
  refreshTreeQuietly(limitPerAgent?: number): Promise<void>;
  refreshRunNavigationTopology(reason: string): void;
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

const cleanupStoredAgentOrgRunLocalState = (
  store: RunHistoryMutationStoreLike,
  orgRunId: string,
): void => {
  store.agentOrgHistory = store.agentOrgHistory.filter((run) => run.rootRunId !== orgRunId);
  useAgentOrgContextsStore().releaseContext(orgRunId);
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
    store.selectedTeamMemberAddress = null;
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
  if (!normalizedTeamRunId) {
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

const archiveTeamRunRecord = async (
  store: RunHistoryMutationStoreLike,
  teamRunId: string,
): Promise<boolean> => {
  const normalizedTeamRunId = teamRunId.trim();
  if (!normalizedTeamRunId) {
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
    return true;
  } catch (error: any) {
    console.error(`Failed to archive team run '${normalizedTeamRunId}':`, error);
    return false;
  }
};

export const archiveTeamRunInHistoryStore = async (
  store: RunHistoryMutationStoreLike,
  teamRunId: string,
): Promise<boolean> => {
  const archived = await archiveTeamRunRecord(store, teamRunId);
  if (archived) await store.refreshTreeQuietly();
  return archived;
};

export const deleteAgentOrgRunFromHistoryStore = async (
  store: RunHistoryMutationStoreLike,
  orgRunId: string,
): Promise<boolean> => {
  const normalizedOrgRunId = orgRunId.trim();
  if (!normalizedOrgRunId) return false;

  try {
    const client = getApolloClient();
    const { data, errors } = await client.mutate<DeleteStoredAgentOrgRunMutationData>({
      mutation: DeleteStoredAgentOrgRun,
      variables: { orgRunId: normalizedOrgRunId },
    });
    if (errors?.length) throw new Error(errors.map((error: { message: string }) => error.message).join(', '));
    const result = data?.deleteStoredAgentOrgRun;
    if (!result?.success || result.orgRunId !== normalizedOrgRunId) return false;

    cleanupStoredAgentOrgRunLocalState(store, normalizedOrgRunId);
    await store.refreshTreeQuietly();
    return true;
  } catch (error) {
    console.error(`Failed to delete AgentOrg run '${normalizedOrgRunId}':`, error);
    return false;
  }
};

const archiveAgentOrgRunRecord = async (
  store: RunHistoryMutationStoreLike,
  orgRunId: string,
): Promise<boolean> => {
  const normalizedOrgRunId = orgRunId.trim();
  if (!normalizedOrgRunId) return false;

  try {
    const client = getApolloClient();
    const { data, errors } = await client.mutate<ArchiveStoredAgentOrgRunMutationData>({
      mutation: ArchiveStoredAgentOrgRun,
      variables: { orgRunId: normalizedOrgRunId },
    });
    if (errors?.length) throw new Error(errors.map((error: { message: string }) => error.message).join(', '));
    const result = data?.archiveStoredAgentOrgRun;
    if (!result?.success || result.orgRunId !== normalizedOrgRunId) return false;

    cleanupStoredAgentOrgRunLocalState(store, normalizedOrgRunId);
    return true;
  } catch (error) {
    console.error(`Failed to archive AgentOrg run '${normalizedOrgRunId}':`, error);
    return false;
  }
};

export const archiveAgentOrgRunInHistoryStore = async (
  store: RunHistoryMutationStoreLike,
  orgRunId: string,
): Promise<boolean> => {
  const archived = await archiveAgentOrgRunRecord(store, orgRunId);
  if (archived) await store.refreshTreeQuietly();
  return archived;
};

const refreshAfterGroupArchive = async (store: RunHistoryMutationStoreLike): Promise<void> => {
  await store.refreshTreeQuietly();
  store.refreshRunNavigationTopology('group-archive');
};

/**
 * Archives every stored run of one standalone agent in one workspace through the server
 * (which also reaches runs beyond the listing cap), then refreshes once. The server
 * archives nothing when any run of the group is active. Transport errors are thrown.
 */
export const archiveAgentRunGroupInHistoryStore = async (
  store: RunHistoryMutationStoreLike,
  workspaceRootPath: string,
  agentDefinitionId: string,
): Promise<AgentRunGroupArchiveOutcome> => {
  const { data, errors } = await getApolloClient().mutate<ArchiveStoredAgentRunGroupMutationData>({
    mutation: ArchiveStoredAgentRunGroup,
    variables: { workspaceRootPath, agentDefinitionId },
  });
  if (errors?.length) throw new Error(errors.map((error: { message: string }) => error.message).join(', '));
  const outcome = data?.archiveStoredAgentRunGroup;
  if (!outcome) throw new Error('archiveStoredAgentRunGroup returned no result.');

  for (const runId of outcome.archivedRunIds) cleanupStoredRunLocalState(store, runId);
  if (outcome.archivedRunIds.length > 0) await refreshAfterGroupArchive(store);
  return outcome;
};

/**
 * Archives the listed runs of one group one at a time with the per-run archive core,
 * then refreshes history and run-navigation topology once for the whole group.
 */
const archiveRunsOfGroup = async (
  store: RunHistoryMutationStoreLike,
  runIds: string[],
  archiveRecord: (store: RunHistoryMutationStoreLike, runId: string) => Promise<boolean>,
): Promise<RunGroupArchiveOutcome> => {
  const outcome: RunGroupArchiveOutcome = { archivedRunIds: [], failedRunIds: [] };
  for (const runId of runIds) {
    const archived = await archiveRecord(store, runId);
    (archived ? outcome.archivedRunIds : outcome.failedRunIds).push(runId);
  }
  if (outcome.archivedRunIds.length > 0) await refreshAfterGroupArchive(store);
  return outcome;
};

export const archiveTeamRunsInHistoryStore = (
  store: RunHistoryMutationStoreLike,
  teamRunIds: string[],
): Promise<RunGroupArchiveOutcome> => archiveRunsOfGroup(store, teamRunIds, archiveTeamRunRecord);

export const archiveAgentOrgRunsInHistoryStore = (
  store: RunHistoryMutationStoreLike,
  orgRunIds: string[],
): Promise<RunGroupArchiveOutcome> => archiveRunsOfGroup(store, orgRunIds, archiveAgentOrgRunRecord);
