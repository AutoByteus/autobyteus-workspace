import type { AIMessage, Conversation } from '~/types/conversation';
import type { AIResponseSegment } from '~/types/segments';
import type { CompactionActivity } from '~/types/activity/RunActivity';
import { getStreamSegmentIdentity } from '~/services/agentStreaming/handlers/segmentIdentity';
import {
  isEventMonitorToolSegment,
  isRecentEventMonitorActivityComplete,
  isRecentEventMonitorSegmentComplete,
} from './recentEventMonitorCompletion';
import {
  selectRecentWindowCandidates,
  toRecentWindowTimestampMs,
} from './recentEventMonitorSelection';

export const RECENT_EVENT_MONITOR_VISUAL_LIMIT = 100;

export interface RecentEventMonitorEnforcementResult {
  retentionChanged: boolean;
  completedEvictions: number;
  forcedMutableEvictions: number;
}

export type RecentEventMonitorPresentationItem =
  | {
    kind: 'message';
    key: string;
    message: Conversation['messages'][number];
    messageIndex: number;
  }
  | {
    kind: 'compaction';
    key: string;
    activity: CompactionActivity;
  };

type ConversationDescriptor = {
  source: 'message';
  message: Conversation['messages'][number];
  messageIndex: number;
  segment: AIResponseSegment | null;
  segmentIndex: number;
  completed: boolean;
  timestampMs: number;
  order: number;
  stableIdentity: string | null;
};

type CompactionDescriptor = {
  source: 'compaction';
  activity: CompactionActivity;
  completed: boolean;
  timestampMs: number;
  order: number;
  stableIdentity: string;
};

type VisualDescriptor = ConversationDescriptor | CompactionDescriptor;

export const getRecentEventMonitorSegmentStableIdentity = (segment: AIResponseSegment): string | null => {
  const streamIdentity = getStreamSegmentIdentity(segment);
  if (streamIdentity) return `stream:${JSON.stringify([streamIdentity.turnId, streamIdentity.id])}`;
  if (isEventMonitorToolSegment(segment) && segment.invocationId) return `tool:${segment.invocationId}`;
  if (segment.type === 'inter_agent_message' && segment.messageId) return `inter-agent:${segment.messageId}`;
  return null;
};

const flattenConversation = (conversation: Conversation): ConversationDescriptor[] => {
  const descriptors: ConversationDescriptor[] = [];
  conversation.messages.forEach((message, messageIndex) => {
    const timestampMs = toRecentWindowTimestampMs(message.timestamp);
    if (message.type === 'user') {
      descriptors.push({
        source: 'message', message, messageIndex, segment: null, segmentIndex: -1,
        completed: true, timestampMs, order: messageIndex * 10_000,
        stableIdentity: message.messageId
          ? `user-message:${message.messageId}`
          : message.dedupeKey ? `user-dedupe:${message.dedupeKey}` : null,
      });
      return;
    }
    message.segments.forEach((segment, segmentIndex) => {
      descriptors.push({
        source: 'message', message, messageIndex, segment, segmentIndex,
        completed: isRecentEventMonitorSegmentComplete(segment, message.isComplete),
        timestampMs, order: messageIndex * 10_000 + segmentIndex,
        stableIdentity: getRecentEventMonitorSegmentStableIdentity(segment),
      });
    });
  });
  return descriptors;
};

