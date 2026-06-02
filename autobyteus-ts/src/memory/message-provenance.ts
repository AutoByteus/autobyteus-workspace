import type { Message, MessageMetadata } from '../llm/utils/messages.js';

export const MEMORY_MESSAGE_PROVENANCE_METADATA_KEY = 'autobyteus_memory_provenance';

export type MessageProvenanceSourceKind =
  | 'system_prompt'
  | 'user_input'
  | 'assistant_response'
  | 'assistant_tool_response'
  | 'tool_result'
  | 'compacted_memory'
  | 'recovery';

export type MessageProvenance = {
  rawTraceIds?: string[];
  sourceKind?: MessageProvenanceSourceKind;
  turnId?: string | null;
  toolCallIds?: string[];
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return normalized.length ? [...new Set(normalized)] : undefined;
};

const normalizeSourceKind = (value: unknown): MessageProvenanceSourceKind | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const allowed: MessageProvenanceSourceKind[] = [
    'system_prompt',
    'user_input',
    'assistant_response',
    'assistant_tool_response',
    'tool_result',
    'compacted_memory',
    'recovery',
  ];
  return allowed.includes(value as MessageProvenanceSourceKind)
    ? value as MessageProvenanceSourceKind
    : undefined;
};

export const normalizeMessageProvenance = (value: unknown): MessageProvenance | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const provenance: MessageProvenance = {};
  const rawTraceIds = normalizeStringArray(record.rawTraceIds);
  const toolCallIds = normalizeStringArray(record.toolCallIds);
  const sourceKind = normalizeSourceKind(record.sourceKind);
  const turnId = typeof record.turnId === 'string' && record.turnId.trim()
    ? record.turnId.trim()
    : null;

  if (rawTraceIds) provenance.rawTraceIds = rawTraceIds;
  if (toolCallIds) provenance.toolCallIds = toolCallIds;
  if (sourceKind) provenance.sourceKind = sourceKind;
  if (turnId) provenance.turnId = turnId;

  return Object.keys(provenance).length ? provenance : null;
};

export const getMessageProvenance = (message: Message): MessageProvenance | null =>
  normalizeMessageProvenance(message.metadata?.[MEMORY_MESSAGE_PROVENANCE_METADATA_KEY]);

export const setMessageProvenance = (
  message: Message,
  provenance: MessageProvenance,
): Message => {
  const normalized = normalizeMessageProvenance(provenance);
  if (!normalized) {
    return message;
  }
  const metadata: MessageMetadata = {
    ...(message.metadata ?? {}),
    [MEMORY_MESSAGE_PROVENANCE_METADATA_KEY]: normalized,
  };
  message.metadata = metadata;
  return message;
};

export const getMessageRawTraceIds = (message: Message): string[] =>
  getMessageProvenance(message)?.rawTraceIds ?? [];

export const collectMessageRawTraceIds = (messages: Iterable<Message>): string[] => {
  const ids = new Set<string>();
  for (const message of messages) {
    for (const id of getMessageRawTraceIds(message)) {
      ids.add(id);
    }
  }
  return [...ids];
};
