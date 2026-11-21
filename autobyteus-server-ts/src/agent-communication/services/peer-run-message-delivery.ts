import { ROOT_NOT_ACTIVE_MESSAGE } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CrossRunMessageDelivery } from "../../agent-collaboration/communication/cross-run-message-delivery.js";
import type { ActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";

/** One agent's message to an agent of a run on a peer node, by that node's ID. */
export type PeerRunMessage = Readonly<{
  sender: CollaborationMemberExecutionIdentity;
  senderDisplayName: string;
  nodeId: string;
  targetAgentRunId: string;
  content: string;
  messageType: string;
  referenceFiles: readonly string[];
}>;
export type PeerRunMessageDeliveryDependencies = Readonly<{
  /** This node's closed-Task admission of a peer run (AR-001). */
  crossRun: Pick<CrossRunMessageDelivery, "closedPeerRunRefusal">;
  activeRoots: Pick<ActiveCollaborationRootDirectory, "resolve">;
}>;

/**
 * DS-004's delivery to a peer run once its node is known: this node's closed-Task admission of that run, then the sender's
 * own root sends it to that node over the run's link. `send_message_to(node)` and a re-delegation's Task work
 * (autobyteus-591 DN-8) both deliver through it.
 */
export const deliverMessageToPeerRun = async (dependencies: PeerRunMessageDeliveryDependencies, message: PeerRunMessage): Promise<AgentOperationResult> => {
  const closed = await dependencies.crossRun.closedPeerRunRefusal({ nodeId: message.nodeId, agentRunId: message.targetAgentRunId });
  if (closed) return closed;
  const senderRoot = dependencies.activeRoots.resolve(message.sender.root);
  if (!senderRoot) return { accepted: false, code: "COLLABORATION_ROOT_NOT_ACTIVE", message: ROOT_NOT_ACTIVE_MESSAGE };
  const result = await senderRoot.deliverToPeerRun({
    sender: Object.freeze({ kind: "agent", identity: message.sender, displayName: message.senderDisplayName }),
    nodeId: message.nodeId, targetAgentRunId: message.targetAgentRunId, content: message.content, messageType: message.messageType,
    referenceFiles: message.referenceFiles,
  });
  return result.accepted ? { ...result, agentRunId: message.targetAgentRunId } : result;
};
