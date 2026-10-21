import type { RemoteTaskAgentExecution } from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { TaskAgentCoordinatingRun } from "../../../run-history/store/agent-run-metadata-types.js";
import { assertAgentTeamAddress } from "../../domain/agent-team-address.js";
import type { RemoteAgentPlacement } from "../../collaborators/catalog-delegation.js";
import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type {
  TaskExecutionActivationCommitResult,
  TaskExecutionActivationOperation,
  TaskExecutionActivationPlan,
  TaskExecutionActivationPreparation,
} from "../task/root-task-execution-adapter.js";
import type { SpawnTaskInput, TaskDelegationOutcome } from "../task/task-delegation-command.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "./remote-refusal-codes.js";
import { resolveRemoteRunChannel, type RemoteRunChannel } from "./remote-run-channel.js";
import { beginRemoteTaskActivation } from "./remote-task-activation.js";

/** A refusal before the Task link (by this node's channel or by the peer): nothing is left on this node. */
export class RemoteDelegationRefusedError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "RemoteDelegationRefusedError";
  }
}

/**
 * A root's remote delegations (DS-001): placement, planning and activation, apart from messaging. Each root
 * holds one; its task adapter's `planActivation` / `beginActivation` hand a remote placement to it, so it is
 * the one caller of `startDelegatedRun` (N-13). The root's unchanged `RootTaskExecutionLifecycle` runs it.
 */
export class RemoteDelegation {
  constructor(private readonly options: Readonly<{
    root: RootExecutionIdentity;
    channel?(): RemoteRunChannel | null;
  }>) {}

  /**
   * `delegate_task` with `node` (DEC-111): refuses a saved Task or files before anything is sent (REQ-110),
   * resolves the peer by this owner's label, and returns the remote placement for the root's lifecycle.
   */
  async delegationPlacement(input: SpawnTaskInput & Readonly<{ node: string }>): Promise<RemoteAgentPlacement | TaskDelegationOutcome> {
    if (input.task_id !== undefined) return { delegated: false, message: REMOTE_ROOT_REFUSAL_TEXT.savedTask };
    if (input.reference_files?.some((file) => file.trim())) return { delegated: false, message: REMOTE_ROOT_REFUSAL_TEXT.attachments };
    const channel = this.channel();
    if (!channel) return { delegated: false, message: REMOTE_ROOT_REFUSAL_TEXT.off };
    const peer = await channel.findPeer(input.node);
    if ("accepted" in peer) return { delegated: false, message: peer.message };
    let address;
    try { address = assertAgentTeamAddress(input.recipient_address.trim()); }
    catch { return { delegated: false, message: `"${input.recipient_address}" is not an address: an Agent's address begins with '/'.` }; }
    return Object.freeze({ kind: "remote_agent", address, peer, description: input.description });
  }

  /**
   * `delegate_task` with `node`: the remote placement, then the root's unchanged lifecycle with the input
   * without `node`. A delegated result names the peer (CM-11).
   */
  async delegate(
    input: SpawnTaskInput & Readonly<{ node: string }>,
    delegateWith: (input: SpawnTaskInput, placement: RemoteAgentPlacement) => Promise<TaskDelegationOutcome>,
  ): Promise<TaskDelegationOutcome> {
    const placement = await this.delegationPlacement(input);
    if (!("kind" in placement)) return placement;
    const { node: _node, ...local } = input;
    const outcome = await delegateWith(local as SpawnTaskInput, placement);
    return outcome.delegated ? { ...outcome, node: placement.peer.name } : outcome;
  }

  /**
   * Planning asks the peer to create the run, without work (SR-014): the peer's run ID becomes the plan's
   * target before the lifecycle links the Task. A refusal throws, so nothing is left on this node.
   */
  async planActivation<TPlacement>(input: TaskExecutionActivationPreparation<TPlacement>, placement: RemoteAgentPlacement): Promise<TaskExecutionActivationPlan<TPlacement>> {
    const channel = this.channel();
    if (!channel) throw new RemoteDelegationRefusedError(REMOTE_REFUSAL.OFF, REMOTE_ROOT_REFUSAL_TEXT.off);
    const started = await channel.startDelegatedRun({
      nodeId: placement.peer.nodeId,
      address: placement.address,
      delegatorAgentRunId: input.identity.agentRunId,
      coordinatingRun: this.coordinatingRun(),
    });
    if (!started.accepted) throw new RemoteDelegationRefusedError(started.code, started.message);
    const execution = Object.freeze({ agentRunId: started.agentRunId });
    return Object.freeze({ ...input, ownedAgentRunIds: Object.freeze([]), recipientAddress: placement.address,
      target: Object.freeze({ root: this.options.root, execution, ingressAgentRunId: started.agentRunId }) });
  }

  /** The remote activation of a planned remote delegation; `commitLink` is the root's one atomic tree write. */
  beginActivation<TPlacement>(
    plan: TaskExecutionActivationPlan<TPlacement>,
    placement: RemoteAgentPlacement,
    commitLink: (link: RemoteTaskAgentExecution) => Promise<TaskExecutionActivationCommitResult>,
  ): TaskExecutionActivationOperation {
    const link: RemoteTaskAgentExecution = Object.freeze({
      kind: "agent",
      address: placement.address,
      agentRunId: plan.target.ingressAgentRunId,
      nodeId: placement.peer.nodeId,
      delegatorAgentRunId: plan.identity.agentRunId,
      startedAt: plan.startedAt,
    });
    return beginRemoteTaskActivation({
      link,
      commitLink,
      sendWorkPacket: async () => {
        const channel = this.channel();
        if (!channel) return { accepted: false, code: REMOTE_REFUSAL.OFF, message: REMOTE_ROOT_REFUSAL_TEXT.off };
        return channel.deliverMessage({
          nodeId: link.nodeId, kind: "work_packet", senderAgentRunId: link.delegatorAgentRunId, targetAgentRunId: link.agentRunId,
          content: placement.description, messageType: "task_work_packet", createdAt: plan.startedAt,
        });
      },
    });
  }

  /** This root as the coordinating run a peer names on its side of a link (CM-7). */
  private coordinatingRun(): TaskAgentCoordinatingRun {
    return Object.freeze({ kind: this.options.root.rootSubjectKind, runId: this.options.root.rootRunId });
  }

  private channel(): RemoteRunChannel | null {
    return resolveRemoteRunChannel(this.options.channel);
  }
}
