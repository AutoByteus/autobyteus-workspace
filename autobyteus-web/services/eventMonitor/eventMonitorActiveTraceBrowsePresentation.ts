import type { ContextAttachment, UserMessage } from '~/types/conversation';
import type { MediaSegment, ToolApprovalTarget } from '~/types/segments';
import type { CompactionActivity } from '~/types/activity/RunActivity';
import type { CompactionStatusPhase } from '~/types/agent/AgentRunState';
import type { ToolCardPresentation, ToolCardStatusPresentationKey } from '~/utils/toolCardPresentation';
import { buildEventMonitorPageToolCardPresentation } from '~/utils/toolCardPresentation';
import { hydrateContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';
import type {
  EventMonitorActiveTracePageEventDto,
  EventMonitorActiveTracePageVisualDto,
} from './eventMonitorActiveTracePageService';

export type EventMonitorBrowseAssistantVisual =
  | { kind: 'text'; visualId: string; content: string }
  | { kind: 'thinking'; visualId: string; content: string }
  | { kind: 'tool'; visualId: string; presentation: ToolCardPresentation }
  | { kind: 'media'; visualId: string; segment: MediaSegment };

export type EventMonitorActiveTraceBrowsePresentationItem =
  | { kind: 'user'; key: string; visualId: string; message: UserMessage }
  | { kind: 'assistant'; key: string; turnGroupId: string; visuals: EventMonitorBrowseAssistantVisual[] }
  | { kind: 'compaction'; key: string; visualId: string; activity: CompactionActivity };

const attachmentType = (mediaType: string): ContextAttachment['type'] => {
  if (mediaType === 'image') return 'Image';
  if (mediaType === 'audio') return 'Audio';
  if (mediaType === 'video') return 'Video';
  return 'Unknown';
};

const toAttachment = (
  attachment: Extract<EventMonitorActiveTracePageVisualDto, { __typename?: 'EventMonitorUserVisual' }>['attachments'][number],
): ContextAttachment => ({
  ...hydrateContextAttachment({
    locator: attachment.locator,
    type: attachmentType(attachment.mediaType),
  }),
  id: attachment.attachmentId,
});

const STATUS_KEYS = new Set<ToolCardStatusPresentationKey>([
  'running', 'success', 'error', 'approved', 'awaiting-approval', 'denied', 'default',
]);

const toAssistantVisual = (
  visual: EventMonitorActiveTracePageVisualDto,
): EventMonitorBrowseAssistantVisual | null => {
  if (visual.__typename === 'EventMonitorAssistantTextVisual') {
    return { kind: 'text', visualId: visual.visualId, content: visual.content };
  }
  if (visual.__typename === 'EventMonitorThinkingVisual') {
    return { kind: 'thinking', visualId: visual.visualId, content: visual.content };
  }
  if (visual.__typename === 'EventMonitorMediaVisual') {
    if (!['image', 'audio', 'video'].includes(visual.mediaType)) {
      throw new Error(`Unsupported active-trace media type '${visual.mediaType}'.`);
    }
    return {
      kind: 'media',
      visualId: visual.visualId,
      segment: { type: 'media', mediaType: visual.mediaType as MediaSegment['mediaType'], urls: [...visual.urls] },
    };
  }
  if (visual.__typename === 'EventMonitorToolCardVisual') {
    if (!STATUS_KEYS.has(visual.statusKey as ToolCardStatusPresentationKey)) {
      throw new Error(`Unsupported active-trace tool status '${visual.statusKey}'.`);
    }
    return {
      kind: 'tool',
      visualId: visual.visualId,
      presentation: buildEventMonitorPageToolCardPresentation({
        invocationId: visual.invocationId,
        toolName: visual.toolName,
        statusKey: visual.statusKey as ToolCardStatusPresentationKey,
        summaryArgs: visual.summaryArgs,
        errorMessage: visual.errorMessage ?? null,
        approvalTarget: (visual.approvalTarget ?? null) as ToolApprovalTarget | null,
      }),
    };
  }
  return null;
};

const toCompaction = (
  visual: Extract<EventMonitorActiveTracePageVisualDto, { __typename?: 'EventMonitorCompactionVisual' }>,
  occurredAtMs: number | null | undefined,
): CompactionActivity => {
  if (!['requested', 'started', 'completed', 'failed'].includes(visual.phase)) {
    throw new Error(`Unsupported active-trace compaction phase '${visual.phase}'.`);
  }
  const timestamp = new Date(occurredAtMs ?? 0);
  return {
    kind: 'compaction',
    activityId: visual.activityId,
    phase: visual.phase as CompactionStatusPhase,
    message: visual.message,
    turnId: visual.turnId,
    rawTraceCount: visual.rawTraceCount,
    semanticFactCount: visual.semanticFactCount,
    provider: visual.provider,
    timestamp,
    updatedAt: timestamp,
    centerTimelineTimestamp: timestamp,
  };
};

export const buildEventMonitorActiveTraceBrowsePresentation = (
  events: readonly EventMonitorActiveTracePageEventDto[],
): EventMonitorActiveTraceBrowsePresentationItem[] => {
  const items: EventMonitorActiveTraceBrowsePresentationItem[] = [];
  for (const event of events) {
    for (const visual of event.visuals) {
      if (visual.__typename === 'EventMonitorUserVisual') {
        items.push({
          kind: 'user', key: visual.visualId, visualId: visual.visualId,
          message: {
            type: 'user', text: visual.text, timestamp: new Date(event.occurredAtMs ?? 0),
            messageId: event.eventId, contextFilePaths: visual.attachments.map(toAttachment),
          },
        });
        continue;
      }
      if (visual.__typename === 'EventMonitorCompactionVisual') {
        items.push({
          kind: 'compaction', key: visual.visualId, visualId: visual.visualId,
          activity: toCompaction(visual, event.occurredAtMs),
        });
        continue;
      }
      const assistantVisual = toAssistantVisual(visual);
      if (!assistantVisual) continue;
      const previous = items.at(-1);
      if (previous?.kind === 'assistant' && previous.turnGroupId === event.turnGroupId) {
        previous.visuals.push(assistantVisual);
      } else {
        items.push({
          kind: 'assistant', key: `browse-assistant-group:${event.turnGroupId}`,
          turnGroupId: event.turnGroupId, visuals: [assistantVisual],
        });
      }
    }
  }
  return items;
};
