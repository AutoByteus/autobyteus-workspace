import type { AgentContext } from '~/types/agent/AgentContext';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import {
  buildRecentEventMonitorPresentation,
  enforceRecentConversationWindow,
  type RecentEventMonitorEnforcementResult,
} from './recentEventMonitorWindow';
import {
  areRecentEventMonitorPresentationWitnessesEqual,
  buildRecentEventMonitorPresentationWitness,
  type RecentEventMonitorPresentationWitness,
} from './recentEventMonitorPresentationWitness';

export interface RecentEventMonitorMutationCommitResult extends RecentEventMonitorEnforcementResult {
  presentationChanged: boolean;
}

const captureRecentEventMonitorPresentationWitness = (
  context: AgentContext,
): RecentEventMonitorPresentationWitness => {
  const compactions = useAgentActivityStore().getCompactionActivities(context.state.runId);
  return buildRecentEventMonitorPresentationWitness(
    buildRecentEventMonitorPresentation(context.conversation, compactions),
  );
};

export const beginRecentEventMonitorMutation = (
  context: AgentContext,
): RecentEventMonitorPresentationWitness => captureRecentEventMonitorPresentationWitness(context);

export const commitRecentEventMonitorMutation = (
  context: AgentContext,
  baseline: RecentEventMonitorPresentationWitness,
): RecentEventMonitorMutationCommitResult => {
  const enforcement = enforceRecentConversationWindow(context.conversation);
  if (enforcement.retentionChanged) context.state.hasEarlierActiveTraceEvents = true;
  const finalWitness = captureRecentEventMonitorPresentationWitness(context);
  const presentationChanged = !areRecentEventMonitorPresentationWitnessesEqual(baseline, finalWitness);
  if (presentationChanged) context.state.markEventMonitorPresentationChanged();
  return { ...enforcement, presentationChanged };
};

export const commitKnownRecentEventMonitorPresentationMutation = (
  context: AgentContext,
): RecentEventMonitorMutationCommitResult => {
  const enforcement = enforceRecentConversationWindow(context.conversation);
  if (enforcement.retentionChanged) context.state.hasEarlierActiveTraceEvents = true;
  context.state.markEventMonitorPresentationChanged();
  return { ...enforcement, presentationChanged: true };
};
