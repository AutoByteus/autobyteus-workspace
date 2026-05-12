import type { Conversation } from '~/types/conversation';

export const resolveFirstUserMessageSummary = (
  conversation: Pick<Conversation, 'messages'> | null | undefined,
): string | null => {
  const firstUserMessage = conversation?.messages?.find(
    message => message.type === 'user' && message.text?.trim().length > 0,
  );
  return firstUserMessage?.type === 'user'
    ? firstUserMessage.text.trim()
    : null;
};
