import type { Conversation, AIMessage, UserMessage } from '~/types/conversation';
import type { AIResponseSegment, ToolInvocationStatus } from '~/types/segments';

export interface RunProjectionConversationEntry {
  kind: string;
  role?: string | null;
  content?: string | null;
  toolName?: string | null;
  toolArgs?: Record<string, unknown> | null;
  toolResult?: unknown | null;
  toolError?: string | null;
  media?: Record<string, string[]> | null;
  ts?: number | null;
}

const toDate = (seconds?: number | null): Date => {
  if (typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0) {
    return new Date(seconds * 1000);
  }
  return new Date();
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const buildMediaSegments = (entry: RunProjectionConversationEntry): AIResponseSegment[] => {
  if (!entry.media || typeof entry.media !== 'object') {
    return [];
  }

  const segments: AIResponseSegment[] = [];
  const images = Array.isArray(entry.media.image) ? entry.media.image : [];
  const audios = Array.isArray(entry.media.audio) ? entry.media.audio : [];
  const videos = Array.isArray(entry.media.video) ? entry.media.video : [];

  if (images.length) {
    segments.push({ type: 'media', mediaType: 'image', urls: images });
  }
  if (audios.length) {
    segments.push({ type: 'media', mediaType: 'audio', urls: audios });
  }
  if (videos.length) {
    segments.push({ type: 'media', mediaType: 'video', urls: videos });
  }

  return segments;
};

const inferToolStatus = (entry: RunProjectionConversationEntry): ToolInvocationStatus => {
  if (entry.toolError) {
    return 'error';
  }
  if (entry.kind === 'tool_call_pending') {
    return 'parsed';
  }
  if (entry.toolResult !== null && entry.toolResult !== undefined) {
    return 'success';
  }
  return 'parsed';
};

export const buildConversationFromProjection = (
  runId: string,
  entries: RunProjectionConversationEntry[],
  defaults: {
    agentDefinitionId: string;
    agentName: string;
    llmModelIdentifier: string;
  },
): Conversation => {
  const messages: Array<UserMessage | AIMessage> = [];

  entries.forEach((entry, index) => {
    const timestamp = toDate(entry.ts);

    if (entry.kind === 'message' && entry.role === 'user') {
      messages.push({
        type: 'user',
        text: entry.content || '',
        timestamp,
        contextFilePaths: [],
      });
      return;
    }

    if (entry.kind === 'message' && entry.role === 'assistant') {
      const segments: AIResponseSegment[] = [];
      if (entry.content) {
        segments.push({
          type: 'text',
          content: entry.content,
        });
      }
      segments.push(...buildMediaSegments(entry));
      if (segments.length === 0) {
        segments.push({ type: 'text', content: '' });
      }

      messages.push({
        type: 'ai',
        text: entry.content || '',
        timestamp,
        isComplete: true,
        segments,
      });
      return;
    }

    if (
      entry.kind === 'tool_call' ||
      entry.kind === 'tool_call_pending' ||
      entry.kind === 'tool_result_orphan'
    ) {
      const segments: AIResponseSegment[] = [
        {
          type: 'tool_call',
          invocationId: `history-${runId}-${index}`,
          toolName: entry.toolName || 'tool',
          arguments: asRecord(entry.toolArgs),
          status: inferToolStatus(entry),
          logs: [],
          result: entry.toolResult ?? null,
          error: entry.toolError ?? null,
          rawContent: entry.content || '',
        },
      ];

      if (entry.content && entry.content.trim()) {
        segments.push({
          type: 'text',
          content: entry.content,
        });
      }

      segments.push(...buildMediaSegments(entry));

      messages.push({
        type: 'ai',
        text: entry.content || '',
        timestamp,
        isComplete: true,
        segments,
      });
      return;
    }

    if (entry.content || (entry.media && Object.keys(entry.media).length > 0)) {
      const segments: AIResponseSegment[] = [];
      if (entry.content) {
        segments.push({ type: 'text', content: entry.content });
      }
      segments.push(...buildMediaSegments(entry));
      if (segments.length === 0) {
        segments.push({ type: 'text', content: '' });
      }

      messages.push({
        type: 'ai',
        text: entry.content || '',
        timestamp,
        isComplete: true,
        segments,
      });
    }
  });

  const createdAt = messages.length ? messages[0].timestamp.toISOString() : new Date().toISOString();
  const updatedAt = messages.length
    ? messages[messages.length - 1].timestamp.toISOString()
    : new Date().toISOString();

  return {
    id: runId,
    messages,
    createdAt,
    updatedAt,
    agentDefinitionId: defaults.agentDefinitionId,
    agentName: defaults.agentName,
    llmModelIdentifier: defaults.llmModelIdentifier,
  };
};
