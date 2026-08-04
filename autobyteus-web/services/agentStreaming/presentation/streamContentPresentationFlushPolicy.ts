import type { ServerMessageType } from '../protocol';

/**
 * Canonical lifecycle companions update control state immediately, but they do
 * not change the semantic ordering of content presentation. Real stream
 * boundaries still flush through the default branch.
 */
export const shouldFlushPendingContentBefore = (
  messageType: ServerMessageType,
): boolean => messageType !== 'AGENT_STATUS';
