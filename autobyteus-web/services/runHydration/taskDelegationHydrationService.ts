import { GetTaskDelegationRecords } from '~/graphql/queries/runHistoryQueries';
import type { GetTaskDelegationRecordsQueryData } from '~/stores/runHistoryTypes';
import { useTaskDelegationStore } from '~/stores/taskDelegationStore';
import type { TaskDelegationRecord } from '~/stores/taskDelegationTypes';

export const hydrateTaskDelegationRecords = (
  teamRunId: string,
  records: TaskDelegationRecord[],
): void => {
  useTaskDelegationStore().replaceRecords(teamRunId, records);
};

interface TaskDelegationHydrationClient {
  query: <TData>(options: {
    query: unknown;
    variables: Record<string, unknown>;
    fetchPolicy: string;
  }) => Promise<{ data?: TData; errors?: Array<{ message: string }> }>;
}

const refreshTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const fetchAndHydrateTaskDelegationRecordsForTeam = async (params: {
  client: TaskDelegationHydrationClient;
  teamRunId: string;
}): Promise<void> => {
  try {
    const response = await params.client.query<GetTaskDelegationRecordsQueryData>({
      query: GetTaskDelegationRecords,
      variables: { teamRunId: params.teamRunId },
      fetchPolicy: 'network-only',
    });
    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '));
    }
    hydrateTaskDelegationRecords(
      params.teamRunId,
      response.data?.getTaskDelegationRecords || [],
    );
  } catch (error) {
    console.warn(
      `[runHistoryStore] Failed to fetch task delegation records for team '${params.teamRunId}'`,
      error,
    );
    hydrateTaskDelegationRecords(params.teamRunId, []);
  }
};

export const scheduleTaskDelegationRecordsRefresh = (params: {
  client: TaskDelegationHydrationClient;
  teamRunId: string;
  delayMs?: number;
}): void => {
  const existing = refreshTimers.get(params.teamRunId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    refreshTimers.delete(params.teamRunId);
    void fetchAndHydrateTaskDelegationRecordsForTeam({
      client: params.client,
      teamRunId: params.teamRunId,
    });
  }, params.delayMs ?? 250);
  refreshTimers.set(params.teamRunId, timer);
};
