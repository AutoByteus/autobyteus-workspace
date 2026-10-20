import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { RemoteTaskAgentExecution } from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegatedFrom, TaskAgentCoordinatingRun } from "../../../run-history/store/agent-run-metadata-types.js";
import { assertAgentTeamAddress, getAgentTeamAddressBasename } from "../../domain/agent-team-address.js";
import type { RemoteAgentPlacement } from "../../collaborators/catalog-delegation.js";
import type { CollaborationCommunicationMessage } from "../communication/collaboration-communication-message.js";
import type { RootCommunicationEngine } from "../communication/root-communication-engine.js";
import type { CollaborationMemberExecutionIdentity, RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type {
  TaskExecutionActivationCommitResult,
  TaskExecutionActivationOperation,
  TaskExecutionActivationPlan,
  TaskExecutionActivationPreparation,
} from "../task/root-task-execution-adapter.js";
import type { SpawnTaskInput, TaskDelegationOutcome } from "../task/task-delegation-command.js";
import type { TaskExecutionReference } from "../task/task-execution-reference.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "./remote-refusal-codes.js";
import { findProcessRemoteRunChannel, type RemoteRunChannel } from "./remote-run-channel.js";
import type { RemoteRunReference } from "./remote-run-reference.js";
import { beginRemoteTaskActivation } from "./remote-task-activation.js";

/** A message a peer node sends to this root's linked agent, as its peer gateway admitted it. */
export type RemoteInboundMessage = Readonly<{
  fromNodeId: string;
  /** This owner's label for the sending node, named in the receiver's header. */
  fromNodeName: string;
  message: CollaborationCommunicationMessage;
}>;

/** The work packet that starts a remote run on its own node (N-6); not a message-log entry. */
export type RemoteInboundWorkPacket = Readonly<{
  fromNodeId: string;
  fromNodeName: string;
  senderAgentRunId: string;
  targetAgentRunId: string;
  description: string;
}>;

/**
 * One remote endpoint of a root: the run on the peer and the one local agent it is paired with (CM-11).
 * On the delegating node the remote run is the endpoint and the pair is its delegator; on the receiving node
 * the delegator is the endpoint and the pair is the root's host (the remote run itself).
 */
export type RemoteEndpoint = Readonly<{
  side: "delegating" | "receiving";
  reference: RemoteRunReference;
  localAgentRunId: string;
  /** The name the local agent sees in results: the published address's name, or the run ID. */
  displayName: string;
  /** Receiving side: the delegating node's run that holds the link, echoed on every message to it. */
  coordinatingRun: TaskAgentCoordinatingRun | null;
}>;

/** How a run-ID message from a local agent is routed: today's local path, the link, or a refusal. */
export type RemoteRoute =
  | Readonly<{ kind: "local" }>
  | Readonly<{ kind: "remote"; endpoint: RemoteEndpoint }>
  | Readonly<{ kind: "refused"; result: AgentOperationResult }>;

export type RemoteRunLinksOptions = Readonly<{
  root: RootExecutionIdentity;
  /** Delegating side: the root's remote links (the tree's in-memory `remoteTaskExecutions`), read at call time. */
  remoteRuns(): readonly RemoteTaskAgentExecution[];
  /** Receiving side: the back-link of a root whose host a peer delegated to (`delegatedFrom`); `null` otherwise. */
  backLink?: Readonly<{ hostRunId: string; delegatedFrom: DelegatedFrom }> | null;
  channel?(): RemoteRunChannel | null;
}>;

const refused = (code: string, message: string): Readonly<{ kind: "refused"; result: AgentOperationResult }> =>
  Object.freeze({ kind: "refused", result: { accepted: false, code, message } });

/** A refusal before the Task link (by this node's channel or by the peer): nothing is left on this node. */
export class RemoteDelegationRefusedError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "RemoteDelegationRefusedError";
  }
}

