import { getApolloClient } from '~/utils/apolloClient';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { GetRunProjection } from '~/graphql/queries/runHistoryQueries';
import type { RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import { buildConversationFromProjection, type RunProjectionConversationEntry } from './runProjectionConversation';
import { buildActivitiesFromProjection, type RunProjectionActivityEntry } from './runProjectionActivityHydration';
import { fetchRunFileChanges } from './runFileChangeHydrationService';

/**
 * A run's stored state: the node's projection of its conversation and activities, and its recorded
 * file changes. The one reader of a standalone run's projection, used by the full hydration (open path)
 * and by the agent stream's catch-up before it reopens (autobyteus-434).
 */

export interface RunProjectionPayload {
  runId: string;
  conversation: RunProjectionConversationEntry[];
  activities: RunProjectionActivityEntry[];
  summary?: string | null;
  lastActivityAt?: string | null;
  hasEarlierActiveTraceEvents: boolean;
}

interface GetRunProjectionQueryData {
  getRunProjection: RunProjectionPayload;
}

export type RunConversationDefaults = Parameters<typeof buildConversationFromProjection>[2];

/** The stored state as read, before it is built against conversation defaults. */
export interface RunStoredStateRead {
  runId: string;
  projection: RunProjectionPayload;
  fileChanges: RunFileChangeArtifact[];
  /** The run's activity revision before the read; a commit replaces activities only if it is unchanged. */
  expectedActivityRevision: number;
}

export interface RunStoredState {
  conversation: ReturnType<typeof buildConversationFromProjection>;
  activities: ReturnType<typeof buildActivitiesFromProjection>;
  expectedActivityRevision: number;
  fileChanges: RunFileChangeArtifact[];
  hasEarlierActiveTraceEvents: boolean;
}

export const readRunStoredState = async (runId: string): Promise<RunStoredStateRead> => {
  const expectedActivityRevision = useAgentActivityStore().getActivityContentRevision(runId);
  const [projectionResponse, fileChanges] = await Promise.all([
    getApolloClient().query<GetRunProjectionQueryData>({
      query: GetRunProjection,
      variables: { runId },
      fetchPolicy: 'network-only',
    }),
    fetchRunFileChanges({ kind: 'run', runId }),
  ]);
  const projectionErrors = projectionResponse.errors || [];
  if (projectionErrors.length > 0) {
    throw new Error(projectionErrors.map((e: { message: string }) => e.message).join(', '));
  }
  const projection = projectionResponse.data?.getRunProjection;
  if (!projection) {
    throw new Error('Run projection payload is missing.');
  }
  return { runId, projection, fileChanges, expectedActivityRevision };
};

export const buildRunStoredState = (read: RunStoredStateRead, defaults: RunConversationDefaults): RunStoredState => {
  const conversation = buildConversationFromProjection(read.runId, read.projection.conversation || [], defaults);
  if (read.projection.lastActivityAt) {
    conversation.updatedAt = read.projection.lastActivityAt;
  }
  return {
    conversation,
    activities: buildActivitiesFromProjection(read.projection.activities || []),
    expectedActivityRevision: read.expectedActivityRevision,
    fileChanges: read.fileChanges,
    hasEarlierActiveTraceEvents: read.projection.hasEarlierActiveTraceEvents === true,
  };
};

export const loadRunStoredState = async (
  runId: string,
  defaults: RunConversationDefaults,
): Promise<RunStoredState> => buildRunStoredState(await readRunStoredState(runId), defaults);
