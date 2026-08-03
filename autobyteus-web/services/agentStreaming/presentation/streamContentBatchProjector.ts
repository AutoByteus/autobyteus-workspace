import type { AgentContext } from '~/types/agent/AgentContext';
import { commitKnownRecentEventMonitorPresentationMutation } from '~/services/eventMonitor/recentEventMonitorMutationCommit';
import { handleSegmentContent } from '../handlers/segmentHandler';
import type { StreamContentPresentationBatch } from './streamContentPresentationTypes';

export const projectStreamContentBatch = (
  context: AgentContext,
  batch: StreamContentPresentationBatch,
): void => {
  context.conversation.updatedAt = batch.latestActivityAt;

  let presentationChanged = false;
  for (const payload of batch.contentPayloads) {
    presentationChanged = handleSegmentContent(payload, context) || presentationChanged;
  }

  if (presentationChanged) {
    commitKnownRecentEventMonitorPresentationMutation(context);
  }
};
