import type { Conversation, AIMessage, UserMessage } from '~/types/conversation';
import type { AIResponseSegment, ToolInvocationStatus } from '~/types/segments';

export interface RunProjectionConversationEntry {
  kind: string;
  invocationId?: string | null;
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

const appendTextSegment = (
  segments: AIResponseSegment[],
  content?: string | null,
): void => {
  if (typeof content !== 'string' || content.trim().length === 0) {
    return;
  }
  segments.push({
    type: 'text',
    content,
  });
};

const buildToolSegments = (
  runId: string,
  entry: RunProjectionConversationEntry,
  index: number,
): AIResponseSegment[] => {
  const segments: AIResponseSegment[] = [
    {
      type: 'tool_call',
      invocationId: entry.invocationId || `history-${runId}-${index}`,
      toolName: entry.toolName || 'tool',
      arguments: asRecord(entry.toolArgs),
      status: inferToolStatus(entry),
      logs: [],
      result: entry.toolResult ?? null,
      error: entry.toolError ?? null,
      rawContent: entry.content || '',
    },
  ];

  appendTextSegment(segments, entry.content);
  segments.push(...buildMediaSegments(entry));
  return segments;
};

const buildAssistantSideSegments = (
  runId: string,
  entry: RunProjectionConversationEntry,
  index: number,
): AIResponseSegment[] => {
  if (entry.kind === 'message' && entry.role === 'assistant') {
    const segments: AIResponseSegment[] = [];
    appendTextSegment(segments, entry.content);
    segments.push(...buildMediaSegments(entry));
    return segments;
  }

  if (entry.kind === 'reasoning') {
    const segments: AIResponseSegment[] = [];
    if (typeof entry.content === 'string' && entry.content.trim().length > 0) {
      segments.push({
        type: 'think',
        content: entry.content,
      });
    }
    segments.push(...buildMediaSegments(entry));
    return segments;
  }

  if (
    entry.kind === 'tool_call' ||
    entry.kind === 'tool_call_pending' ||
    entry.kind === 'tool_result_orphan'
  ) {
    return buildToolSegments(runId, entry, index);
  }

  const segments: AIResponseSegment[] = [];
  appendTextSegment(segments, entry.content);
  segments.push(...buildMediaSegments(entry));
  return segments;
};

const collectMessageText = (segments: AIResponseSegment[]): string =>
  segments
    .filter((segment): segment is Extract<AIResponseSegment, { type: 'text' }> => segment.type === 'text')
    .map((segment) => segment.content)
    .filter((content) => content.trim().length > 0)
    .join('\n\n');

const collectReasoning = (segments: AIResponseSegment[]): string | null => {
  const reasoning = segments
    .filter((segment): segment is Extract<AIResponseSegment, { type: 'think' }> => segment.type === 'think')
    .map((segment) => segment.content)
    .filter((content) => content.trim().length > 0)
    .join('\n\n');
  return reasoning || null;
};

const createAIMessage = (timestamp: Date): AIMessage => ({
  type: 'ai',
  text: '',
  timestamp,
  isComplete: true,
  segments: [],
  reasoning: null,
});

const finalizeAIMessage = (message: AIMessage): AIMessage => ({
  ...message,
  text: collectMessageText(message.segments),
  reasoning: collectReasoning(message.segments),
});

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
  let pendingAIMessage: AIMessage | null = null;

  const flushPendingAIMessage = (): void => {
    if (!pendingAIMessage) {
      return;
    }
    messages.push(finalizeAIMessage(pendingAIMessage));
    pendingAIMessage = null;
  };

  entries.forEach((entry, index) => {
    const timestamp = toDate(entry.ts);

    if (entry.kind === 'message' && entry.role === 'user') {
      flushPendingAIMessage();
      messages.push({
        type: 'user',
        text: entry.content || '',
        timestamp,
        contextFilePaths: [],
      });
      return;
    }

    const segments = buildAssistantSideSegments(runId, entry, index);
    if (segments.length === 0) {
      return;
    }

    if (!pendingAIMessage) {
      pendingAIMessage = createAIMessage(timestamp);
    }
    pendingAIMessage.segments.push(...segments);
  });

  flushPendingAIMessage();

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
