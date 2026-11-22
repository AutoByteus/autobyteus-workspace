import type { RunOwnAgentsReader } from "../../run-history/store/run-own-agents-reader.js";
import { MESSAGE_DELIVERED_TEXT, type AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { DelegationIndex } from "../delegation/delegation-index.js";
import type { CollaborationCommunicationMessage, MessageCounterpart } from "../execution/communication/collaboration-communication-message.js";
import { isRecordedRunRefusal, type PreparedRunSend, type RecordedRunRefusal } from "../execution/communication/root-communication-engine.js";
import {
  rootExecutionIdentityKey,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../execution/domain/root-execution-identity.js";
import { ROOT_NOT_ACTIVE_MESSAGE, TaskDelegationError } from "../execution/task/task-delegation-command.js";
import type { DelegatedRunRestorability } from "../execution/task/delegated-run-restorability.js";
import {
  ASSIGNER_ONLY_REACTIVATION_MESSAGE,
  runReferenceOf,
  taskReactivationRejectionCode,
  type TaskExecutionResourcePort,
} from "../execution/task/task-execution-resource-port.js";
import type { RunningAgents } from "../running/running-agents.js";
import type { PeerRunStateNotices } from "../execution/remote/peer-run-state-notices.js";
import type { CrossRunAcceptInput } from "./cross-run-accept-input.js";

/** The sender's root: it prepares a message to another run and records it in its own log once delivered. */
export type CrossRunSenderRoot = Readonly<{
  prepareSendToRun(input: Readonly<{ senderIdentity: CollaborationMemberExecutionIdentity; receiverAgentRunId: string; content: string;
    messageType?: string | null; referenceFiles?: readonly string[] | null }>): PreparedRunSend;
  /** `counterpart`: the receiver, recorded on the sender's line when no Task relates the two runs (autobyteus-565). */
  commitSentToRun(message: CollaborationCommunicationMessage, counterpart: MessageCounterpart | null): Promise<void>;
}>;
/** The receiver's root: in its gate it re-checks, writes its own log, and wakes and delivers (restored when stopped). */
export type CrossRunReceiverRoot = Readonly<{
  acceptFromRun(input: CrossRunAcceptInput): Promise<AgentOperationResult | RecordedRunRefusal>;
}>;

export type CrossRunMessageInput = Readonly<{
  sender: CollaborationMemberExecutionIdentity;
  senderDisplayName: string;
  targetAgentRunId: string;
  content: string;
  messageType: string;
  referenceFiles: readonly string[];
  /** How the sender named the receiver: its address (§2.3 step 2), else its run ID. */
  shownAs?: string;
}>;

/** Base's refusal of the assigner's message to a run whose Task was deleted (`task-assignment-eligibility.ts`, REQ-009). */
export const DELETED_TASK_REFUSAL = "The Task was deleted, so its task agent cannot continue.";
const refusal = (code: string, message: string): AgentOperationResult => ({ accepted: false, code, message });
/** A refusal after this call reopened the receiver's assignment: its Task is open again, the message was not delivered. */
/** A refusal after this call reopened the receiver's assignment (local, or a peer run on the router's `node` path, SR-010 R1). */
export const notDeliveredAfterReopen = (refused: AgentOperationResult, targetAgentRunId: string): AgentOperationResult => ({ ...refused,
  message: `${refused.message ?? "The message was not delivered."} ${targetAgentRunId} continues with its conversation (its Task is open again) but did not receive this message; send it again.` });
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
const sameRun = (a: RootExecutionIdentity, b: RootExecutionIdentity): boolean => rootExecutionIdentityKey(a) === rootExecutionIdentityKey(b);

/**
 * The admission of a message between two runs (autobyteus-492): `related` by today's Task rule (`canMessage`), `reopened`
 * by the assigner's continuation, or `unrelated`: every other pair of runs, which the run ID alone admits while the
 * receiver runs (CM-13). A run whose Tasks are all closed throws `TASK_AGENT_RESOURCE_CLOSED`, whoever sends.
 */
type Admission = "related" | "reopened" | "unrelated";
/**
 * The admission of a message to a run on a peer node (autobyteus-591 DN-9): `not_peer` when no Task entry here names the
 * target's run on a peer, `admitted`, or the refusal to answer.
 */
/** `reopened`: admitted after this call reopened the run's assignment and its node confirmed "open" (a later refusal says so). */
export type PeerRunAdmission = "not_peer" | "admitted" | "reopened" | AgentOperationResult;
const byLinkedAt = <T extends Readonly<{ linkedAt: string }>>(a: T, b: T): number => a.linkedAt.localeCompare(b.linkedAt);

/**
 * autobyteus-591 DN-9: whether the sender may continue a closed peer run, as locally: its last entry is `assigned` and the
 * sender is that entry's delegator (the Task side then decides whether the Task allows it).
 */
const continuesClosedPeerRun = (entries: readonly Readonly<{ role: string; delegatedFrom: Readonly<{ delegatorAgentRunId: string }> }>[],
  senderAgentRunId: string | null): boolean => {
  const last = entries.at(-1);
  return !!last && last.role === "assigned" && senderAgentRunId !== null && last.delegatedFrom.delegatorAgentRunId === senderAgentRunId;
};
/** A Task-side refusal (a coded rejection) as the message's answer; any other error is thrown. */
const taskRefusal = (error: unknown): AgentOperationResult => {
  const code = error instanceof TaskDelegationError ? error.code : taskReactivationRejectionCode(error);
  if (!code) throw error;
  return refusal(code, errorMessage(error));
};

/**
 * `send_message_to(run ID)` to an agent of another run on this node (design DS-2, `CrossRunMessageDelivery`). It owns
 * the order of one message between two runs, and the Task admission of a message to a run (the `DelegationIndex`'s rule,
 * `canMessage`, contract §2.2):
 * 1. the receiver's run (`runOfAgent`), from memory (nothing is resumed to find it, also after a restart);
 * 2. admission: the rule, else the assigner's continuation of the receiver's last entry (it must be an `assigned` entry
 *    the sender assigned, whose Task is not DONE or CANCELLED: the Task side reopens it), else closed when the receiver's
 *    Tasks are all closed, else unrelated (autobyteus-492 DS-003: the run ID is the address);
 * 3. the sender's root prepares the message (no state change), the receiver's root accepts it in its gate (it re-checks
 *    "open" from the Task side, writes its own log, wakes and delivers), then the sender's root writes its own log with
 *    the same message ID. A refusal writes nothing (CM-9, AR-013), except one after the receiver's durable write: the
 *    receiver's log keeps it (REQ-012), so the sender's records it too (SR-076, TC-13).
 * A related receiver is restored when it is stopped (DEC-001 of autobyteus-461); an unrelated one is delivered only while
 * it runs (`RunningAgents`), in its live root, and is never woken (DEC-003): otherwise `null`, and the router answers
 * "not running". An agent no Task names is unrelated, except an agent of a delegated run whose Task was deleted, messaged
 * by the delegator its run's own file names: base's `TASK_NOT_FOUND` (CR-461-058, CR-461-065, SR-071: base's texts).
 * A run on a peer node is not this route's (`null`): the router checked its node (`PeerRunNodes`, autobyteus-587 RF-14) and
 * its Task admission (`admitPeerRun`, autobyteus-591 DN-9) first, and reaches it with `node` only.
 */
export class CrossRunMessageDelivery {
  constructor(private readonly dependencies: Readonly<{
    tree(): Pick<DelegationIndex, "runOfAgent" | "canMessage" | "tasksOf">;
    tasks(): Pick<TaskExecutionResourcePort, "isOpen" | "assertReopenable" | "reopenAssignment">;
    /** The sender's root (it is running: its agent is sending). */
    senderRoot(run: RootExecutionIdentity): CrossRunSenderRoot | null;
    /** The receiver's root, restored when it is stopped (DEC-001: a message wakes a stopped run). */
    receiverRoot(run: RootExecutionIdentity): Promise<CrossRunReceiverRoot | null>;
    /** The receiver's active root as it is now, never restored (an unrelated message, DS-003, G-2). */
    activeReceiverRoot(run: RootExecutionIdentity): CrossRunReceiverRoot | null;
    /** Which live root runs an agent now (autobyteus-492). */
    runningAgents: Pick<RunningAgents, "rootOf">;
    /** The sender's own address when, from the receiver, it reaches the sender (contract §2.4); null otherwise. */
    senderAddress(input: Readonly<{ sender: CollaborationMemberExecutionIdentity; receiverRun: RootExecutionIdentity; receiverAgentRunId: string }>): Promise<string | null>;
    /** The own record of the delegation of the run an agent is in (its file's `delegatedFrom`): an agent run's, or its team run's. */
    runFiles: Pick<RunOwnAgentsReader, "delegationOfAgent">;
    /** Whether a delegated run can be restored (CR-461-070): asked before the receiver's root is resolved or restored. */
    restorability: Pick<DelegatedRunRestorability, "refusal">;
    /** What a peer run's node is told of its delegation state, in the run's order (autobyteus-591 DN-1b, DN-9). */
    peerNotices: Pick<PeerRunStateNotices, "changed">;
  }>) {}

  async route(input: CrossRunMessageInput): Promise<AgentOperationResult | null> {
    const tree = this.dependencies.tree();
    const receiverRun = await tree.runOfAgent(input.targetAgentRunId);
    const senderRun = input.sender.root;
    if (!receiverRun) return await this.deletedTaskRefusal(input) ?? this.deliverUnrelated(input);
    if (sameRun(receiverRun, senderRun)) return null;
    // A run on a peer node is the router's `node` path (its node checked by `PeerRunNodes` before any path), not this route's.
    const receiverReference = runReferenceOf(receiverRun);
    if (receiverReference && tree.tasksOf(receiverReference).some((entry) => entry.nodeId !== undefined)) return null;
    let admission: Admission;
    try {
      admission = await this.admit(tree, senderRun, receiverRun, input.sender.agentRunId);
    } catch (error) {
      return taskRefusal(error);
    }
    if (admission === "unrelated") return this.deliverUnrelated(input);
    const reactivated = admission === "reopened";
    const sender = this.dependencies.senderRoot(senderRun);
    if (!sender) return refusal("COLLABORATION_ROOT_NOT_ACTIVE", ROOT_NOT_ACTIVE_MESSAGE);
    const prepared = sender.prepareSendToRun({ senderIdentity: input.sender, receiverAgentRunId: input.targetAgentRunId, content: input.content,
      messageType: input.messageType, referenceFiles: input.referenceFiles });
    if (!prepared.ok) return prepared.refusal;
    // Base checked a released copy before restoring it (CR-461-070): its entry agent's saved conversation must continue.
    // A run this call reopened was checked before the reopen (`admit`, CR-461-072).
    const unrestorable = reactivated ? null : await this.dependencies.restorability.refusal(receiverRun);
    if (unrestorable) return unrestorable;
    let receiver: CrossRunReceiverRoot | null;
    try { receiver = await this.dependencies.receiverRoot(receiverRun); }
    catch (error) { return refusal("TARGET_RUN_NOT_AVAILABLE", `The run of ${input.targetAgentRunId} could not be resumed: ${errorMessage(error)}`); }
    // A run with no files (deleted while this message was past the tree): R-11, as for any unknown run ID (SR-067).
    if (!receiver) return refusal("TARGET_AGENT_RUN_NOT_ACTIVE", `No running agent has the run id '${input.targetAgentRunId}', so the message was not sent.`);
    return this.exchange(input, sender, prepared.message, receiverRun, receiver, { reactivated, related: true });
  }

  /**
   * autobyteus-591 DN-9: the Task admission of every message to a run on a peer node that this node's Task entries name,
   * asked once by the router on its `node` path, after the files are on that node (autobyteus-587 SR-010 R1), so nothing is
   * reopened for a call whose files are refused. As `admit`'s rule for a local run:
   * 1. some entry of the run is open: admitted;
   * 2. its last entry is `assigned`, closed, and the sender is its delegator: the assigner's continuation. The Task side
   *    checks and reopens the entry (no local restorability check: the run is its node's, CM-10), then its node is told
   *    it is open, after any notice in flight (DN-1b); `reopened` once its node confirmed. Not confirmed: the entry stays
   *    open, "open" stays owed, and the answer is the notice's refusal (for an unreachable node, `PEER_UNREACHABLE`);
   * 3. otherwise `TASK_AGENT_RESOURCE_CLOSED`, whoever sends (DEC-011).
   * Runs outside any root's gate, so waiting for the node never holds one.
   */
  async admitPeerRun(input: Readonly<{ agentRunId: string; senderAgentRunId: string | null }>): Promise<PeerRunAdmission> {
    const tree = this.dependencies.tree();
    const run = await tree.runOfAgent(input.agentRunId);
    const reference = run ? runReferenceOf(run) : null;
    const entries = reference ? tree.tasksOf(reference).filter((entry) => entry.nodeId !== undefined).sort(byLinkedAt) : [];
    if (!reference || !entries.length) return "not_peer";
    if (entries.some((entry) => entry.open)) return "admitted";
    const last = entries.at(-1)!;
    if (!continuesClosedPeerRun(entries, input.senderAgentRunId)) return refusal("TASK_AGENT_RESOURCE_CLOSED", ASSIGNER_ONLY_REACTIVATION_MESSAGE);
    const reopen = { execution: reference, requestedBy: input.senderAgentRunId! };
    try {
      await this.dependencies.tasks().assertReopenable(reopen);
      await this.dependencies.tasks().reopenAssignment(reopen);
    } catch (error) {
      return taskRefusal(error);
    }
    const noticed = await this.dependencies.peerNotices.changed({ run: reference, nodeId: last.nodeId! });
    return noticed.confirmed ? "reopened" : notDeliveredAfterReopen(refusal(noticed.code, noticed.message), input.agentRunId);
  }

  /**
   * DS-003: a message no Task relates to the two runs. Delivered only while the receiver runs, in its live root (never
   * restored, DEC-003); `null` when no live root of this node runs it (the router answers "not running").
   */
  private async deliverUnrelated(input: CrossRunMessageInput): Promise<AgentOperationResult | null> {
    const running = this.dependencies.runningAgents.rootOf(input.targetAgentRunId);
    if (!running || sameRun(running.root, input.sender.root)) return null;
    const receiver = this.dependencies.activeReceiverRoot(running.root);
    if (!receiver) return null;
    const sender = this.dependencies.senderRoot(input.sender.root);
    if (!sender) return refusal("COLLABORATION_ROOT_NOT_ACTIVE", ROOT_NOT_ACTIVE_MESSAGE);
    const prepared = sender.prepareSendToRun({ senderIdentity: input.sender, receiverAgentRunId: input.targetAgentRunId, content: input.content,
      messageType: input.messageType, referenceFiles: input.referenceFiles });
    if (!prepared.ok) return prepared.refusal;
    return this.exchange(input, sender, prepared.message, running.root, receiver, { reactivated: false, related: false });
  }

  /**
   * Step 3: the receiver's root accepts in its gate (its log first), then the sender's root records it (CM-9). The message's
   * relation (related or unrelated) goes with it: `MessageViewScope` decides from it which views show it (autobyteus-565).
   * An unrelated message records the other agent on each side's line: the sender's address on the receiver's (from its
   * identity), the receiver's on the sender's (from the receiving run's answer).
   */
  private async exchange(input: CrossRunMessageInput, sender: CrossRunSenderRoot, message: CollaborationCommunicationMessage,
    receiverRun: RootExecutionIdentity, receiver: CrossRunReceiverRoot, kind: Readonly<{ reactivated: boolean; related: boolean }>): Promise<AgentOperationResult> {
    const { reactivated } = kind;
    const senderAddress = await this.dependencies.senderAddress({ sender: input.sender, receiverRun, receiverAgentRunId: input.targetAgentRunId });
    const accepted = await receiver.acceptFromRun({ message, senderIdentity: input.sender, senderDisplayName: input.senderDisplayName,
      senderAddress, assertAllowed: () => this.assertStillOpen(receiverRun), relation: kind.related ? "related" : "unrelated" });
    const receiverAddress = accepted.accepted ? accepted.agentAddress ?? null : null;
    const counterpart: MessageCounterpart | null = kind.related ? null : { address: receiverAddress, nodeId: null };
    if (!accepted.accepted) {
      let refused: AgentOperationResult = accepted;
      if (isRecordedRunRefusal(accepted)) {
        await sender.commitSentToRun(message, counterpart);
        refused = { accepted: false, code: accepted.code, message: accepted.message };
      }
      return reactivated ? notDeliveredAfterReopen(refused, input.targetAgentRunId) : refused;
    }
    await sender.commitSentToRun(message, counterpart);
    // Today's text (REQ-009, contract §2): by address it names the address; by run ID, "Message delivered." (CR-461-017).
    const { agentAddress: _receiverAddress, ...answer } = accepted;
    const delivered = answer.message ?? (input.shownAs ? `Delivered message to ${input.shownAs}.` : MESSAGE_DELIVERED_TEXT);
    return { ...answer, agentRunId: input.targetAgentRunId, message: reactivated ? `${delivered} ${input.targetAgentRunId} continues with its conversation.` : delivered };
  }

  /** An agent of a delegated run no Task names, messaged by the run's own delegator: its Task was deleted (base's refusal). */
  private async deletedTaskRefusal(input: CrossRunMessageInput): Promise<AgentOperationResult | null> {
    const own = await this.dependencies.runFiles.delegationOfAgent(input.targetAgentRunId.trim());
    return own?.delegatedFrom.delegatorAgentRunId === input.sender.agentRunId ? refusal("TASK_NOT_FOUND", DELETED_TASK_REFUSAL) : null;
  }

  /** Step 2 (`model.py` `_admit`). Refusals throw. */
  private async admit(tree: Pick<DelegationIndex, "canMessage" | "tasksOf">, senderRun: RootExecutionIdentity, receiverRun: RootExecutionIdentity,
    senderAgentRunId: string): Promise<Admission> {
    if (tree.canMessage(senderRun, receiverRun)) return "related";
    const receiverReference = runReferenceOf(receiverRun);
    const receiverEntries = receiverReference ? [...tree.tasksOf(receiverReference)].sort((a, b) => a.linkedAt.localeCompare(b.linkedAt)) : [];
    // The assigner's continuation: the receiver's last entry only.
    const last = receiverEntries.at(-1);
    if (last && receiverReference && last.role === "assigned" && !last.open && last.delegatedFrom.delegatorAgentRunId === senderAgentRunId) {
      const reopen = { execution: receiverReference, requestedBy: senderAgentRunId };
      // As base's reopen step (`assertRestorableChain`, CR-461-072): its eligibility, then whether the run can continue,
      // before the commit. A refusal changes nothing.
      await this.dependencies.tasks().assertReopenable(reopen);
      const unrestorable = await this.dependencies.restorability.refusal(receiverRun);
      if (unrestorable) throw new TaskDelegationError(unrestorable.code, unrestorable.message);
      const { reopened } = await this.dependencies.tasks().reopenAssignment(reopen);
      return reopened ? "reopened" : "related";
    }
    // A receiver whose Tasks are all closed is refused as closed, whoever sends (R-8, DEC-011); any other pair of runs is
    // unrelated: a different Task is no reason to refuse (autobyteus-492 DEC-001).
    if (receiverEntries.length && receiverEntries.every((entry) => !entry.open)) {
      throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", ASSIGNER_ONLY_REACTIVATION_MESSAGE);
    }
    return "unrelated";
  }

  /** The gate-head re-check reads the authority, the Task side, not the tree (AR-017). A run no Task names is not checked. */
  private assertStillOpen(receiverRun: RootExecutionIdentity): void {
    const reference = runReferenceOf(receiverRun);
    if (!reference || !this.dependencies.tree().tasksOf(reference).length) return;
    if (!this.dependencies.tasks().isOpen(reference)) throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", ASSIGNER_ONLY_REACTIVATION_MESSAGE);
  }
}
