import { acceptedInputIdentityKey, normalizeAcceptedInputIdentity } from '@autobyteus/agent-presentation-contracts';
import type { ContextAttachment, Conversation, AIMessage, UserMessage } from '~/types/conversation';
import type { AIResponseSegment, ToolInvocationStatus } from '~/types/segments';
import { hydrateContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';
import { parseInterAgentDelivery } from '~/utils/collaboration/interAgentDelivery';
import { enforceRecentConversationWindow } from '~/services/eventMonitor/recentEventMonitorWindow';

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
  fileAttachments?: ReadonlyArray<{ uri: string; fileType: string; fileName: string | null }>;
  messageId?: string;
  dedupeKey?: string;
  senderId?: string | null;
  /** `inter_agent_message`: an agent-to-agent delivery (RD-004). */
  senderAgentRunId?: string | null;
  senderAddress?: string | null;
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

const normalizeText = (value?: string | null): string => (value || '').trim();

const normalizeTs = (value?: number | null): number | null => {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
};

const stableJson = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value !== 'object') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${key}:${stableJson(record[key])}`).join(',')}}`;
};

const projectionEntryKey = (entry: RunProjectionConversationEntry): string => [
  entry.kind,
  entry.role || '',
  normalizeText(entry.content),
  normalizeText(entry.toolName),
  stableJson(entry.toolArgs),
  stableJson(entry.toolResult),
  normalizeText(entry.toolError),
  stableJson(entry.media),
  ...(entry.fileAttachments?.length ? [stableJson(entry.fileAttachments)] : []),
].join('\0');

// Calls are scoped to one already-resolved recipient conversation, never a global index.
const isInputEntry = (entry: RunProjectionConversationEntry): boolean =>
  entry.role === 'user' || entry.kind === 'inter_agent_message';
const inputScope = (entry: RunProjectionConversationEntry): string => JSON.stringify([
  entry.kind, entry.role ?? null, entry.senderId ?? null,
  entry.senderAgentRunId ?? null, entry.senderAddress ?? null,
]);

const mergeInputEntry = (
  current: RunProjectionConversationEntry, incoming: RunProjectionConversationEntry,
): RunProjectionConversationEntry => {
  const media = { ...incoming.media, ...current.media };
  for (const key of Object.keys(media)) {
    media[key] = [...new Set([...(current.media?.[key] ?? []), ...(incoming.media?.[key] ?? [])])];
  }
  const files: NonNullable<RunProjectionConversationEntry['fileAttachments']>[number][] = [];
  for (const file of [...(current.fileAttachments ?? []), ...(incoming.fileAttachments ?? [])]) {
    const index = files.findIndex(saved => saved.uri.trim() === file.uri.trim() && saved.fileType.trim().toLowerCase() === file.fileType.trim().toLowerCase());
    if (index < 0) files.push(file);
    else if (!files[index].fileName?.trim() || files[index].fileName === files[index].uri.split('/').pop()) {
      files[index] = { ...files[index], fileName: file.fileName?.trim() ? file.fileName : files[index].fileName };
    }
  }
  return {
    ...incoming, ...current,
    ...normalizeAcceptedInputIdentity({
      messageId: normalizeAcceptedInputIdentity(current).messageId ?? incoming.messageId,
      dedupeKey: normalizeAcceptedInputIdentity(current).dedupeKey ?? incoming.dedupeKey,
    }),
    content: current.content || incoming.content,
    ts: normalizeTs(current.ts) ?? normalizeTs(incoming.ts),
    ...(current.media || incoming.media ? { media } : {}),
    ...(files.length ? { fileAttachments: files } : {}),
  };
};

const projectionEntriesCanMerge = (
  left: RunProjectionConversationEntry,
  right: RunProjectionConversationEntry,
): boolean => {
  if (isInputEntry(left) || isInputEntry(right)) {
    if (inputScope(left) !== inputScope(right)) return false;
    const leftKey = acceptedInputIdentityKey(left);
    const rightKey = acceptedInputIdentityKey(right);
    if (leftKey || rightKey) return leftKey !== null && leftKey === rightKey;
  }
  if (projectionEntryKey(left) !== projectionEntryKey(right)) {
    return false;
  }
  const leftTs = normalizeTs(left.ts);
  const rightTs = normalizeTs(right.ts);
  if (leftTs === null && rightTs === null) {
    return false;
  }
  return leftTs === null || rightTs === null || leftTs === rightTs;
};

