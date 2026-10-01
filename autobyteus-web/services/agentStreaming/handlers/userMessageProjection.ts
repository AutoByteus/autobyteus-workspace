import { acceptedInputIdentityKey, normalizeAcceptedInputIdentity, type AgentInputStateDto } from '@autobyteus/agent-presentation-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { UserMessage } from '~/types/conversation';
import type { UserMessageProjectionPayload } from '../protocol/messageTypes';
import { hydrateContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';
import { isExecutableContextAttachment } from '~/utils/contextFiles/contextAttachmentSend';

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

const findExistingMessageIndex = (
  messages: AgentContext['conversation']['messages'], identity: UserMessage,
): number => {
  const key = acceptedInputIdentityKey(identity);
  return key === null ? -1 : messages.findIndex(message =>
    message.type === 'user' && acceptedInputIdentityKey(message) === key);
};

export const buildUserMessageFromProjectionPayload = (
  payload: UserMessageProjectionPayload,
): UserMessage => {
  const identity = normalizeAcceptedInputIdentity({ messageId: payload.message_id, dedupeKey: payload.dedupe_key });
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
    ...identity,
  };
};

export const upsertUserMessageByIdentity = (input: {
  context: AgentContext;
  userMessage: UserMessage;
  retainExistingNonExecutableContextFiles?: boolean;
}): boolean => {
  const { context, userMessage, retainExistingNonExecutableContextFiles = false } = input;
  const existingIndex = findExistingMessageIndex(
    context.conversation.messages,
    userMessage,
  );
  if (existingIndex >= 0) {
    const existing = context.conversation.messages[existingIndex];
    const existingContextFilePaths = existing.type === 'user' ? existing.contextFilePaths ?? [] : [];
    const incomingContextFilePaths = userMessage.contextFilePaths ?? [];
    const contextFilePaths = retainExistingNonExecutableContextFiles
      ? mergeMemberEchoContextFiles(incomingContextFilePaths, existingContextFilePaths)
      : incomingContextFilePaths;

    const nextMessage = {
      ...existing,
      ...userMessage,
      ...normalizeAcceptedInputIdentity({
        messageId: normalizeAcceptedInputIdentity(userMessage).messageId ?? (existing.type === 'user' ? existing.messageId : undefined),
        dedupeKey: normalizeAcceptedInputIdentity(userMessage).dedupeKey ?? (existing.type === 'user' ? existing.dedupeKey : undefined),
      }),
      contextFilePaths,
    };
    if (JSON.stringify(existing) === JSON.stringify(nextMessage)) return false;
    context.conversation.messages[existingIndex] = nextMessage;
  } else {
    context.conversation.messages.push(userMessage);
  }
  return true;
};

const getContextAttachmentIdentity = (
  attachment: NonNullable<UserMessage['contextFilePaths']>[number],
): string => attachment.id?.trim() || `${attachment.kind}:${attachment.locator}`;

const mergeMemberEchoContextFiles = (
  incoming: NonNullable<UserMessage['contextFilePaths']>,
  existing: NonNullable<UserMessage['contextFilePaths']>,
): NonNullable<UserMessage['contextFilePaths']> => {
  const merged = [
    ...incoming,
    ...existing.filter((attachment) => !isExecutableContextAttachment(attachment)),
  ];
  const seen = new Set<string>();
  return merged.filter((attachment) => {
    const identity = getContextAttachmentIdentity(attachment);
    if (seen.has(identity)) {
      return false;
    }
    seen.add(identity);
    return true;
  });
};

/** Live pending state overlays saved presentation, not an accepted-echo attachment replacement. */
export const upsertPendingUserMessage = (
  context: AgentContext, entry: AgentInputStateDto['entries'][number], runInstanceId: string,
): void => {
  const identity = normalizeAcceptedInputIdentity({ messageId: entry.message_id, dedupeKey: entry.dedupe_key });
  if (entry.sender_type !== 'user' || acceptedInputIdentityKey(identity) === null) return;
  const message = buildUserMessageFromProjectionPayload({
    content: entry.content, message_id: identity.messageId, dedupe_key: identity.dedupeKey,
  });
  message.contextFilePaths = entry.file_attachments.map(file => hydrateContextAttachment({
    locator: file.uri, type: file.file_type, displayName: file.file_name,
  }));
  message.pendingInput = { runInstanceId, state: entry.state };
  const index = findExistingMessageIndex(context.conversation.messages, message);
  const existing = context.conversation.messages[index];
  if (existing?.type !== 'user') {
    context.conversation.messages.push(message);
    return;
  }
  context.conversation.messages[index] = {
    ...existing, ...message,
    ...normalizeAcceptedInputIdentity({
      messageId: identity.messageId ?? existing.messageId,
      dedupeKey: identity.dedupeKey ?? existing.dedupeKey,
    }),
    timestamp: existing.timestamp,
    contextFilePaths: mergePendingContextFiles(existing.contextFilePaths ?? [], message.contextFilePaths ?? []),
  };
};

const mergePendingContextFiles = (
  existing: NonNullable<UserMessage['contextFilePaths']>, incoming: NonNullable<UserMessage['contextFilePaths']>,
): NonNullable<UserMessage['contextFilePaths']> => {
  const merged: NonNullable<UserMessage['contextFilePaths']> = [];
  for (const attachment of [...existing, ...incoming]) {
    const index = merged.findIndex(saved => saved.locator.trim() === attachment.locator.trim() && saved.type === attachment.type);
    if (index < 0) merged.push(attachment);
    else {
      const saved = merged[index];
      const generatedName = hydrateContextAttachment({ locator: saved.locator, type: saved.type }).displayName;
      if (!saved.displayName || saved.displayName === generatedName) {
        merged[index] = { ...saved, displayName: attachment.displayName || saved.displayName };
      }
    }
  }
  return merged;
};
