import { ROOT_NOT_ACTIVE_MESSAGE } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
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
  activeRoots: Pick<ActiveCollaborationRootDirectory, "resolve">;
}>;

/**
 * DS-004's delivery to a peer run once its node is known: the sender's own root sends it to that node over the run's link.
 * It checks no Task: its callers already admitted it (the router's `admitPeerRun`, autobyteus-591 DN-9; a re-delegation,
 * which opened the run's entry itself and awaited its node's "open", DN-8).
 */
export const deliverMessageToPeerRun = async (dependencies: PeerRunMessageDeliveryDependencies, message: PeerRunMessage): Promise<AgentOperationResult> => {
  const senderRoot = dependencies.activeRoots.resolve(message.sender.root);
  if (!senderRoot) return { accepted: false, code: "COLLABORATION_ROOT_NOT_ACTIVE", message: ROOT_NOT_ACTIVE_MESSAGE };
  const result = await senderRoot.deliverToPeerRun({
    sender: Object.freeze({ kind: "agent", identity: message.sender, displayName: message.senderDisplayName }),
    nodeId: message.nodeId, targetAgentRunId: message.targetAgentRunId, content: message.content, messageType: message.messageType,
    referenceFiles: message.referenceFiles,
  });
  return result.accepted ? { ...result, agentRunId: message.targetAgentRunId } : result;
};
