import { GetTeamCommunicationMessages } from '~/graphql/queries/runHistoryQueries';
import type { GetTeamCommunicationMessagesQueryData } from '~/stores/runHistoryTypes';
import { useTeamCommunicationStore, type TeamCommunicationMessage } from '~/stores/teamCommunicationStore';

export const hydrateTeamCommunicationMessages = (
  teamRunId: string,
  messages: TeamCommunicationMessage[],
): void => {
  useTeamCommunicationStore().replaceProjection(teamRunId, messages);
};

export const fetchAndHydrateTeamCommunicationForTeam = async (params: {
  client: any;
  teamRunId: string;
}): Promise<void> => {
  try {
    const response = await params.client.query<GetTeamCommunicationMessagesQueryData>({
      query: GetTeamCommunicationMessages,
      variables: {
        teamRunId: params.teamRunId,
      },
      fetchPolicy: 'network-only',
    });
    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '));
    }
    hydrateTeamCommunicationMessages(
      params.teamRunId,
      response.data?.getTeamCommunicationMessages || [],
    );
  } catch (error) {
    console.warn(
      `[runHistoryStore] Failed to fetch team communication messages for team '${params.teamRunId}'`,
      error,
    );
    hydrateTeamCommunicationMessages(params.teamRunId, []);
  }
};
