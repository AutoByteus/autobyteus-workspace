import type { TeamCommunicationMessageDto } from '@autobyteus/team-stream-contracts';
import { GetTeamCommunicationMessages } from '~/graphql/queries/runHistoryQueries';
import type { GetTeamCommunicationMessagesQuery } from '~/generated/graphql';
import { projectTeamCommunicationMessageDtos } from './teamCommunicationGraphqlDtoProjection';

interface TeamCommunicationHydrationClient {
  query: <TData>(options: {
    query: unknown;
    variables: Record<string, unknown>;
    fetchPolicy: string;
  }) => Promise<{ data?: TData; errors?: Array<{ message: string }> }>;
}

export const fetchTeamCommunicationForTeam = async (params: {
  client: TeamCommunicationHydrationClient;
  teamRunId: string;
}): Promise<readonly TeamCommunicationMessageDto[]> => {
  const response = await params.client.query<GetTeamCommunicationMessagesQuery>({
    query: GetTeamCommunicationMessages,
    variables: { teamRunId: params.teamRunId },
    fetchPolicy: 'network-only',
  });
  if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join(', '));
  return Object.freeze(projectTeamCommunicationMessageDtos(response.data?.getTeamCommunicationMessages));
};
