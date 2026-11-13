import type { RunOwnAgentsReader } from "../../run-history/store/run-own-agents-reader.js";
import { MESSAGE_DELIVERED_TEXT, type AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { DelegationIndex } from "../delegation/delegation-index.js";
import type { CollaborationCommunicationMessage } from "../execution/communication/collaboration-communication-message.js";
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

/** The sender's root: it prepares a message to another run and records it in its own log once delivered. */
export type CrossRunSenderRoot = Readonly<{
  prepareSendToRun(input: Readonly<{ senderIdentity: CollaborationMemberExecutionIdentity; receiverAgentRunId: string; content: string;
    messageType?: string | null; referenceFiles?: readonly string[] | null }>): PreparedRunSend;
  commitSentToRun(message: CollaborationCommunicationMessage): Promise<void>;
}>;
/** The receiver's root: in its gate it re-checks, writes its own log, and wakes and delivers (restored when stopped). */
export type CrossRunReceiverRoot = Readonly<{
  acceptFromRun(input: Readonly<{ message: CollaborationCommunicationMessage; senderIdentity: CollaborationMemberExecutionIdentity;
    senderDisplayName: string; senderAddress: string | null; assertAllowed(): void }>): Promise<AgentOperationResult | RecordedRunRefusal>;
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

/** The refusal of a message between two runs of different Tasks (contract §2.2), as today. */
export const OTHER_TASK_REFUSAL = "You can't message this agent: it works on a different Task.";
/** Base's refusal of the assigner's message to a run whose Task was deleted (`task-assignment-eligibility.ts`, REQ-009). */
export const DELETED_TASK_REFUSAL = "The Task was deleted, so its task agent cannot continue.";
const refusal = (code: string, message: string): AgentOperationResult => ({ accepted: false, code, message });
/** A refusal after this call reopened the receiver's assignment: its Task is open again, the message was not delivered. */
const notDeliveredAfterReopen = (refused: AgentOperationResult, targetAgentRunId: string): AgentOperationResult => ({ ...refused,
  message: `${refused.message ?? "The message was not delivered."} ${targetAgentRunId} continues with its conversation (its Task is open again) but did not receive this message; send it again.` });
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
const sameRun = (a: RootExecutionIdentity, b: RootExecutionIdentity): boolean => rootExecutionIdentityKey(a) === rootExecutionIdentityKey(b);

/**
 * `send_message_to(run ID)` to an agent of another run on this node (design DS-2, `CrossRunMessageDelivery`). It owns
 * the order of one message between two runs; the rule is the `DelegationIndex`'s (`canMessage`, contract §2.2):
 * 1. the receiver's run (`runOfAgent`), from memory (nothing is resumed to find it, also after a restart);
 * 2. admission: the rule, else the assigner's continuation of the receiver's last entry (it must be an `assigned` entry
 *    the sender assigned, whose Task is not DONE or CANCELLED: the Task side reopens it), else the refusal: closed when the
 *    two runs are related by a Task, else a different Task;
 * 3. the sender's root prepares the message (no state change), the receiver's root accepts it in its gate (it re-checks
 *    "open" from the Task side, writes its own log, wakes and delivers), then the sender's root writes its own log with
 *    the same message ID. A refusal writes nothing (CM-9, AR-013), except one after the receiver's durable write: the
 *    receiver's log keeps it (REQ-012), so the sender's records it too (SR-076, TC-13).
 * A target no Task relates to the sender's run (not in the tree, or the sender's own run) is not this route's: `null`;
 * except an agent of a delegated run (an agent run, or a team run's member) whose Task was deleted, messaged by the delegator
 * its run's own file names: base's
 * `TASK_NOT_FOUND` (CR-461-058, CR-461-065, SR-071: base's texts).
 */
export class CrossRunMessageDelivery {
  constructor(private readonly dependencies: Readonly<{
    tree(): Pick<DelegationIndex, "runOfAgent" | "canMessage" | "tasksOf">;
    tasks(): Pick<TaskExecutionResourcePort, "isOpen" | "reopenAssignment">;
    /** The sender's root (it is running: its agent is sending). */
    senderRoot(run: RootExecutionIdentity): CrossRunSenderRoot | null;
    /** The receiver's root, restored when it is stopped (DEC-001: a message wakes a stopped run). */
    receiverRoot(run: RootExecutionIdentity): Promise<CrossRunReceiverRoot | null>;
    /** The sender's own address when, from the receiver, it reaches the sender (contract §2.4); null otherwise. */
    senderAddress(input: Readonly<{ sender: CollaborationMemberExecutionIdentity; receiverRun: RootExecutionIdentity; receiverAgentRunId: string }>): Promise<string | null>;
    /** The own record of the delegation of the run an agent is in (its file's `delegatedFrom`): an agent run's, or its team run's. */
    runFiles: Pick<RunOwnAgentsReader, "delegationOfAgent">;
    /** Whether a delegated run can be restored (CR-461-070): asked before the receiver's root is resolved or restored. */
    restorability: Pick<DelegatedRunRestorability, "refusal">;
  }>) {}

  async route(input: CrossRunMessageInput): Promise<AgentOperationResult | null> {
    const tree = this.dependencies.tree();
    const receiverRun = await tree.runOfAgent(input.targetAgentRunId);
    const senderRun = input.sender.root;
    if (!receiverRun) return this.deletedTaskRefusal(input);
    if (sameRun(receiverRun, senderRun)) return null;
    // A run on a peer node is reached through the sender root's peer endpoints (CM-11).
    const receiverReference = runReferenceOf(receiverRun);
    if (receiverReference && tree.tasksOf(receiverReference).some((entry) => entry.nodeId !== undefined)) return null;
    let reactivated: boolean;
    try {
      reactivated = await this.admit(tree, senderRun, receiverRun, input.sender.agentRunId);
    } catch (error) {
      const code = error instanceof TaskDelegationError ? error.code : taskReactivationRejectionCode(error);
      if (code) return refusal(code, errorMessage(error));
      throw error;
    }
    const sender = this.dependencies.senderRoot(senderRun);
    if (!sender) return refusal("COLLABORATION_ROOT_NOT_ACTIVE", ROOT_NOT_ACTIVE_MESSAGE);
    const prepared = sender.prepareSendToRun({ senderIdentity: input.sender, receiverAgentRunId: input.targetAgentRunId, content: input.content,
      messageType: input.messageType, referenceFiles: input.referenceFiles });
    if (!prepared.ok) return prepared.refusal;
    // Base checked a released copy before restoring it (CR-461-070): its entry agent's saved conversation must continue.
    const unrestorable = await this.dependencies.restorability.refusal(receiverRun);
    if (unrestorable) return reactivated ? notDeliveredAfterReopen(unrestorable, input.targetAgentRunId) : unrestorable;
    let receiver: CrossRunReceiverRoot | null;
    try { receiver = await this.dependencies.receiverRoot(receiverRun); }
    catch (error) { return refusal("TARGET_RUN_NOT_AVAILABLE", `The run of ${input.targetAgentRunId} could not be resumed: ${errorMessage(error)}`); }
    // A run with no files (deleted while this message was past the tree): R-11, as for any unknown run ID (SR-067).
    if (!receiver) return refusal("TARGET_AGENT_RUN_NOT_ACTIVE", `No running agent has the run id '${input.targetAgentRunId}', so the message was not sent.`);
    const senderAddress = await this.dependencies.senderAddress({ sender: input.sender, receiverRun, receiverAgentRunId: input.targetAgentRunId });
    const accepted = await receiver.acceptFromRun({ message: prepared.message, senderIdentity: input.sender, senderDisplayName: input.senderDisplayName,
      senderAddress, assertAllowed: () => this.assertStillOpen(receiverRun) });
    if (!accepted.accepted) {
      let refused: AgentOperationResult = accepted;
      if (isRecordedRunRefusal(accepted)) {
        await sender.commitSentToRun(prepared.message);
        refused = { accepted: false, code: accepted.code, message: accepted.message };
      }
      return reactivated ? notDeliveredAfterReopen(refused, input.targetAgentRunId) : refused;
    }
    await sender.commitSentToRun(prepared.message);
    // Today's text (REQ-009, contract §2): by address it names the address; by run ID, "Message delivered." (CR-461-017).
    const delivered = accepted.message ?? (input.shownAs ? `Delivered message to ${input.shownAs}.` : MESSAGE_DELIVERED_TEXT);
    return { ...accepted, agentRunId: input.targetAgentRunId, message: reactivated ? `${delivered} ${input.targetAgentRunId} continues with its conversation.` : delivered };
  }

  /** An agent of a delegated run no Task names, messaged by the run's own delegator: its Task was deleted (base's refusal). */
  private async deletedTaskRefusal(input: CrossRunMessageInput): Promise<AgentOperationResult | null> {
    const own = await this.dependencies.runFiles.delegationOfAgent(input.targetAgentRunId.trim());
    return own?.delegatedFrom.delegatorAgentRunId === input.sender.agentRunId ? refusal("TASK_NOT_FOUND", DELETED_TASK_REFUSAL) : null;
  }

  /** Step 2 (`model.py` `_admit`); `true` when this call reopened the receiver's assignment. Refusals throw. */
  private async admit(tree: Pick<DelegationIndex, "canMessage" | "tasksOf">, senderRun: RootExecutionIdentity, receiverRun: RootExecutionIdentity,
    senderAgentRunId: string): Promise<boolean> {
    if (tree.canMessage(senderRun, receiverRun)) return false;
    const receiverReference = runReferenceOf(receiverRun);
    const receiverEntries = receiverReference ? [...tree.tasksOf(receiverReference)].sort((a, b) => a.linkedAt.localeCompare(b.linkedAt)) : [];
    // The assigner's continuation: the receiver's last entry only.
    const last = receiverEntries.at(-1);
    if (last && receiverReference && last.role === "assigned" && !last.open && last.delegatedFrom.delegatorAgentRunId === senderAgentRunId) {
      const { reopened } = await this.dependencies.tasks().reopenAssignment({ execution: receiverReference, requestedBy: senderAgentRunId });
      return reopened;
    }
    // R-8 before R-7, as base answered the closed target first (SR-071): a receiver whose Tasks are all closed is refused
    // as closed, whoever sends; only then are runs of different open Tasks refused.
    if (receiverEntries.length && receiverEntries.every((entry) => !entry.open)) {
      throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", ASSIGNER_ONLY_REACTIVATION_MESSAGE);
    }
    throw new TaskDelegationError("TASK_AGENT_RESOURCE_CONFLICT", OTHER_TASK_REFUSAL);
  }

  /** The gate-head re-check reads the authority, the Task side, not the tree (AR-017). A run no Task names is not checked. */
  private assertStillOpen(receiverRun: RootExecutionIdentity): void {
    const reference = runReferenceOf(receiverRun);
    if (!reference || !this.dependencies.tree().tasksOf(reference).length) return;
    if (!this.dependencies.tasks().isOpen(reference)) throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", ASSIGNER_ONLY_REACTIVATION_MESSAGE);
  }
}

