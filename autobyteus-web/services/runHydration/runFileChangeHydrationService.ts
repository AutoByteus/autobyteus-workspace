import { useRunFileChangesStore, type RunFileChangeArtifact } from '~/stores/runFileChangesStore';

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
