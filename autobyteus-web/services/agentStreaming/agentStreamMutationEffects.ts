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

const navigationSeverity: Record<RunNavigationEffect['kind'], number> = {
  NONE: 0,
  ACTIVITY: 1,
  PRESENTATION: 2,
};

export const mergeAgentStreamMutationEffects = (
  left: AgentStreamMutationEffects,
  right: AgentStreamMutationEffects,
): AgentStreamMutationEffects => ({
  conversationChanged: left.conversationChanged || right.conversationChanged,
  eventMonitor: eventMonitorSeverity[right.eventMonitor] > eventMonitorSeverity[left.eventMonitor]
    ? right.eventMonitor
    : left.eventMonitor,
  navigation: navigationSeverity[right.navigation.kind] > navigationSeverity[left.navigation.kind]
    ? right.navigation
    : left.navigation.kind === right.navigation.kind && right.navigation.kind !== 'NONE'
      ? right.navigation
      : left.navigation,
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
