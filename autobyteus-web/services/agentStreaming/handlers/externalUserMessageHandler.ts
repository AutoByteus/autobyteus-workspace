import type { AgentContext } from '~/types/agent/AgentContext';
import type { ContextAttachmentType, UserMessage } from '~/types/conversation';
import type { ExternalUserMessagePayload } from '../protocol/messageTypes';
import { hydrateContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

const KNOWN_CONTEXT_FILE_TYPES = new Set<ContextAttachmentType>([
  'Audio',
  'Csv',
  'Docx',
  'Html',
  'Image',
  'Javascript',
  'Json',
  'Markdown',
  'Pdf',
  'Pptx',
  'Python',
  'Text',
  'Unknown',
  'Video',
  'Xlsx',
  'Xml',
]);

const toContextFileType = (value?: string | null): ContextAttachmentType => {
  if (value && KNOWN_CONTEXT_FILE_TYPES.has(value as ContextAttachmentType)) {
    return value as ContextAttachmentType;
  }
  return 'Unknown';
};

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

export const handleExternalUserMessage = (
  payload: ExternalUserMessagePayload,
  context: AgentContext,
): void => {
  const messageId = normalizeIdentity(payload.message_id);
  const dedupeKey = normalizeIdentity(payload.dedupe_key);
  const contextFilePaths = (payload.context_file_paths ?? [])
    .filter((item) => typeof item?.path === 'string' && item.path.trim().length > 0)
    .map((item) =>
      hydrateContextAttachment({
        locator: item.path,
        type: toContextFileType(item.type),
      }),
    );

  const userMessage: UserMessage = {
    type: 'user',
    text: payload.content ?? '',
    timestamp: toTimestamp(payload.received_at),
    contextFilePaths,
    ...(messageId ? { messageId } : {}),
    ...(dedupeKey ? { dedupeKey } : {}),
  };

  const existingIndex = findExistingMessageIndex(
    context.conversation.messages,
    messageId,
    dedupeKey,
  );
  if (existingIndex >= 0) {
    context.conversation.messages[existingIndex] = {
      ...context.conversation.messages[existingIndex],
      ...userMessage,
    };
  } else {
    context.conversation.messages.push(userMessage);
  }
  context.isSending = true;
};
