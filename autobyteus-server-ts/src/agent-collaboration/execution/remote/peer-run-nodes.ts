import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { DelegationIndex } from "../../delegation/delegation-index.js";
import { runReferenceOf } from "../task/task-execution-resource-port.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import type { ActiveCollaborationRootDirectory } from "../services/active-collaboration-root-directory.js";
import { localNodeMismatch, nodeMismatch, nodeNotPaired, nodeRequired, REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "./remote-refusal-codes.js";
import type { PeerNodeRef, RemoteRunChannelAccess } from "./remote-run-channel.js";

/**
 * autobyteus-587 RF-14 (SR-010 R2, SR-011): the one owner of "which node a run is on, as this node knows it" and of the
 * refusals for a call that does not name it. Reads only. Called by the router before any path of `send_message_to`, and by
 * `TaskDelegation`'s existing-copy path (a saved Task given to a copy) before anything else.
 * The node a run is on: the sender root's remote links first (a run it delegated to a peer, or, for a peer-started root,
 * its delegator), then the delegation tree's Task entries (`nodeId`), which name a peer run for any sender of this node.
 */
export class PeerRunNodes {
  constructor(private readonly dependencies: Readonly<{
    /** The sender's live root, whose links name the peer runs it holds (through the root boundary). */
    activeRoots: Pick<ActiveCollaborationRootDirectory, "resolve">;
    tree(): Pick<DelegationIndex, "runOfAgent" | "tasksOf">;
    /** This node's channel to its peers: whether a node is still a registered peer, and its name here. */
    channel: RemoteRunChannelAccess;
  }>) {}

  /** The peer node the run is on, as this node knows it (the sender root's links, then the Task entries); null otherwise. */
  async nodeOf(sender: CollaborationMemberExecutionIdentity | null, targetAgentRunId: string): Promise<string | null> {
    const target = targetAgentRunId.trim();
    const linked = sender ? this.dependencies.activeRoots.resolve(sender.root)?.remoteNodeOf?.(target) ?? null : null;
    if (linked) return linked;
    const tree = this.dependencies.tree();
    const run = await tree.runOfAgent(target);
    const reference = run ? runReferenceOf(run) : null;
    return reference ? tree.tasksOf(reference).find((entry) => entry.nodeId !== undefined)?.nodeId ?? null : null;
  }

  /**
   * RF-14 for one call to `target`, with the peer `node` names (null: no `node`):
   * - the run is on a peer: no `node` → `NODE_REQUIRED`; another `node` → `NODE_MISMATCH`, with the node it is on; its node
   *   no longer a registered peer → `NODE_NOT_PAIRED` (no node a call could name, CR-587-03);
   * - `localTarget` (the caller knows the run is this node's own, SR-011) and `node` given → `NODE_MISMATCH` naming this node;
   * - otherwise null (a run on the peer `node` names, or one this node does not place on any peer).
   */
  async check(input: Readonly<{
    sender: CollaborationMemberExecutionIdentity | null;
    targetAgentRunId: string;
    node: PeerNodeRef | null;
    localTarget?: boolean;
  }>): Promise<AgentOperationResult | null> {
    const nodeId = input.localTarget ? null : await this.nodeOf(input.sender, input.targetAgentRunId);
    if (nodeId === null) return input.localTarget && input.node ? localNodeMismatch(input.node.name) : null;
    if (input.node?.nodeId === nodeId) return null;
    const channel = this.dependencies.channel();
    if (!channel) return { accepted: false, code: REMOTE_REFUSAL.OFF, message: REMOTE_ROOT_REFUSAL_TEXT.off };
    const name = await channel.registeredPeerName(nodeId);
    if (name === null) return nodeNotPaired();
    return input.node ? nodeMismatch(name, input.node.name) : nodeRequired(name);
  }
}
