import { useAgentActivityStore, type ActivityProjectionReplacementResult } from '~/stores/agentActivityStore';
import type { RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import type { RunActivity } from '~/types/activity/RunActivity';
import { mergeHydratedRunFileChanges } from './runFileChangeHydrationService';

/**
 * Hydration of one collaboration member's run state (Team members, AgentOrg members and the
 * delegated copies of a standalone run): the member's projection and its recorded artifacts are
 * fetched together and committed together.
 */

export type MemberRunState<P> = Readonly<{
  projection: P;
  fileChanges: RunFileChangeArtifact[];
}>;

/** Staged member state, committed only when its activity revision is still current. */
export type MemberRunStateCommit = Readonly<{
  runId: string;
  expectedActivityRevision: number;
  activities: readonly RunActivity[];
  fileChanges: readonly RunFileChangeArtifact[];
}>;

/**
 * Fetches the member's projection and its artifacts in parallel, each through the caller's
 * subject-specific query. Fails if either fails, so artifacts follow the caller's existing
 * projection failure policy.
 */
export const fetchMemberRunState = async <P>(input: Readonly<{
  fetchProjection: () => Promise<P>;
  fetchFileChanges: () => Promise<RunFileChangeArtifact[]>;
}>): Promise<MemberRunState<P>> => {
  const [projection, fileChanges] = await Promise.all([
    input.fetchProjection(),
    input.fetchFileChanges(),
  ]);
  return Object.freeze({ projection, fileChanges });
};

/**
 * Commits staged member states: all activities in one revision-guarded replacement, then each
 * member's artifacts merged into the store (live entries with a newer `updatedAt` are kept).
 * On `conflict` nothing is written, artifacts included; the caller decides whether to throw or retry.
 */
export const commitMemberRunStates = (
  states: readonly MemberRunStateCommit[],
): ActivityProjectionReplacementResult => {
  const result = useAgentActivityStore().replaceProjectionActivitiesIfRevisions(states.map((state) => ({
    runId: state.runId,
    expectedRevision: state.expectedActivityRevision,
    activities: state.activities,
  })));
  if (result === 'conflict') return result;
  states.forEach((state) => mergeHydratedRunFileChanges(state.runId, [...state.fileChanges]));
  return result;
};
