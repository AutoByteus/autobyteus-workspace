export type RecentEventMonitorEffect = 'NONE' | 'PRESENTATION' | 'STRUCTURAL';

export type RunNavigationEffect =
  | { kind: 'NONE' }
  | { kind: 'ACTIVITY'; occurredAt: string }
  | { kind: 'PRESENTATION'; occurredAt?: string };

export interface AgentStreamMutationEffects {
  conversationChanged: boolean;
  eventMonitor: RecentEventMonitorEffect;
  navigation: RunNavigationEffect;
}

export const NO_AGENT_STREAM_MUTATION: AgentStreamMutationEffects = Object.freeze({
  conversationChanged: false,
  eventMonitor: 'NONE',
  navigation: Object.freeze({ kind: 'NONE' }),
});

const eventMonitorSeverity: Record<RecentEventMonitorEffect, number> = {
  NONE: 0,
  PRESENTATION: 1,
  STRUCTURAL: 2,
};

const mergeRunNavigationEffects = (
  left: RunNavigationEffect,
  right: RunNavigationEffect,
): RunNavigationEffect => {
  if (left.kind === 'NONE') return right;
  if (right.kind === 'NONE') return left;
  if (left.kind === 'ACTIVITY' && right.kind === 'ACTIVITY') return right;
  const occurredAt = right.occurredAt ?? left.occurredAt;
  return {
    kind: 'PRESENTATION',
    ...(occurredAt ? { occurredAt } : {}),
  };
};

export const mergeAgentStreamMutationEffects = (
  left: AgentStreamMutationEffects,
  right: AgentStreamMutationEffects,
): AgentStreamMutationEffects => ({
  conversationChanged: left.conversationChanged || right.conversationChanged,
  eventMonitor: eventMonitorSeverity[right.eventMonitor] > eventMonitorSeverity[left.eventMonitor]
    ? right.eventMonitor
    : left.eventMonitor,
  navigation: mergeRunNavigationEffects(left.navigation, right.navigation),
});

export const conversationMutationEffects = (
  eventMonitor: Exclude<RecentEventMonitorEffect, 'NONE'>,
  occurredAt = new Date().toISOString(),
): AgentStreamMutationEffects => ({
  conversationChanged: true,
  eventMonitor,
  navigation: { kind: 'ACTIVITY', occurredAt },
});

export const presentationMutationEffects = (
  eventMonitor: RecentEventMonitorEffect = 'NONE',
): AgentStreamMutationEffects => ({
  conversationChanged: false,
  eventMonitor,
  navigation: { kind: 'PRESENTATION' },
});
