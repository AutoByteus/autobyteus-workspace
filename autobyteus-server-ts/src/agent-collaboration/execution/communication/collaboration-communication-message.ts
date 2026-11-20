/**
 * The other agent of a message, recorded with a line whose other agent is outside the committing run's tree
 * (autobyteus-565 REQ-007): its address in its own run when known, and its node ID when it is on another node. Older
 * lines have none, and a released reader ignores the key (Data Migration Guideline §3).
 */
export type MessageCounterpart = Readonly<{ address: string | null; nodeId: string | null }>;

export type CollaborationCommunicationMessage = Readonly<{
  messageId: string;
  senderAgentRunId: string;
  receiverAgentRunId: string;
  content: string;
  messageType: string;
  referenceFiles: readonly string[];
  createdAt: string;
  /** This log's record of the other agent, on a line with an unrelated local run or another node (autobyteus-565). */
  counterpart?: MessageCounterpart;
}>;

/** The seven fields every message has, without this log's own `counterpart` record (what views and events carry). */
export const messageFields = (message: CollaborationCommunicationMessage): CollaborationCommunicationMessage => Object.freeze({
  messageId: message.messageId,
  senderAgentRunId: message.senderAgentRunId,
  receiverAgentRunId: message.receiverAgentRunId,
  content: message.content,
  messageType: message.messageType,
  referenceFiles: message.referenceFiles,
  createdAt: message.createdAt,
});
