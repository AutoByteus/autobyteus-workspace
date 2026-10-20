import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";

/**
 * A root's public view shows the messages between its own agents. A message with a remote endpoint (a run on
 * a peer node, CM-11) stays in the root's message state and logs, but is kept out of the run view (S3): the
 * local agent's own stream shows it, and the views require both endpoints to be agents of the tree.
 * The view snapshots filter with this rule; live, the root never publishes such a message to its view
 * stream (`publishToRootView`), so the stream's change sequence has no gap.
 */
export const isPublicMessage = (
  message: Pick<CollaborationCommunicationMessage, "senderAgentRunId" | "receiverAgentRunId">,
  isAgentOfTree: (agentRunId: string) => boolean,
): boolean => isAgentOfTree(message.senderAgentRunId) && isAgentOfTree(message.receiverAgentRunId);
