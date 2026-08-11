import { GetTaskDelegationRecords } from '~/graphql/queries/runHistoryQueries';
import { useTaskDelegationStore } from '~/stores/taskDelegationStore';
import type { TaskDelegationRecord } from '~/stores/taskDelegationTypes';
import { projectTaskDelegationRecordDtos } from './taskDelegationGraphqlDtoProjection';

interface GetTaskDelegationRecordsGraphqlData {
  getTaskDelegationRecords: unknown[];
}

export const hydrateTaskDelegationRecords = (
  teamRunId: string,
  records: readonly TaskDelegationRecord[],
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

export const fetchTaskDelegationRecordsForTeam = async (params: {
  client: TaskDelegationHydrationClient;
  teamRunId: string;
}): Promise<readonly TaskDelegationRecord[]> => {
  const response = await params.client.query<GetTaskDelegationRecordsGraphqlData>({
    query: GetTaskDelegationRecords,
    variables: { teamRunId: params.teamRunId },
    fetchPolicy: 'network-only',
  });
  if (response.errors && response.errors.length > 0) {
    throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '));
  }
  return projectTaskDelegationRecordDtos(response.data?.getTaskDelegationRecords);
};

export const scheduleTaskDelegationRecordsRefresh = (params: {
  client: TaskDelegationHydrationClient;
  teamRunId: string;
  delayMs?: number;
  admitRecords: (records: readonly TaskDelegationRecord[]) => void;
  onHydrated?: () => void;
  onRejected?: (error: unknown) => void;
}): void => {
  const existing = refreshTimers.get(params.teamRunId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    refreshTimers.delete(params.teamRunId);
    void fetchTaskDelegationRecordsForTeam({
      client: params.client,
      teamRunId: params.teamRunId,
    }).then((records) => {
      params.admitRecords(records);
      hydrateTaskDelegationRecords(params.teamRunId, records);
      params.onHydrated?.();
    }).catch((error: unknown) => {
      if (params.onRejected) params.onRejected(error);
      else console.warn(`[runHistoryStore] Rejected task delegation refresh for team '${params.teamRunId}'`, error);
    });
  }, params.delayMs ?? 250);
  refreshTimers.set(params.teamRunId, timer);
};