/**
 * A root's remote endpoints and the messaging and delegation over them (design § Ownership Map). Every
 * root kind holds one. It is the only reader of the tree's `remoteTaskExecutions` outside the store
 * (AR-001), and it reaches messages only through the engine's `sendToRemote` / `acceptFromRemote` (AR-002).
 */
export class RemoteRunLinks {
  constructor(private readonly options: RemoteRunLinksOptions) {}

  endpoints(): readonly RemoteEndpoint[] {
    const back = this.options.backLink;
    const delegated = this.options.remoteRuns().map((link): RemoteEndpoint => Object.freeze({
      side: "delegating",
      reference: Object.freeze({ nodeId: link.nodeId, agentRunId: link.agentRunId }),
      localAgentRunId: link.delegatorAgentRunId,
      displayName: getAgentTeamAddressBasename(link.address) ?? link.agentRunId,
      coordinatingRun: null,
    }));
    return back ? [...delegated, Object.freeze({
      side: "receiving" as const,
      reference: Object.freeze({ nodeId: back.delegatedFrom.nodeId, agentRunId: back.delegatedFrom.delegatorAgentRunId }),
      localAgentRunId: back.hostRunId,
      displayName: back.delegatedFrom.delegatorAgentRunId,
      coordinatingRun: back.delegatedFrom.coordinatingRun,
    })] : delegated;
  }

  /** Run-ID membership: the run ID names a remote endpoint of this root (not a hosted agent). */
  has(agentRunId: string): boolean {
    return this.endpoints().some((endpoint) => endpoint.reference.agentRunId === agentRunId);
  }

  /** The pair rule (DEC-105): only the paired local agent may message a remote endpoint. */
  route(senderAgentRunId: string, targetAgentRunId: string): RemoteRoute {
    const endpoint = this.endpoints().find((candidate) => candidate.reference.agentRunId === targetAgentRunId);
    if (!endpoint) return Object.freeze({ kind: "local" });
    return endpoint.localAgentRunId === senderAgentRunId
      ? Object.freeze({ kind: "remote", endpoint })
      : refused(REMOTE_REFUSAL.TARGET_NOT_PERMITTED, REMOTE_ROOT_REFUSAL_TEXT.notPermitted);
  }

  /** The inbound link check: the sender is this root's endpoint on that peer, and the target its paired agent. */
  inboundEndpoint(fromNodeId: string, senderAgentRunId: string, targetAgentRunId: string): RemoteEndpoint | null {
    return this.endpoints().find((endpoint) => endpoint.reference.nodeId === fromNodeId
      && endpoint.reference.agentRunId === senderAgentRunId && endpoint.localAgentRunId === targetAgentRunId) ?? null;
  }

  /**
   * Task ownership of a remote endpoint's messages: on the delegating node the remote run belongs to the Task
   * its link was recorded under (`{agentRunId}`); on the receiving node the delegator has no Task here (N-11).
   */
  ownershipChainFor(agentRunId: string): readonly TaskExecutionReference[] {
    const endpoint = this.endpoints().find((candidate) => candidate.reference.agentRunId === agentRunId);
    return endpoint?.side === "delegating" ? [Object.freeze({ agentRunId })] : [];
  }

