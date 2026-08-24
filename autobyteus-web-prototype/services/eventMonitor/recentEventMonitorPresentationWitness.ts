import type { UserMessage } from '~/types/conversation';
import type { AIResponseSegment } from '~/types/segments';
import { contextAttachmentPresentation } from '~/utils/contextFiles/contextAttachmentPresentation';
import {
  buildToolCardPresentation,
  getToolCardPresentationWitnessValues,
} from '~/utils/toolCardPresentation';
import {
  getCompactionPhasePresentation,
  getCompactionSecondaryText,
} from '~/utils/compactionActivityPresentation';
import { isEventMonitorToolSegment } from './recentEventMonitorCompletion';
import {
  getRecentEventMonitorSegmentStableIdentity,
  type RecentEventMonitorPresentationItem,
} from './recentEventMonitorWindow';
import {
  getRecentEventMonitorMessageUsageText,
  getRecentEventMonitorTotalUsageText,
} from './recentEventMonitorUsagePresentation';

export type RecentEventMonitorWitnessPrimitive = string | number | boolean | null;

export interface RecentEventMonitorPresentationWitnessToken {
  kind: string;
  identity: string;
  values: RecentEventMonitorWitnessPrimitive[];
}

export interface RecentEventMonitorPresentationWitness {
  tokens: RecentEventMonitorPresentationWitnessToken[];
  totalUsageText: string;
}

const getUserIdentity = (message: UserMessage, visualOrdinal: number): string => {
  if (message.messageId) return `user-message:${message.messageId}`;
  if (message.dedupeKey) return `user-dedupe:${message.dedupeKey}`;
  return `user:ordinal:${visualOrdinal}`;
};

const getSegmentIdentity = (segment: AIResponseSegment, visualOrdinal: number): string => {
  const stableIdentity = getRecentEventMonitorSegmentStableIdentity(segment);
  return stableIdentity ?? `${segment.type}:ordinal:${visualOrdinal}`;
};

const buildUserValues = (message: UserMessage): RecentEventMonitorWitnessPrimitive[] => {
  const attachments = message.contextFilePaths ?? [];
  const values: RecentEventMonitorWitnessPrimitive[] = [message.text, attachments.length];
  for (const attachment of attachments) {
    values.push(
      attachment.id,
      attachment.kind,
      attachment.locator,
      contextAttachmentPresentation.getDisplayLabel(attachment),
      attachment.type,
    );
  }
  values.push(getRecentEventMonitorMessageUsageText(message));
  return values;
};

const buildSegmentValues = (
  segment: AIResponseSegment,
  usageText: string,
): RecentEventMonitorWitnessPrimitive[] => {
  if (segment.type === 'text' || segment.type === 'think') return [segment.content, usageText];
  if (isEventMonitorToolSegment(segment)) {
    const presentation = buildToolCardPresentation(segment);
    return [
      presentation.invocationId,
      ...getToolCardPresentationWitnessValues(presentation),
      usageText,
    ];
  }
  switch (segment.type) {
    case 'system_task_notification':
      return [segment.content, usageText];
    case 'inter_agent_message':
      return [
        segment.senderAgentRunId,
        segment.content,
        segment.messageType,
        segment.recipientRoleName,
        usageText,
      ];
    case 'media':
      return [segment.mediaType, segment.urls.length, ...segment.urls, usageText];
    case 'error':
      return [segment.message, segment.details ?? null, usageText];
  }
};

export const buildRecentEventMonitorPresentationWitness = (
  items: readonly RecentEventMonitorPresentationItem[],
): RecentEventMonitorPresentationWitness => {
  const tokens: RecentEventMonitorPresentationWitnessToken[] = [];
  let visualOrdinal = 0;
  for (const item of items) {
    if (item.kind === 'compaction') {
      const phase = getCompactionPhasePresentation(item.activity.phase);
      tokens.push({
        kind: 'compaction',
        identity: `compaction:${item.activity.activityId}`,
        values: [
          phase.label,
          phase.icon,
          phase.tone,
          phase.isCompacting,
          item.activity.message,
          getCompactionSecondaryText(item.activity),
        ],
      });
      visualOrdinal += 1;
      continue;
    }
    if (item.message.type === 'user') {
      tokens.push({
        kind: 'user',
        identity: getUserIdentity(item.message, visualOrdinal),
        values: buildUserValues(item.message),
      });
      visualOrdinal += 1;
      continue;
    }
    const usageText = getRecentEventMonitorMessageUsageText(item.message);
    const lastSegmentIndex = item.message.segments.length - 1;
    item.message.segments.forEach((segment, segmentIndex) => {
      tokens.push({
        kind: segment.type,
        identity: getSegmentIdentity(segment, visualOrdinal),
        values: buildSegmentValues(segment, segmentIndex === lastSegmentIndex ? usageText : ''),
      });
      visualOrdinal += 1;
    });
  }
  return {
    tokens,
    totalUsageText: getRecentEventMonitorTotalUsageText(items),
  };
};

const arePrimitiveListsEqual = (
  left: readonly RecentEventMonitorWitnessPrimitive[],
  right: readonly RecentEventMonitorWitnessPrimitive[],
): boolean => left.length === right.length
  && left.every((value, index) => Object.is(value, right[index]));

export const areRecentEventMonitorPresentationWitnessesEqual = (
  left: RecentEventMonitorPresentationWitness,
  right: RecentEventMonitorPresentationWitness,
): boolean => left.totalUsageText === right.totalUsageText
  && left.tokens.length === right.tokens.length
  && left.tokens.every((token, index) => {
    const other = right.tokens[index];
    return Boolean(other)
      && token.kind === other!.kind
      && token.identity === other!.identity
      && arePrimitiveListsEqual(token.values, other!.values);
  });
