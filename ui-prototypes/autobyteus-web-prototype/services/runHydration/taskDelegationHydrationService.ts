import type { TaskDelegationRecordDto } from '@autobyteus/team-stream-contracts';
import { GetTaskDelegationRecords } from '~/graphql/queries/runHistoryQueries';
import type { GetTaskDelegationRecordsQuery } from '~/generated/graphql';
import { projectTaskDelegationRecordDtos } from './taskDelegationGraphqlDtoProjection';

interface TaskDelegationHydrationClient {
  query: <TData>(options: {
    query: unknown;
    variables: Record<string, unknown>;
    fetchPolicy: string;
  }) => Promise<{ data?: TData; errors?: Array<{ message: string }> }>;
}

export const fetchTaskDelegationRecordsForTeam = async (params: {
  client: TaskDelegationHydrationClient;
  teamRunId: string;
}): Promise<readonly TaskDelegationRecordDto[]> => {
  const response = await params.client.query<GetTaskDelegationRecordsQuery>({
    query: GetTaskDelegationRecords,
    variables: { teamRunId: params.teamRunId },
    fetchPolicy: 'network-only',
  });
  if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join(', '));
  return Object.freeze(projectTaskDelegationRecordDtos(response.data?.getTaskDelegationRecords));
};