  /** AR-003: a saved Task is never given to a remote run by its ID; refused before any Task change. */
  refuseExistingCopy(copy: TaskExecutionReference): TaskDelegationOutcome | null {
    return "agentRunId" in copy && this.has(copy.agentRunId)
      ? { delegated: false, message: REMOTE_ROOT_REFUSAL_TEXT.savedTask }
      : null;
  }

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
    catch { return { delegated: false, message: `"${input.recipient_address}" is not an address: a published Agent's address begins with '/'.` }; }
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
   * An inbound message for this root (DS-002 on the receiving node, DS-003 on the delegating node): the link
   * check, then the paired local agent is woken or restored by the root (`wake`, N-8), then the engine admits it.
   */
  async accept(engine: RootCommunicationEngine, input: RemoteInboundMessage, root: Readonly<{
    receiver(agentRunId: string): Readonly<{ identity: CollaborationMemberExecutionIdentity; displayName: string }> | null;
    wake(agentRunId: string, operation: () => Promise<AgentOperationResult>): Promise<AgentOperationResult>;
  }>): Promise<AgentOperationResult> {
    const endpoint = this.inboundEndpoint(input.fromNodeId, input.message.senderAgentRunId, input.message.receiverAgentRunId);
    const receiver = endpoint ? root.receiver(endpoint.localAgentRunId) : null;
    if (!endpoint || !receiver) return { accepted: false, code: REMOTE_REFUSAL.TARGET_NOT_PERMITTED, message: "That run is not linked with the sender." };
    return root.wake(receiver.identity.agentRunId, () => engine.acceptFromRemote({
      message: input.message, receiverIdentity: receiver.identity, receiverDisplayName: receiver.displayName, senderNodeName: input.fromNodeName,
    }));
  }

  /**
   * Planning a remote delegation asks the peer to create the run, without work (SR-014): the peer's run ID
   * becomes the plan's target before the lifecycle links the Task. A refusal throws (nothing is left here).
   */
  async planActivation<TPlacement>(input: TaskExecutionActivationPreparation<TPlacement>, placement: RemoteAgentPlacement): Promise<TaskExecutionActivationPlan<TPlacement>> {
    const channel = this.channel();
    if (!channel) throw new RemoteDelegationRefusedError(REMOTE_REFUSAL.OFF, REMOTE_ROOT_REFUSAL_TEXT.off);
    const started = await channel.startDelegatedRun({
      nodeId: placement.peer.nodeId,
      publishedAddress: placement.address,
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

  /**
   * DS-002 / DS-003: a message from the paired local agent to its remote endpoint, through the engine. The
   * result names the endpoint's node (CM-11).
   */
  async send(engine: RootCommunicationEngine, endpoint: RemoteEndpoint, input: Readonly<{
    senderIdentity: CollaborationMemberExecutionIdentity;
    content: string;
    messageType?: string | null;
    referenceFiles?: readonly string[] | null;
  }>): Promise<AgentOperationResult> {
    const result = await engine.sendToRemote({
      senderIdentity: input.senderIdentity,
      remoteAgentRunId: endpoint.reference.agentRunId,
      receiverDisplayName: endpoint.displayName,
      content: input.content,
      messageType: input.messageType,
      referenceFiles: input.referenceFiles,
    }, (message) => this.transmit(endpoint, message));
    if (!result.accepted) return result;
    const node = await this.peerName(endpoint.reference.nodeId);
    return { ...result, message: `Delivered message to ${endpoint.reference.agentRunId} on node "${node}".` };
  }

  /** The node name a local agent sees for a remote endpoint (this owner's label for the peer). */
  async peerName(nodeId: string): Promise<string> {
    return (await this.channel()?.peerName(nodeId)) ?? nodeId;
  }

  private async transmit(endpoint: RemoteEndpoint, message: CollaborationCommunicationMessage) {
    const channel = this.channel();
    if (!channel) return { accepted: false as const, code: REMOTE_REFUSAL.OFF, message: REMOTE_ROOT_REFUSAL_TEXT.off };
    return channel.deliverMessage({
      nodeId: endpoint.reference.nodeId,
      kind: "message",
      messageId: message.messageId,
      senderAgentRunId: message.senderAgentRunId,
      targetAgentRunId: message.receiverAgentRunId,
      ...(endpoint.coordinatingRun ? { coordinatingRun: endpoint.coordinatingRun } : {}),
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt,
    });
  }

  /** This root as the coordinating run a peer names on its side of a link (CM-7). */
  private coordinatingRun(): TaskAgentCoordinatingRun {
    return Object.freeze({ kind: this.options.root.rootSubjectKind, runId: this.options.root.rootRunId });
  }

  private channel(): RemoteRunChannel | null {
    return this.options.channel ? this.options.channel() : findProcessRemoteRunChannel();
  }
}
