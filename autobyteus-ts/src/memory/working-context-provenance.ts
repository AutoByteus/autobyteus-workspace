import type { Message, MessageMetadata } from '../llm/utils/messages.js';

export const MEMORY_MESSAGE_PROVENANCE_METADATA_KEY = 'autobyteus_memory_provenance';

export type TextRange = { start: number; end: number };
export type MediaRange = { start: number; end: number };

export type CompactedMemoryUserConstituent = {
  kind: 'compacted_memory';
  textRange: TextRange;
};

export type NaturalUserConstituent = {
  kind: 'retained_user' | 'current_user';
  textRange: TextRange | null;
  rawTraceIds: string[];
  turnId: string | null;
  imageRange: MediaRange;
  audioRange: MediaRange;
  videoRange: MediaRange;
};

export type UserConstituent = CompactedMemoryUserConstituent | NaturalUserConstituent;

export type WorkingContextMessageProvenance =
  | { kind: 'single'; rawTraceIds: string[]; turnId: string | null }
  | { kind: 'composed_user'; constituents: UserConstituent[] };

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return value.trim();
};

const normalizeStringArray = (value: unknown, fieldName: string): string[] => {
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array.`);
  const normalized = value.map((item, index) =>
    normalizeRequiredString(item, `${fieldName}[${index}]`));
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`${fieldName} must not contain duplicates.`);
  }
  return normalized;
};

const normalizeRange = (value: unknown, fieldName: string): MediaRange => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${fieldName} must be a range.`);
  }
  const record = value as Record<string, unknown>;
  if (!Number.isInteger(record.start) || !Number.isInteger(record.end)) {
    throw new Error(`${fieldName} offsets must be integers.`);
  }
  const start = record.start as number;
  const end = record.end as number;
  if (start < 0 || end < start) throw new Error(`${fieldName} is invalid.`);
  return { start, end };
};

const normalizeTextRange = (value: unknown, fieldName: string): TextRange | null =>
  value === null ? null : normalizeRange(value, fieldName);

export const normalizeWorkingContextMessageProvenance = (
  value: unknown,
): WorkingContextMessageProvenance | null => {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Working-context message provenance must be an object.');
  }
  const record = value as Record<string, unknown>;
  if (record.kind === 'single') {
    return {
      kind: 'single',
      rawTraceIds: normalizeStringArray(record.rawTraceIds, 'provenance.rawTraceIds'),
      turnId: record.turnId === null
        ? null
        : normalizeRequiredString(record.turnId, 'provenance.turnId'),
    };
  }
  if (record.kind !== 'composed_user' || !Array.isArray(record.constituents)) {
    throw new Error(`Unsupported working-context provenance kind '${String(record.kind)}'.`);
  }
  const constituents = record.constituents.map((candidate, index): UserConstituent => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error(`provenance.constituents[${index}] must be an object.`);
    }
    const item = candidate as Record<string, unknown>;
    if (item.kind === 'compacted_memory') {
      return {
        kind: 'compacted_memory',
        textRange: normalizeRange(
          item.textRange,
          `provenance.constituents[${index}].textRange`,
        ),
      };
    }
    if (item.kind === 'retained_user' || item.kind === 'current_user') {
      return {
        kind: item.kind,
        textRange: normalizeTextRange(
          item.textRange,
          `provenance.constituents[${index}].textRange`,
        ),
        rawTraceIds: normalizeStringArray(
          item.rawTraceIds,
          `provenance.constituents[${index}].rawTraceIds`,
        ),
        turnId: item.turnId === null
          ? null
          : normalizeRequiredString(item.turnId, `provenance.constituents[${index}].turnId`),
        imageRange: normalizeRange(
          item.imageRange,
          `provenance.constituents[${index}].imageRange`,
        ),
        audioRange: normalizeRange(
          item.audioRange,
          `provenance.constituents[${index}].audioRange`,
        ),
        videoRange: normalizeRange(
          item.videoRange,
          `provenance.constituents[${index}].videoRange`,
        ),
      };
    }
    throw new Error(`Unsupported user constituent kind '${String(item.kind)}'.`);
  });
  if (!constituents.length) throw new Error('Composed user provenance requires constituents.');
  return { kind: 'composed_user', constituents };
};

export const getWorkingContextMessageProvenance = (
  message: Message,
): WorkingContextMessageProvenance | null =>
  normalizeWorkingContextMessageProvenance(
    message.metadata?.[MEMORY_MESSAGE_PROVENANCE_METADATA_KEY],
  );

export const setWorkingContextMessageProvenance = (
  message: Message,
  provenance: WorkingContextMessageProvenance,
): Message => {
  const normalized = normalizeWorkingContextMessageProvenance(provenance);
  const metadata: MessageMetadata = {
    ...(message.metadata ?? {}),
    [MEMORY_MESSAGE_PROVENANCE_METADATA_KEY]: normalized,
  };
  message.metadata = metadata;
  return message;
};

export const getMessageRawTraceIds = (message: Message): string[] => {
  const provenance = getWorkingContextMessageProvenance(message);
  if (!provenance) return [];
  if (provenance.kind === 'single') return provenance.rawTraceIds;
  return [...new Set(provenance.constituents.flatMap((constituent) =>
    constituent.kind === 'compacted_memory' ? [] : constituent.rawTraceIds))];
};

export const getMessageTurnId = (message: Message): string | null => {
  const provenance = getWorkingContextMessageProvenance(message);
  if (!provenance) return null;
  if (provenance.kind === 'single') return provenance.turnId;
  const turnIds = [...new Set(provenance.constituents.flatMap((constituent) =>
    constituent.kind === 'compacted_memory' || !constituent.turnId ? [] : [constituent.turnId]))];
  return turnIds.length === 1 ? turnIds[0]! : null;
};

export const collectMessageRawTraceIds = (messages: Iterable<Message>): string[] => {
  const ids = new Set<string>();
  for (const message of messages) {
    getMessageRawTraceIds(message).forEach((id) => ids.add(id));
  }
  return [...ids];
};

export const buildSingleMessageProvenance = (
  rawTraceIds: readonly string[] = [],
  turnId: string | null = null,
): WorkingContextMessageProvenance => ({
  kind: 'single',
  rawTraceIds: [...new Set(rawTraceIds.map((id) => id.trim()).filter(Boolean))],
  turnId: turnId?.trim() || null,
});
