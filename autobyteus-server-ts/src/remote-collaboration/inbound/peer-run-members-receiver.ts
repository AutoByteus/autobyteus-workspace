import type { TaskExecutionResourceService } from "../../projects/services/task-execution-resource-service.js";
import type { PeerHandlerRefusal } from "../channel/peer-gateway.js";
import type { PeerNode } from "../domain/peer-node.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import type { PeerRunMembersRequest } from "../domain/remote-requests.js";

const refusal = (code: string, message: string): PeerHandlerRefusal => Object.freeze({ accepted: false, code, message });

/**
 * FU-003 (org-teams-follow-definition DS-007): this node, the delegating node, hears that a Team run its delegation started
 * on the calling node changed its members (that node's committed change). Only the caller's own run: a Task entry here must
 * name that Team run on the calling node (the stored link); then every such entry takes the members and coordinator, and
 * the tree and its rows follow. Idempotent: the same members again change nothing.
 */
export class PeerRunMembersReceiver {
  constructor(private readonly dependencies: Readonly<{ tasks: Pick<TaskExecutionResourceService, "updatePeerRunMembers"> }>) {}

  async apply(request: PeerRunMembersRequest, from: PeerNode): Promise<Readonly<{ accepted: true }> | PeerHandlerRefusal> {
    if (request.run.kind !== "agent_team") return refusal(REMOTE_REFUSAL.TARGET_NOT_FOUND, "Only a Team run has members.");
    const coordinator = request.members.find((member) => member.address === request.coordinatorAddress);
    if (!coordinator) return refusal(REMOTE_REFUSAL.TARGET_NOT_FOUND, "The Team's coordinator is not among its members.");
    const outcome = await this.dependencies.tasks.updatePeerRunMembers({ teamRunId: request.run.runId }, from.nodeId, request.members, coordinator.agentRunId);
    if (outcome === "not_linked") return refusal(REMOTE_REFUSAL.TARGET_NOT_PERMITTED, "No Task of this node names that run on the calling node.");
    return Object.freeze({ accepted: true as const });
  }
}
