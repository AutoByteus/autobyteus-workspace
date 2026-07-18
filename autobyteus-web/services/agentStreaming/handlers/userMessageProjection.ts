import type { AgentContext } from '~/types/agent/AgentContext';
import type { UserMessage } from '~/types/conversation';
import type { UserMessageProjectionPayload } from '../protocol/messageTypes';
import { hydrateContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

const toTimestamp = (value?: string | null): Date => {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
};

const normalizeIdentity = (value?: string | null): string => value?.trim() || '';

const attachmentsEqual = (
  left: UserMessage['contextFilePaths'],
  right: UserMessage['contextFilePaths'],
): boolean => {
  const leftAttachments = left ?? [];
  const rightAttachments = right ?? [];
  if (leftAttachments.length !== rightAttachments.length) return false;
  return leftAttachments.every((attachment, index) => {
    const next = rightAttachments[index];
    if (!next) return false;
    const keys = new Set([...Object.keys(attachment), ...Object.keys(next)]);
    return [...keys].every((key) =>
      (attachment as unknown as Record<string, unknown>)[key]
        === (next as unknown as Record<string, unknown>)[key]);
  });
};

const findExistingMessageIndex = (
  messages: AgentContext['conversation']['messages'],
  messageId: string,
  dedupeKey: string,
): number => {
  if (!messageId && !dedupeKey) {
    return -1;
  }
  return messages.findIndex((message) => {
    if (message.type !== 'user') {
      return false;
    }
    const candidate = message as UserMessage;
    return Boolean(
      (messageId && candidate.messageId === messageId) ||
      (dedupeKey && candidate.dedupeKey === dedupeKey),
    );
  });
};

export const buildUserMessageFromProjectionPayload = (
  payload: UserMessageProjectionPayload,
): UserMessage => {
  const messageId = normalizeIdentity(payload.message_id);
  const dedupeKey = normalizeIdentity(payload.dedupe_key);
  const contextFilePaths = (payload.context_file_paths ?? [])
    .filter((item) => typeof item?.path === 'string' && item.path.trim().length > 0)
    .map((item) =>
      hydrateContextAttachment({
        locator: item.path,
        type: item.type,
      }),
    );

  return {
    type: 'user',
    text: payload.content ?? '',
    timestamp: toTimestamp(payload.received_at),
    contextFilePaths,
    ...(messageId ? { messageId } : {}),
    ...(dedupeKey ? { dedupeKey } : {}),
  };
};

export const upsertUserMessageByIdentity = (input: {
  context: AgentContext;
  userMessage: UserMessage;
  preserveExistingContextFilesWhenIncomingEmpty?: boolean;
}): boolean => {
  const { context, userMessage, preserveExistingContextFilesWhenIncomingEmpty = false } = input;
  const existingIndex = findExistingMessageIndex(
    context.conversation.messages,
    userMessage.messageId ?? '',
    userMessage.dedupeKey ?? '',
  );
  if (existingIndex >= 0) {
    const existing = context.conversation.messages[existingIndex];
    const existingContextFilePaths = existing.type === 'user' ? existing.contextFilePaths ?? [] : [];
    const incomingContextFilePaths = userMessage.contextFilePaths ?? [];
    const contextFilePaths =
      preserveExistingContextFilesWhenIncomingEmpty &&
      existingContextFilePaths.length > 0 &&
      incomingContextFilePaths.length === 0
        ? existingContextFilePaths
        : incomingContextFilePaths;

    const nextMessage: UserMessage = {
      ...existing,
      ...userMessage,
      contextFilePaths,
    };
    const changed = existing.type !== 'user'
      || existing.text !== nextMessage.text
      || existing.timestamp.getTime() !== nextMessage.timestamp.getTime()
      || existing.messageId !== nextMessage.messageId
      || existing.dedupeKey !== nextMessage.dedupeKey
      || !attachmentsEqual(existingContextFilePaths, contextFilePaths);
    if (changed) context.conversation.messages[existingIndex] = nextMessage;
    return changed;
  } else {
    context.conversation.messages.push(userMessage);
    return true;
  }
};
