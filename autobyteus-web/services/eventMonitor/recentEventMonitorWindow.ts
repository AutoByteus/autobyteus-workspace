import { isCompleteCompactionPhase } from '~/types/activity/compactionPhase';
import type { AIMessage, Conversation } from '~/types/conversation';
import type { AIResponseSegment, SystemTaskNotificationSegment } from '~/types/segments';
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
    /**
     * Whether this row shows and counts the message's usage: true on the message's last row only, since a message
     * split by notice or compaction rows copies its usage into every part (autobyteus-585).
     */
    showsUsage: boolean;
  }
  | {
    /** A platform notice: its own row, never part of the agent's message (autobyteus-585). */
    kind: 'notice';
    key: string;
    segment: SystemTaskNotificationSegment;
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
  stableIdentity: string | null;
};

type CompactionDescriptor = {
  source: 'compaction';
  activity: CompactionActivity;
  completed: boolean;
  timestampMs: number;
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
        completed: true, timestampMs,
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
        timestampMs,
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

const isNoticeSegment = (segment: AIResponseSegment | null): segment is SystemTaskNotificationSegment =>
  segment?.type === 'system_task_notification';

/** Marks each message's last row as the one that shows and counts its usage. */
const markUsageRows = (items: RecentEventMonitorPresentationItem[]): RecentEventMonitorPresentationItem[] => {
  const messagesWithUsageRow = new Set<number>();
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index]!;
    if (item.kind !== 'message') continue;
    item.showsUsage = !messagesWithUsageRow.has(item.messageIndex);
    messagesWithUsageRow.add(item.messageIndex);
  }
  return items;
};

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

/**
 * The shown order (autobyteus-628): message rows keep the conversation's own order, which the stream and the stored
 * history define. Their timestamps come from different clocks (a live agent message takes the viewer's, a user message
 * the node's), so they never reorder messages. A compaction row goes before the first message row (in conversation
 * order) whose time is later than its own; at an equal time the message comes first.
 */
const mergeCompactionsIntoConversation = (
  messages: readonly ConversationDescriptor[],
  compactions: readonly CompactionDescriptor[],
): VisualDescriptor[] => {
  const byTime = [...compactions].sort((left, right) => left.timestampMs - right.timestampMs);
  const ordered: VisualDescriptor[] = [];
  let next = 0;
  for (const message of messages) {
    while (next < byTime.length && byTime[next]!.timestampMs < message.timestampMs) ordered.push(byTime[next++]!);
    ordered.push(message);
  }
  while (next < byTime.length) ordered.push(byTime[next++]!);
  return ordered;
};

export const buildRecentEventMonitorPresentation = (
  conversation: Conversation,
  compactions: readonly CompactionActivity[],
  limit = RECENT_EVENT_MONITOR_VISUAL_LIMIT,
): RecentEventMonitorPresentationItem[] => {
  const conversationDescriptors = flattenConversation(conversation);
  const compactionDescriptors: CompactionDescriptor[] = compactions
    .filter((activity) => Boolean(activity.centerTimelineTimestamp)
      && (activity.phase === 'started' || isCompleteCompactionPhase(activity.phase)))
    .map((activity) => ({
      source: 'compaction', activity,
      completed: isRecentEventMonitorActivityComplete(activity),
      timestampMs: toRecentWindowTimestampMs(activity.centerTimelineTimestamp),
      stableIdentity: `compaction:${activity.activityId}`,
    }));
  const ordered = mergeCompactionsIntoConversation(conversationDescriptors, compactionDescriptors);
  const retained = selectRecentWindowCandidates(ordered, limit).selected;
  const items: RecentEventMonitorPresentationItem[] = [];

  for (let index = 0; index < retained.length; index += 1) {
    const descriptor = retained[index]!;
    if (descriptor.source === 'compaction') {
      items.push({ kind: 'compaction', key: `compaction-${descriptor.activity.activityId}`, activity: descriptor.activity });
      continue;
    }
    if (descriptor.message.type === 'user') {
      items.push({
        kind: 'message', key: `message-${descriptor.messageIndex}`, message: descriptor.message,
        messageIndex: descriptor.messageIndex, showsUsage: true,
      });
      continue;
    }
    // Something the agent did not write never appears in the agent's row: a notice ends the agent's run of segments.
    if (isNoticeSegment(descriptor.segment)) {
      items.push({
        kind: 'notice', key: `notice-${descriptor.messageIndex}-${descriptor.segmentIndex}`,
        segment: descriptor.segment, messageIndex: descriptor.messageIndex,
      });
      continue;
    }
    const segments: AIResponseSegment[] = [descriptor.segment!];
    while (index + 1 < retained.length) {
      const next = retained[index + 1]!;
      if (next.source !== 'message' || next.message !== descriptor.message || !next.segment
        || isNoticeSegment(next.segment)) break;
      segments.push(next.segment);
      index += 1;
    }
    items.push({
      kind: 'message',
      key: `message-${descriptor.messageIndex}-${descriptor.segmentIndex}`,
      message: buildRetainedAIMessage(descriptor.message, segments),
      messageIndex: descriptor.messageIndex,
      showsUsage: true,
    });
  }
  return markUsageRows(items);
};
