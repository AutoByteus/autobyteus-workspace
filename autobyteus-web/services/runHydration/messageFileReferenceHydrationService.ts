import { GetMessageFileReferences } from '~/graphql/queries/runHistoryQueries';
import type { GetMessageFileReferencesQueryData } from '~/stores/runHistoryTypes';
import { useMessageFileReferencesStore, type MessageFileReferenceArtifact } from '~/stores/messageFileReferencesStore';

export const hydrateMessageFileReferences = (
  teamRunId: string,
  entries: MessageFileReferenceArtifact[],
): void => {
  useMessageFileReferencesStore().replaceProjection(teamRunId, entries);
};

export const fetchAndHydrateMessageFileReferencesForTeam = async (params: {
  client: any;
  teamRunId: string;
}): Promise<void> => {
  try {
    const response = await params.client.query<GetMessageFileReferencesQueryData>({
      query: GetMessageFileReferences,
      variables: {
        teamRunId: params.teamRunId,
      },
      fetchPolicy: 'network-only',
    });
    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '));
    }
    hydrateMessageFileReferences(
      params.teamRunId,
      response.data?.getMessageFileReferences || [],
    );
  } catch (error) {
    console.warn(
      `[runHistoryStore] Failed to fetch message file references for team '${params.teamRunId}'`,
      error,
    );
    hydrateMessageFileReferences(params.teamRunId, []);
  }
};