export const enforceRecentConversationWindow = (
  conversation: Conversation,
  limit = RECENT_EVENT_MONITOR_VISUAL_LIMIT,
): RecentEventMonitorEnforcementResult => {
  const descriptors = flattenConversation(conversation);
  const selection = selectRecentWindowCandidates(descriptors, limit);
  const retained = new Set(selection.selected);
  if (retained.size === descriptors.length) {
    return { retentionChanged: false, completedEvictions: 0, forcedMutableEvictions: 0 };
  }

  const descriptorsByMessage = new Map<Conversation['messages'][number], ConversationDescriptor[]>();
  const descriptorBySegment = new Map<AIResponseSegment, ConversationDescriptor>();
  for (const descriptor of descriptors) {
    const owned = descriptorsByMessage.get(descriptor.message) ?? [];
    owned.push(descriptor);
    descriptorsByMessage.set(descriptor.message, owned);
    if (descriptor.segment) descriptorBySegment.set(descriptor.segment, descriptor);
  }

  for (let messageIndex = conversation.messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = conversation.messages[messageIndex]!;
    const owned = descriptorsByMessage.get(message) ?? [];
    if (message.type === 'user') {
      if (!owned.some((descriptor) => retained.has(descriptor))) {
        conversation.messages.splice(messageIndex, 1);
      }
      continue;
    }
    for (let segmentIndex = message.segments.length - 1; segmentIndex >= 0; segmentIndex -= 1) {
      const descriptor = descriptorBySegment.get(message.segments[segmentIndex]!);
      if (!descriptor || !retained.has(descriptor)) message.segments.splice(segmentIndex, 1);
    }
    if (message.segments.length === 0) conversation.messages.splice(messageIndex, 1);
  }

  return {
    retentionChanged: true,
    completedEvictions: selection.completedEvictions,
    forcedMutableEvictions: selection.forcedMutableEvictions,
  };
};

const collectText = (message: AIMessage, type: 'text' | 'think'): string =>
  message.segments
    .filter((segment): segment is Extract<AIResponseSegment, { type: typeof type }> => segment.type === type)
    .map((segment) => segment.content)
    .filter((content) => content.trim().length > 0)
    .join('\n\n');

const buildRetainedAIMessage = (
  message: AIMessage,
  segments: AIResponseSegment[],
): AIMessage => {
  if (segments.length === message.segments.length
    && segments.every((segment, index) => segment === message.segments[index])) return message;
  const retained: AIMessage = { ...message, segments };
  retained.text = collectText(retained, 'text');
  retained.reasoning = collectText(retained, 'think') || null;
  return retained;
};

export const buildRecentEventMonitorPresentation = (
  conversation: Conversation,
  compactions: readonly CompactionActivity[],
  limit = RECENT_EVENT_MONITOR_VISUAL_LIMIT,
): RecentEventMonitorPresentationItem[] => {
  const conversationDescriptors = flattenConversation(conversation);
  const compactionDescriptors: CompactionDescriptor[] = compactions
    .filter((activity) => Boolean(activity.centerTimelineTimestamp)
      && (activity.phase === 'started' || activity.phase === 'completed' || activity.phase === 'failed'))
    .map((activity, index) => ({
      source: 'compaction', activity,
      completed: isRecentEventMonitorActivityComplete(activity),
      timestampMs: toRecentWindowTimestampMs(activity.centerTimelineTimestamp),
      order: conversation.messages.length * 10_000 + index,
      stableIdentity: `compaction:${activity.activityId}`,
    }));
  const ordered: VisualDescriptor[] = [...conversationDescriptors, ...compactionDescriptors]
    .sort((left, right) => left.timestampMs - right.timestampMs || left.order - right.order);
  const retained = selectRecentWindowCandidates(ordered, limit).selected;
  const items: RecentEventMonitorPresentationItem[] = [];

  for (let index = 0; index < retained.length; index += 1) {
    const descriptor = retained[index]!;
    if (descriptor.source === 'compaction') {
      items.push({ kind: 'compaction', key: `compaction-${descriptor.activity.activityId}`, activity: descriptor.activity });
      continue;
    }
    if (descriptor.message.type === 'user') {
      items.push({ kind: 'message', key: `message-${descriptor.messageIndex}`, message: descriptor.message, messageIndex: descriptor.messageIndex });
      continue;
    }
    const segments: AIResponseSegment[] = [descriptor.segment!];
    while (index + 1 < retained.length) {
      const next = retained[index + 1]!;
      if (next.source !== 'message' || next.message !== descriptor.message || !next.segment) break;
      segments.push(next.segment);
      index += 1;
    }
    items.push({
      kind: 'message',
      key: `message-${descriptor.messageIndex}-${descriptor.segmentIndex}`,
      message: buildRetainedAIMessage(descriptor.message, segments),
      messageIndex: descriptor.messageIndex,
    });
  }
  return items;
};
