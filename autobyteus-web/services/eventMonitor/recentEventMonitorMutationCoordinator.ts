import type { AgentContext } from '~/types/agent/AgentContext';
import type { RecentEventMonitorEffect } from '~/services/agentStreaming/agentStreamMutationEffects';
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

const baselineByContext = new WeakMap<AgentContext, RecentEventMonitorPresentationWitness>();
const NO_ENFORCEMENT: RecentEventMonitorEnforcementResult = Object.freeze({
  retentionChanged: false,
  completedEvictions: 0,
  forcedMutableEvictions: 0,
});

const capturePresentationWitness = (
  context: AgentContext,
): RecentEventMonitorPresentationWitness => {
  const conversation = context.conversation ?? context.state.conversation;
  const compactions = useAgentActivityStore().getCompactionActivities(
    context.state.runId ?? conversation.id,
  );
  return buildRecentEventMonitorPresentationWitness(
    buildRecentEventMonitorPresentation(conversation, compactions),
  );
};

export const resetRecentEventMonitorBaseline = (context: AgentContext): void => {
  baselineByContext.delete(context);
};

export const primeRecentEventMonitorBaseline = (context: AgentContext): void => {
  baselineByContext.set(context, capturePresentationWitness(context));
};

export const commitRecentEventMonitorEffect = (
  context: AgentContext,
  effect: RecentEventMonitorEffect,
): RecentEventMonitorMutationCommitResult => {
  if (effect === 'NONE') {
    return { ...NO_ENFORCEMENT, presentationChanged: false };
  }

  const enforcement = effect === 'STRUCTURAL'
    ? enforceRecentConversationWindow(context.conversation)
    : NO_ENFORCEMENT;
  if (enforcement.retentionChanged) {
    context.state.hasEarlierActiveTraceEvents = true;
  }
  const previous = baselineByContext.get(context);
  const finalWitness = capturePresentationWitness(context);
  baselineByContext.set(context, finalWitness);
  const presentationChanged = !previous
    || !areRecentEventMonitorPresentationWitnessesEqual(previous, finalWitness);
  if (presentationChanged) {
    context.state.markEventMonitorPresentationChanged();
  }
  return { ...enforcement, presentationChanged };
};
