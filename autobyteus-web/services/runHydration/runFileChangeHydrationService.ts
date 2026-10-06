import { GetRunFileChanges } from '~/graphql/queries/runHistoryQueries';
import { useRunFileChangesStore, type RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import { getApolloClient } from '~/utils/apolloClient';

interface GetRunFileChangesQueryData {
  getRunFileChanges: RunFileChangeArtifact[] | null;
}

/** Reads a run's recorded artifacts from the server. Throws on GraphQL errors; a missing payload is no artifacts. */
export const fetchRunFileChanges = async (runId: string): Promise<RunFileChangeArtifact[]> => {
  const response = await getApolloClient().query<GetRunFileChangesQueryData>({
    query: GetRunFileChanges,
    variables: { runId },
    fetchPolicy: 'network-only',
  });
  const errors = response.errors || [];
  if (errors.length > 0) {
    throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
  }
  return response.data?.getRunFileChanges || [];
};

export const hydrateRunFileChanges = (
  runId: string,
  entries: RunFileChangeArtifact[],
): void => {
  useRunFileChangesStore().replaceRunProjection(runId, entries);
};

export const mergeHydratedRunFileChanges = (
  runId: string,
  entries: RunFileChangeArtifact[],
): void => {
  useRunFileChangesStore().mergeRunProjection(runId, entries);
};
