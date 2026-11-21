import { createHash } from "node:crypto";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { TaskDelegationError } from "../task/task-delegation-command.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import {
  rootExecutionIdentityKey,
  sameRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../domain/root-execution-identity.js";
import {
  ROOT_NOT_ACCEPTING_MESSAGES,
  type RootCommunicationDeliveryInput,
  type RootCommunicationPort,
  type RootCommunicationRejection,
} from "./root-communication-port.js";
import { createRootMessageAppend, type RootMessageAppendResult, type TaskScopeRefusal } from "./root-message-append.js";
import {
  validateCollaborationCommunicationMessage,
  validateCollaborationCommunicationMessageArray,
} from "./collaboration-communication-message-schema.js";
import { messageFields, type CollaborationCommunicationMessage, type MessageCounterpart } from "./collaboration-communication-message.js";
import { localParty, type MessagePublication } from "./message-publication.js";
import { buildRemoteCommunicationInputMessage } from "./root-communication-runtime-builder.js";
import { REFERENCE_FILE_REFUSAL_TEXT, REMOTE_REFUSAL } from "../remote/remote-refusal-codes.js";
import type { RemoteEndpoint } from "../remote/remote-endpoint.js";
import type { ReceivedFilesPlan, TransferredFile } from "../remote/transferred-files.js";

const NOT_HERE = "The agent with that run id is not running here, so the message was not sent. Use an exact run id you were given.";
/** A recipient that stopped accepting input after the durable write (its slot can no longer be committed). */
const RECIPIENT_STOPPED: Refusal = Object.freeze({ accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "AgentRun is not accepting input." });

type Refusal = Readonly<{ accepted: false; code: string; message: string }>;

/**
 * A refusal of a message from another run answered after the receiver's durable write (REQ-012, SR-076): the
 * receiver's log keeps the message, so the sender's log records it too (TC-13), and a reload shows what the live
 * view showed (SR-074).
 */
export type RecordedRunRefusal = Refusal & Readonly<{ recordedByReceiver: true }>;
export const isRecordedRunRefusal = (result: AgentOperationResult): result is AgentOperationResult & RecordedRunRefusal =>
  !result.accepted && (result as Partial<RecordedRunRefusal>).recordedByReceiver === true;

