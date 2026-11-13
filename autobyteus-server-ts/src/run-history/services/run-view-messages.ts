import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";

/** One run's records for its view's messages: its own log, and which agents are its own. */
export type RunMessageRecords = Readonly<{
  messages: readonly CollaborationCommunicationMessage[];
  isOwnAgent(agentRunId: string): boolean;
}>;

/** A run's view's messages (SR-072, SR-074): the composed list, and which agents are its tree's (its own and its open rows'). */
export type RunViewMessages = Readonly<{
  messages: readonly CollaborationCommunicationMessage[];
  isAgentOfTree(agentRunId: string): boolean;
}>;

/**
 * Base's rule of a run's message view (`task-agent-message-logs.ts` at 827f1e68dc, D-5): a message whose two agents are
 * in the tree, or one of whose agents is one of the run's own agents.
 */
export const isMessageOfView = (
  message: Pick<CollaborationCommunicationMessage, "senderAgentRunId" | "receiverAgentRunId">,
  isOwnAgent: (agentRunId: string) => boolean,
  isTreeAgent: (agentRunId: string) => boolean,
): boolean => (isTreeAgent(message.senderAgentRunId) && isTreeAgent(message.receiverAgentRunId))
  || isOwnAgent(message.senderAgentRunId) || isOwnAgent(message.receiverAgentRunId);

/** Base's composition of logs (827f1e68dc): each message once (by `messageId`), only those in view, in `createdAt` order. */
export const composeMessageLogs = (
  logs: readonly (readonly CollaborationCommunicationMessage[])[],
  inView: (message: CollaborationCommunicationMessage) => boolean,
): CollaborationCommunicationMessage[] => {
  const byId = new Map<string, CollaborationCommunicationMessage>();
  for (const log of logs) {
    for (const message of log) {
      if (byId.has(message.messageId) || !inView(message)) continue;
      byId.set(message.messageId, message);
    }
  }
  return [...byId.values()]
    .map((message, order) => ({ message, order }))
    .sort((left, right) => left.message.createdAt.localeCompare(right.message.createdAt) || left.order - right.order)
    .map(({ message }) => message);
};

/**
 * The messages of the view of run X (autobyteus-461 SR-072, SR-074; rule 1): X's own log composed with the own log of
 * every run of its open subtree, at every depth, as base composed its root's log with its open copies'. One rule, base's
 * `isMessageOfView(message, own(X), tree(X))`, the same live (`RunMessagesFeed`): `tree(X)` is X's agents and those of its
 * open rows. A closed run's messages with X's own agents stay, in X's own log (DEC-001). A message between two runs is
 * kept once. A run whose records cannot be read is left out, with a warning naming it. `below` is the set taken at one
 * moment, the read's start (ARCH-REV-048).
 */
export const composeRunViewMessages = (input: Readonly<{
  own: RunMessageRecords;
  below: readonly Readonly<{ run: string; records: RunMessageRecords | Error }>[];
}>): RunViewMessages => {
  const readable = input.below.flatMap((entry) => {
    if (!(entry.records instanceof Error)) return [entry.records];
    console.warn(`The messages of run '${entry.run}' are left out of its delegator's view: ${entry.records.message}`);
    return [];
  });
  const isAgentOfTree = (id: string) => input.own.isOwnAgent(id) || readable.some((records) => records.isOwnAgent(id));
  const messages = composeMessageLogs([input.own.messages, ...readable.map((records) => records.messages)],
    (message) => isMessageOfView(message, input.own.isOwnAgent, isAgentOfTree));
  return Object.freeze({ messages, isAgentOfTree });
};
