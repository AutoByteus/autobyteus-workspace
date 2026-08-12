import type { GetTeamCommunicationMessagesQuery } from '~/generated/graphql';
import { GetTeamCommunicationMessages } from '~/graphql/queries/runHistoryQueries';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';
import type { TeamCommunicationMessage } from '~/stores/teamCommunicationTypes';
import { projectTeamCommunicationMessageDtos } from './teamCommunicationGraphqlDtoProjection';

export const hydrateTeamCommunicationMessages = (
  teamRunId: string,
  messages: TeamCommunicationMessage[],
): void => {
  useTeamCommunicationStore().replaceProjection(teamRunId, messages);
};

interface TeamCommunicationHydrationClient {
  query: <TData>(options: {
    query: unknown;
    variables: Record<string, unknown>;
    fetchPolicy: string;
  }) => Promise<{ data?: TData; errors?: Array<{ message: string }> }>;
}

export const fetchAndHydrateTeamCommunicationForTeam = async (params: {
  client: TeamCommunicationHydrationClient;
  teamRunId: string;
}): Promise<void> => {
  try {
    const response = await params.client.query<GetTeamCommunicationMessagesQuery>({
      query: GetTeamCommunicationMessages,
      variables: {
        teamRunId: params.teamRunId,
      },
      fetchPolicy: 'network-only',
    });
    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '));
    }
    const messages = projectTeamCommunicationMessageDtos(
      response.data?.getTeamCommunicationMessages ?? [],
    );
    hydrateTeamCommunicationMessages(params.teamRunId, messages);
  } catch (error) {
    console.warn(
      `[runHistoryStore] Failed to fetch team communication messages for team '${params.teamRunId}'`,
      error,
    );
    hydrateTeamCommunicationMessages(params.teamRunId, []);
  }
};
