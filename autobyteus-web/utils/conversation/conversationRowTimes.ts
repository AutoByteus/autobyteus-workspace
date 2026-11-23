import type { Conversation } from '~/types/conversation';

/**
 * The conversation's `updatedAt` (autobyteus-628 D-3): the latest time the node recorded for one of its rows, never the
 * viewer's clock. A row without a time yet (an own send the node has not confirmed) is skipped; with no timed row the
 * conversation keeps the time it has.
 */
export const refreshConversationUpdatedAt = (conversation: Conversation): void => {
  let latest = Number.NEGATIVE_INFINITY;
  for (const message of conversation.messages) {
    const time = message.timestamp?.getTime();
    if (time !== undefined && Number.isFinite(time) && time > latest) latest = time;
  }
  if (Number.isFinite(latest)) conversation.updatedAt = new Date(latest).toISOString();
};