/** A message from a local agent of this root to a remote endpoint: one it is paired with (CM-11), or a peer agent by run ID (CM-13). */
export type RemoteSendInput = Readonly<{
  senderIdentity: CollaborationMemberExecutionIdentity;
  endpoint: RemoteEndpoint;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;

/** A message checked and given its ID, not yet sent: nothing changed in the root (`prepareRemoteSend`). */
export type PreparedRemoteSend =
  /** `senderAddress`: the sending agent's address in this run, sent with the message (autobyteus-565). */
  | Readonly<{ ok: true; message: CollaborationCommunicationMessage; endpoint: RemoteEndpoint; senderAddress: string }>
  | Readonly<{ ok: false; refusal: Refusal }>;

/** A message from a local agent of this root to an agent of another run on this node (DS-2, contract §2.2). */
export type RunSendInput = Readonly<{
  senderIdentity: CollaborationMemberExecutionIdentity;
  receiverAgentRunId: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;
/** A message to another run, checked and given its ID; nothing changed in the root (`prepareSendToRun`). */
export type PreparedRunSend =
  | Readonly<{ ok: true; message: CollaborationCommunicationMessage }>
  | Readonly<{ ok: false; refusal: Refusal }>;
/** A message another run of this node sent, for a local agent of this root, admitted by `CrossRunMessageDelivery`. */
export type RunAcceptInput = Readonly<{
  message: CollaborationCommunicationMessage;
  senderIdentity: CollaborationMemberExecutionIdentity;
  senderDisplayName: string;
  /** The sender's address when, from the receiver, it reaches the sender; null otherwise. */
  senderAddress: string | null;
  receiverIdentity: CollaborationMemberExecutionIdentity;
  receiverDisplayName: string;
  /** The gate-head re-check of the Task rule, read from the Task side (AR-017); throws a Task refusal. */
  assertAllowed(): void;
  /**
   * How the two runs relate, as `CrossRunMessageDelivery` admitted the message: a Task relates them, or not (autobyteus-492
   * CM-13). `MessageViewScope` decides from it which views show the message; an unrelated line records its sender.
   */
  relation: "related" | "unrelated";
}>;

/** A message a peer node accepted from its run, for a local agent of this root: linked (CM-11), or by run ID (CM-13). */
export type RemoteAcceptInput = Readonly<{
  message: CollaborationCommunicationMessage;
  endpoint: RemoteEndpoint;
  receiverIdentity: CollaborationMemberExecutionIdentity;
  receiverDisplayName: string;
  /** This owner's label for the sender's node, named in the receiver's header. */
  senderNodeName: string;
  /** The sending agent's address in its own run, as the request carried it (autobyteus-565); null when not sent. */
  senderAddress: string | null;
  /** autobyteus-587: the reference files, complete in this node's received files; placed for the receiver at this commit. */
  files: readonly TransferredFile[];
}>;

/**
 * The only owner of a root's message state (`current`, the duplicate-ID check) and of the save-then-deliver
 * protocol for every root kind and entry form (DS-001..DS-004): it holds the recipient's slot, builds one
 * `RootMessageAppend` per message and hands it to the root's persistence coordinator through the port. It never
 * sends. Same-root delivery (`deliver`), and the remote steps the root's message delivery orders (design § Remote
 * Messaging, AR-005): `prepareRemoteSend` → (the root transmits) → `commitSentToRemote` for a local sender and a
 * remote receiver; `acceptFromRemote` for a remote sender and a local receiver. Each node writes only its own
 * run's log line (CM-9).
 */
export class RootCommunicationEngine {
  private current: readonly CollaborationCommunicationMessage[];
  private accepting = true;

  constructor(private readonly port: RootCommunicationPort) {
    this.current = validateCollaborationCommunicationMessageArray(port.initialMessages);
  }

  getMessages(): readonly CollaborationCommunicationMessage[] { return this.current; }
  /** Keeps only the loaded messages still in the root's view after a delegated run left its tree (D-4, D-5); memory only. */
  retainMessages(keep: (message: CollaborationCommunicationMessage) => boolean): void {
    this.current = Object.freeze(this.current.filter(keep));
  }
  closeAdmission(): void { this.accepting = false; }

  async deliver(input: RootCommunicationDeliveryInput): Promise<AgentOperationResult> {
    const closed = this.refuseUnlessOpen(this.port.rejections.deliverNotAccepting);
    if (closed) return closed;
    if (!this.isCurrent(input.senderIdentity) || !this.isCurrent(input.receiverIdentity)) {
      return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: NOT_HERE };
    }
    if (input.senderIdentity.agentRunId === input.receiverIdentity.agentRunId) {
      return { accepted: false, code: "COLLABORATION_SELF_TARGET_REJECTED", message: "You can't send a message to yourself." };
    }
    const assertAllowed = () => this.port.assertDeliveryAllowed(input.senderIdentity.agentRunId, input.receiverIdentity.agentRunId);
    // The Task-scope refusal (a closed Task) is an ordinary refusal the agent reads
    // (SR-003 T-4). The same refusal is given when the scope closes under the lock or after the save (DEC-005).
    const scope = this.refuseOutsideTaskScope(assertAllowed);
    if (scope) return scope;
    const content = input.content.trim();
    if (!content) return { accepted: false, code: "INVALID_MESSAGE", message: "Message content is required." };
    const createdAt = new Date().toISOString();
    // The new message is validated once here; the commit path appends it without re-validating the
    // history (REQ-001).
    const message: CollaborationCommunicationMessage = validateCollaborationCommunicationMessage({
      messageId: this.messageId(input.senderIdentity.agentRunId, input.receiverIdentity.agentRunId, content, createdAt),
      senderAgentRunId: input.senderIdentity.agentRunId,
      receiverAgentRunId: input.receiverIdentity.agentRunId,
      content,
      messageType: input.messageType?.trim() || "agent_message",
      referenceFiles: [...(input.referenceFiles ?? [])],
      createdAt,
    });
    const inputMessage = this.port.buildRecipientInput({ delivery: input, message });
    // A message between the run's own agents: this one commit publishes it (SR-072).
    return (await this.commitReserved(message, inputMessage, input.receiverIdentity, input.receiverDisplayName, assertAllowed, {
      relation: "same_run", sender: { run: this.port.root }, receiver: { run: this.port.root },
      parties: { sender: localParty(input.senderIdentity.agentRunId, input.senderIdentity.memberAddress), receiver: localParty(input.receiverIdentity.agentRunId, input.receiverIdentity.memberAddress) },
    })).result;
  }

  /**
   * Outbound, step 1 (DS-002 on the delegating node, DS-003 on the receiving node): the checks and the message
   * ID, with no state change. `RemoteMessageSend` chose the endpoint before (linked, or `unlinked_run`); it transmits after.
   * The Task check is the root's own (`assertDeliveryAllowed`): the closed-Task fence of the root's linked endpoint with
   * the remote run ID, whichever endpoint carries the message.
   */
  prepareRemoteSend(input: RemoteSendInput): PreparedRemoteSend {
    const refuse = (refusal: Refusal): PreparedRemoteSend => Object.freeze({ ok: false as const, refusal });
    const closed = this.refuseUnlessOpen(ROOT_NOT_ACCEPTING_MESSAGES);
    if (closed) return refuse(closed);
    const remoteAgentRunId = input.endpoint.reference.agentRunId;
    if (!this.isCurrent(input.senderIdentity)) return refuse({ accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: NOT_HERE });
    if (input.senderIdentity.agentRunId === remoteAgentRunId) {
      return refuse({ accepted: false, code: "COLLABORATION_SELF_TARGET_REJECTED", message: "You can't send a message to yourself." });
    }
    const scope = this.refuseOutsideTaskScope(() => this.port.assertDeliveryAllowed(input.senderIdentity.agentRunId, remoteAgentRunId));
    if (scope) return refuse(scope);
    const content = input.content.trim();
    if (!content) return refuse({ accepted: false, code: "INVALID_MESSAGE", message: "Message content is required." });
    const createdAt = new Date().toISOString();
    const message = validateCollaborationCommunicationMessage({
      messageId: this.messageId(input.senderIdentity.agentRunId, remoteAgentRunId, content, createdAt),
      senderAgentRunId: input.senderIdentity.agentRunId,
      receiverAgentRunId: remoteAgentRunId,
      content,
      messageType: input.messageType?.trim() || "agent_message",
      // The sender's line keeps the sender's own paths (autobyteus-587 RF-9); the receiving node records its copies.
      referenceFiles: [...(input.referenceFiles ?? [])],
      createdAt,
    });
    return Object.freeze({ ok: true as const, message, endpoint: input.endpoint, senderAddress: input.senderIdentity.memberAddress });
  }

  /**
   * Outbound, step 3: the peer accepted the prepared message, so it is delivered. Only the sender's log gets
   * it, without a second Task check (the truthful record is "delivered"). If this root can no longer write
   * (closed or failed after the peer accepted), the result stays accepted and a warning names the message
   * (the RSK-106 class, FU-002). This, the sender's, commit records the receiver (its address as its node answered, and its
   * node) and publishes the message into this run's views (autobyteus-565; the receiving node publishes into its own).
   */
  async commitSentToRemote(prepared: Extract<PreparedRemoteSend, { ok: true }>,
    receiver: Readonly<{ address: string | null; nodeName: string }>): Promise<AgentOperationResult> {
    const { endpoint } = prepared;
    const message = withCounterpart(prepared.message, { address: receiver.address, nodeId: endpoint.reference.nodeId });
    const missing = (reason: string) => console.warn(
      `Message '${message.messageId}' to remote run '${endpoint.reference.agentRunId}' was accepted by its node but not recorded here: ${reason}`);
    // Only the sender's record: no slot, no second Task check.
    const control = this.appendFor(message, null, {
      relation: "remote", sender: { run: this.port.root }, receiver: { nodeId: endpoint.reference.nodeId },
      parties: { sender: localParty(message.senderAgentRunId, prepared.senderAddress),
        receiver: Object.freeze({ agentRunId: message.receiverAgentRunId, address: receiver.address, nodeName: receiver.nodeName }) },
    });
    try {
      const result = await this.port.commitMessageAppend(control.append);
      if (result.outcome === "conflict") missing(this.port.rejections.commitConflict.message);
      if (result.outcome === "not_committed") missing(result.cause.message);
    } catch (error) {
      control.abandon();
      missing(error instanceof Error ? error.message : String(error));
    }
    return { accepted: true, agentRunId: endpoint.reference.agentRunId, displayName: endpoint.displayName };
  }

  /**
   * Inbound (DS-002 on the receiving node, DS-003 on the delegating node). The root's delivery already
   * applied the link check and woke or restored the receiver (N-8). The message keeps the sender's ID; a
   * second message with the same ID is the existing commit-conflict refusal. Only the receiver's log gets it, with the
   * sender recorded (its address as the request carried it, and its node), and this commit publishes it into this run's
   * views (autobyteus-565).
   * autobyteus-587 (AR-002): its files land in the receiver's own folder only once every admission check passed: open,
   * current receiver, Task scope, content, the receiver's slot; then they are placed (through the port), then the log
   * line is written. Their received paths are known before, so the input the slot holds names them (RF-8), and the line
   * records them (RF-9). A file that can no longer be placed releases the slot and refuses the message.
   */
  async acceptFromRemote(input: RemoteAcceptInput): Promise<AgentOperationResult> {
    const closed = this.refuseUnlessOpen(ROOT_NOT_ACCEPTING_MESSAGES);
    if (closed) return closed;
    if (!this.isCurrent(input.receiverIdentity)) return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: NOT_HERE };
    const nodeId = input.endpoint.reference.nodeId;
    const received = validateCollaborationCommunicationMessage({ ...input.message, referenceFiles: [] });
    if (received.receiverAgentRunId !== input.receiverIdentity.agentRunId || received.senderAgentRunId !== input.endpoint.reference.agentRunId) {
      return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: NOT_HERE };
    }
    const assertAllowed = () => this.port.assertDeliveryAllowed(received.senderAgentRunId, received.receiverAgentRunId);
    const scope = this.refuseOutsideTaskScope(assertAllowed);
    if (scope) return scope;
    if (!received.content.trim()) return { accepted: false, code: "INVALID_MESSAGE", message: "Message content is required." };
    const plan = input.files.length ? await this.port.receivedFilesFor(input.receiverIdentity, received.senderAgentRunId, input.files) : null;
    const message = withCounterpart({ ...received, referenceFiles: plan?.paths ?? [] }, { address: input.senderAddress, nodeId });
    const inputMessage = buildRemoteCommunicationInputMessage({
      root: this.port.root, message, receiverIdentity: input.receiverIdentity, senderNodeName: input.senderNodeName,
    });
    return (await this.commitReserved(message, inputMessage, input.receiverIdentity, input.receiverDisplayName, assertAllowed, {
      relation: "remote", sender: { nodeId }, receiver: { run: this.port.root },
      parties: { sender: Object.freeze({ agentRunId: message.senderAgentRunId, address: input.senderAddress, nodeName: input.senderNodeName }),
        receiver: localParty(input.receiverIdentity.agentRunId, input.receiverIdentity.memberAddress) },
    }, plan)).result;
  }

  /**
   * To another run on this node, step 1 (DS-2): the checks and the message ID, with no state change. The admission is
   * `CrossRunMessageDelivery`'s (the `DelegationIndex`), made before; this root checks only its own sender.
   */
  prepareSendToRun(input: RunSendInput): PreparedRunSend {
    const refuse = (refusal: Refusal): PreparedRunSend => Object.freeze({ ok: false as const, refusal });
    const closed = this.refuseUnlessOpen(ROOT_NOT_ACCEPTING_MESSAGES);
    if (closed) return refuse(closed);
    if (!this.isCurrent(input.senderIdentity)) return refuse({ accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: NOT_HERE });
    if (input.senderIdentity.agentRunId === input.receiverAgentRunId) {
      return refuse({ accepted: false, code: "COLLABORATION_SELF_TARGET_REJECTED", message: "You can't send a message to yourself." });
    }
    const content = input.content.trim();
    if (!content) return refuse({ accepted: false, code: "INVALID_MESSAGE", message: "Message content is required." });
    const createdAt = new Date().toISOString();
    return Object.freeze({ ok: true as const, message: validateCollaborationCommunicationMessage({
      messageId: this.messageId(input.senderIdentity.agentRunId, input.receiverAgentRunId, content, createdAt),
      senderAgentRunId: input.senderIdentity.agentRunId,
      receiverAgentRunId: input.receiverAgentRunId,
      content,
      messageType: input.messageType?.trim() || "agent_message",
      referenceFiles: [...(input.referenceFiles ?? [])],
      createdAt,
    }) });
  }

  /**
   * To another run, step 3: the receiver's log has it (delivered, or refused after its durable write, SR-076); only
   * this (the sender's) log gets it, with the same message ID (CM-9). A failed write keeps the receiver's answer and
   * names the message; the root's persistence takes its own fail-stop (AR-013). A line with an unrelated run records the
   * receiver (`counterpart`, its address as the receiving run answered it; autobyteus-565). It never publishes.
   */
  async commitSentToRun(sent: CollaborationCommunicationMessage, counterpart: MessageCounterpart | null): Promise<void> {
    const message = counterpart ? withCounterpart(sent, counterpart) : sent;
    const missing = (reason: string) => console.warn(`Message '${message.messageId}' to run agent '${message.receiverAgentRunId}' is in the receiver's log but not recorded here: ${reason}`);
    // The receiver's commit published it (SR-072); the sender's later commit of the same message does not.
    const control = this.appendFor(message, null, null);
    try {
      const result = await this.port.commitMessageAppend(control.append);
      if (result.outcome === "conflict") missing(this.port.rejections.commitConflict.message);
      if (result.outcome === "not_committed") missing(result.cause.message);
    } catch (error) {
      control.abandon();
      missing(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * From another run on this node (DS-2, the receiver's root, in its gate): the Task rule is re-checked from the Task side,
   * then the receiver's slot, then this root's log (only this root's). The message keeps the sender's ID.
   */
  async acceptFromRun(input: RunAcceptInput): Promise<AgentOperationResult | RecordedRunRefusal> {
    const closed = this.refuseUnlessOpen(ROOT_NOT_ACCEPTING_MESSAGES);
    if (closed) return closed;
    if (!this.isCurrent(input.receiverIdentity) || input.message.receiverAgentRunId !== input.receiverIdentity.agentRunId) {
      return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: NOT_HERE };
    }
    const accepted = validateCollaborationCommunicationMessage(input.message);
    // A line with an unrelated run records its sender (autobyteus-565); a related run is in a Task's tree.
    const message = input.relation === "unrelated" ? withCounterpart(accepted, { address: input.senderIdentity.memberAddress, nodeId: null }) : accepted;
    const scope = this.refuseOutsideTaskScope(input.assertAllowed);
    if (scope) return scope;
    const inputMessage = this.port.buildRecipientInput({ delivery: { senderIdentity: input.senderIdentity, senderDisplayName: input.senderDisplayName,
      senderAddress: input.senderAddress, receiverIdentity: input.receiverIdentity, receiverDisplayName: input.receiverDisplayName,
      content: message.content, messageType: message.messageType, referenceFiles: message.referenceFiles }, message });
    // The receiver's commit publishes a message between runs, once, for the views of both runs and those above (SR-072);
    // `MessageViewScope` decides from its relation which of them show it.
    const { result, recorded } = await this.commitReserved(message, inputMessage, input.receiverIdentity, input.receiverDisplayName, input.assertAllowed, {
      relation: input.relation, sender: { run: input.senderIdentity.root }, receiver: { run: this.port.root },
      parties: { sender: localParty(input.senderIdentity.agentRunId, input.senderIdentity.memberAddress),
        receiver: localParty(input.receiverIdentity.agentRunId, input.receiverIdentity.memberAddress) },
    });
    return !result.accepted && recorded ? Object.freeze({ accepted: false as const, code: result.code ?? "", message: result.message ?? "", recordedByReceiver: true as const }) : result;
  }

  /**
   * Holds the recipient's slot, then has the root's coordinator run the one append (DS-004). The answer, and whether
   * this root's log has the message (SR-076).
   */
  private async commitReserved(
    message: CollaborationCommunicationMessage,
    inputMessage: AgentInputUserMessage,
    receiverIdentity: CollaborationMemberExecutionIdentity,
    receiverDisplayName: string,
    assertAllowed: () => void,
    /** The message's relation, sides and parties: every commit that reaches here publishes it (SR-072, autobyteus-565). */
    publication: Omit<MessagePublication, "message">,
    /** A message from another node with files: they are placed once the slot is held, before the log line (autobyteus-587). */
    files: ReceivedFilesPlan | null = null,
  ): Promise<Readonly<{ result: AgentOperationResult; recorded: boolean }>> {
    const receiverAgentRunId = receiverIdentity.agentRunId;
    const reservationResult = await this.port.reserveRecipientInput(receiverAgentRunId, inputMessage);
    if (!reservationResult.reserved) {
      return { result: { accepted: false, code: reservationResult.code, message: reservationResult.message }, recorded: false };
    }
    let placed: Awaited<ReturnType<ReceivedFilesPlan["place"]>> | null = null;
    try { placed = files ? await files.place() : null; } catch (error) {
      reservationResult.reservation.cancel();
      throw error;
    }
    if (placed && !placed.ok) {
      reservationResult.reservation.cancel();
      return { result: { accepted: false, code: REMOTE_REFUSAL.REFERENCE_FILE_CHECK_FAILED, message: REFERENCE_FILE_REFUSAL_TEXT.notReceived(placed.name) },
        recorded: false };
    }
    const control = this.appendFor(message, {
      reservation: reservationResult.reservation,
      input: inputMessage,
      checkTaskScope: assertAllowed,
      present: () => this.port.presentRecipientInput(message, inputMessage),
    }, publication);
    let appended: RootMessageAppendResult;
    try {
      appended = await this.port.commitMessageAppend(control.append);
    } catch (error) {
      control.abandon();
      throw error;
    }
    const answer = (result: AgentOperationResult) => ({ result, recorded: control.recorded() });
    if (appended.outcome === "conflict") return answer({ accepted: false, ...this.port.rejections.commitConflict });
    if (appended.outcome === "not_committed") {
      return answer({ accepted: false, code: this.port.rejections.historyCommitFailedCode, message: appended.cause.message });
    }
    const closure = control.closure();
    if (closure?.kind === "task_scope") return answer(closure.refusal);
    if (closure?.kind === "recipient_stopped") return answer(RECIPIENT_STOPPED);
    return answer({ accepted: true, agentRunId: receiverAgentRunId, displayName: receiverDisplayName, agentAddress: receiverIdentity.memberAddress });
  }

  private appendFor(
    message: CollaborationCommunicationMessage,
    receiver: Parameters<typeof createRootMessageAppend>[0]["receiver"],
    /** The commit's publication; `null` for the sender's commit of a message between two runs of this node. */
    publication: Omit<MessagePublication, "message"> | null,
  ) {
    return createRootMessageAppend({
      message,
      receiver,
      isOpen: () => this.isOpen(),
      getMessages: () => this.current,
      setMessages: (messages) => { this.current = messages; },
      logOwnersOf: (entry) => this.port.logOwnersOf(entry),
      // Views and events carry the message's own fields; the `counterpart` record is this log's.
      publishToRootView: publication ? () => this.port.publishMessage({ ...publication, message: messageFields(message) }) : null,
      scopeRefusalOf: (error) => taskScopeRefusalOf(error),
    });
  }

  private isOpen(): boolean { return this.accepting && this.port.isOpen(); }

  private refuseUnlessOpen(rejection: RootCommunicationRejection): Refusal | null {
    return this.isOpen() ? null : { accepted: false, code: rejection.code, message: rejection.message };
  }

  private isCurrent(identity: CollaborationMemberExecutionIdentity): boolean {
    return sameRootExecutionIdentity(identity.root, this.port.root) && this.port.isCurrentAgent(identity);
  }

  private refuseOutsideTaskScope(assertAllowed: () => void): Refusal | null {
    try { assertAllowed(); return null; } catch (error) {
      const refusal = taskScopeRefusalOf(error);
      if (refusal) return refusal;
      throw error;
    }
  }

  private messageId(senderAgentRunId: string, receiverAgentRunId: string, content: string, createdAt: string): string {
    const digest = createHash("sha256").update([
      rootExecutionIdentityKey(this.port.root),
      senderAgentRunId,
      receiverAgentRunId,
      content,
      createdAt,
    ].join("\0")).digest("base64url").slice(0, 32);
    return `collabmsg_${digest}`;
  }
}

/**
 * The Task-scope refusal the agent reads, with the error's own text (C-2): a run whose Task is closed. A different Task is no
 * reason to refuse a message (autobyteus-492 CM-13).
 */
const taskScopeRefusalOf = (error: unknown): TaskScopeRefusal | null =>
  error instanceof TaskDelegationError && error.code === "TASK_AGENT_RESOURCE_CLOSED"
    ? Object.freeze({ accepted: false as const, code: error.code, message: error.message })
    : null;

/** The message as this log records it, with the other agent of a line outside the run's tree (autobyteus-565). */
const withCounterpart = (message: CollaborationCommunicationMessage, counterpart: MessageCounterpart): CollaborationCommunicationMessage =>
  Object.freeze({ ...messageFields(message), counterpart: Object.freeze({ address: counterpart.address, nodeId: counterpart.nodeId }) });