const mergeProjectionEntry = (
  current: RunProjectionConversationEntry,
  incoming: RunProjectionConversationEntry,
): RunProjectionConversationEntry => isInputEntry(current) ? mergeInputEntry(current, incoming) : ({
  ...current,
  ...incoming,
  ts: normalizeTs(incoming.ts) ?? normalizeTs(current.ts),
  invocationId: incoming.invocationId ?? current.invocationId ?? null,
  role: incoming.role ?? current.role ?? null,
  content: incoming.content ?? current.content ?? null,
  toolName: incoming.toolName ?? current.toolName ?? null,
  toolArgs: incoming.toolArgs ?? current.toolArgs ?? null,
  toolResult: incoming.toolResult ?? current.toolResult ?? null,
  toolError: incoming.toolError ?? current.toolError ?? null,
  media: incoming.media ?? current.media ?? null,
  fileAttachments: incoming.fileAttachments ?? current.fileAttachments,
});

const readMediaLocators = (
  media: Record<string, string[]> | null | undefined,
  key: 'images' | 'audio' | 'video',
): string[] => (
  media && Array.isArray(media[key])
    ? media[key].filter((locator) => typeof locator === 'string' && locator.trim().length > 0)
    : []
);

const dedupeProjectionEntries = (
  entries: RunProjectionConversationEntry[],
): RunProjectionConversationEntry[] => {
  const deduped: RunProjectionConversationEntry[] = [];
  for (const entry of entries) {
    const existingIndex = deduped.findIndex((candidate) => projectionEntriesCanMerge(candidate, entry));
    if (existingIndex >= 0) {
      deduped[existingIndex] = mergeProjectionEntry(deduped[existingIndex], entry);
      continue;
    }
    deduped.push(entry);
  }
  return deduped;
};

const buildMediaSegments = (entry: RunProjectionConversationEntry): AIResponseSegment[] => {
  if (!entry.media || typeof entry.media !== 'object') {
    return [];
  }

  const segments: AIResponseSegment[] = [];
  const images = readMediaLocators(entry.media, 'images');
  const audios = readMediaLocators(entry.media, 'audio');
  const videos = readMediaLocators(entry.media, 'video');

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

const buildUserContextFilePaths = (entry: RunProjectionConversationEntry): ContextAttachment[] => [
  ...readMediaLocators(entry.media, 'images').map((locator) =>
    hydrateContextAttachment({ locator, type: 'Image' }),
  ),
  ...readMediaLocators(entry.media, 'audio').map((locator) =>
    hydrateContextAttachment({ locator, type: 'Audio' }),
  ),
  ...readMediaLocators(entry.media, 'video').map((locator) =>
    hydrateContextAttachment({ locator, type: 'Video' }),
  ),
  ...(entry.fileAttachments ?? []).map((file) => hydrateContextAttachment({
    locator: file.uri, type: file.fileType, displayName: file.fileName,
  })),
];

const inferToolStatus = (entry: RunProjectionConversationEntry): ToolInvocationStatus => {
  const result = asRecord(entry.toolResult);
  if (result.status === 'denied' && (result.provider_state === 'ERROR' || result.provider_state === 'DONE')) return 'denied';
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

  if (entry.kind === 'system_task_notification') {
    if (typeof entry.content !== 'string' || entry.content.trim().length === 0) return [];
    return [{
      type: 'system_task_notification',
      senderId: entry.senderId ?? 'system',
      content: entry.content,
    }];
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

  dedupeProjectionEntries(entries).forEach((entry, index) => {
    const timestamp = toDate(entry.ts);

    if (entry.kind === 'compaction') {
      return;
    }

    if (entry.kind === 'inter_agent_message') {
      // An agent-to-agent delivery opens the receiving agent's message block with "From <Sender>:".
      flushPendingAIMessage();
      const delivery = parseInterAgentDelivery(entry.content || '');
      pendingAIMessage = createAIMessage(timestamp);
      pendingAIMessage.segments.push({
        type: 'inter_agent_message',
        senderAgentRunId: entry.senderAgentRunId || delivery.senderAgentRunId || '',
        senderAddress: entry.senderAddress ?? null,
        senderName: delivery.senderName,
        recipientRoleName: '',
        messageType: 'agent_message',
        content: delivery.body,
      });
      return;
    }

    if (entry.kind === 'message' && entry.role === 'user') {
      flushPendingAIMessage();
      messages.push({
        type: 'user',
        ...normalizeAcceptedInputIdentity(entry),
        text: entry.content || '',
        timestamp,
        contextFilePaths: buildUserContextFilePaths(entry),
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

  const conversation: Conversation = {
    id: runId,
    messages,
    createdAt,
    updatedAt,
    agentDefinitionId: defaults.agentDefinitionId,
    agentName: defaults.agentName,
    llmModelIdentifier: defaults.llmModelIdentifier,
  };
  enforceRecentConversationWindow(conversation);
  return conversation;
};
