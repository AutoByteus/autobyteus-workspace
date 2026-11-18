import type { AgentContext } from '~/types/agent/AgentContext';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { buildRunStoredState } from '~/services/runHydration/runStoredStateLoader';
import { fetchRunFileChanges, hydrateRunFileChanges } from '~/services/runHydration/runFileChangeHydrationService';
import {
  primeRecentEventMonitorBaseline,
  resetRecentEventMonitorBaseline,
} from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';
import { overlayPendingUserMessages } from './handlers/userMessageProjection';
import type { ServerMessage } from './protocol';
import type { AgentStreamSnapshotPayload } from './protocol/agentStreamEnvelope';

/**
 * Applies an agent run's own stream snapshot (autobyteus-461 SR-087): its stored part replaces what the view shows
 * (config and status stay; held or queued input stays shown), then its unconfirmed turns' frames replay through the
 * stream handlers, so their open segments get their stream identities. Each turn so comes from one source; the frames
 * after the base continue it. The run's file changes are read again alongside (their own read, not the stream's).
 */
export const applyAgentStreamSnapshot = (
  runId: string,
  context: AgentContext,
  snapshot: AgentStreamSnapshotPayload,
  replay: (message: ServerMessage) => void,
): void => {
  const activities = useAgentActivityStore();
  const stored = buildRunStoredState({
    runId,
    projection: snapshot.stored,
    fileChanges: [],
    expectedActivityRevision: activities.getActivityContentRevision(runId),
  }, {
    agentDefinitionId: context.config.agentDefinitionId,
    agentName: context.config.agentDefinitionName,
    llmModelIdentifier: context.config.llmModelIdentifier,
  });
  activities.replaceProjectionActivitiesIfRevisions([{
    runId, expectedRevision: stored.expectedActivityRevision, activities: stored.activities,
  }]);
  const conversation = stored.conversation;
  overlayPendingUserMessages(conversation, context.state.conversation);
  resetRecentEventMonitorBaseline(context);
  context.state.conversation = conversation;
  context.state.hasEarlierActiveTraceEvents = stored.hasEarlierActiveTraceEvents;
  context.state.markEventMonitorPresentationChanged();
  primeRecentEventMonitorBaseline(context);
  for (const frame of snapshot.turn_frames) replay(frame);
  void fetchRunFileChanges({ kind: 'run', runId })
    .then((changes) => hydrateRunFileChanges(runId, changes))
    .catch((error: unknown) => console.warn(`Agent stream snapshot for '${runId}' could not read its file changes.`, error));
};
