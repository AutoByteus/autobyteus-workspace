import { createHash } from "node:crypto";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { TaskDelegationError } from "../task/task-delegation-command.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import {
  rootExecutionIdentityKey,
  sameRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
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
import type { CollaborationCommunicationMessage } from "./collaboration-communication-message.js";
import { buildRemoteCommunicationInputMessage } from "./root-communication-runtime-builder.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "../remote/remote-refusal-codes.js";
import type { RemoteEndpoint } from "../remote/remote-endpoint.js";

const DELIVERY_REFUSAL_CODES: ReadonlySet<string> = new Set(["TASK_AGENT_RESOURCE_CLOSED", "TASK_AGENT_RESOURCE_CONFLICT"]);
const NOT_HERE = "The agent with that run id is not running here, so the message was not sent. Use an exact run id you were given.";
/** A recipient that stopped accepting input after the durable write (its slot can no longer be committed). */
const RECIPIENT_STOPPED: Refusal = Object.freeze({ accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "AgentRun is not accepting input." });

type Refusal = Readonly<{ accepted: false; code: string; message: string }>;

/** A message from a local agent of this root to a remote endpoint it is paired with (CM-11). */
export type RemoteSendInput = Readonly<{
  senderIdentity: CollaborationMemberExecutionIdentity;
  endpoint: RemoteEndpoint;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;

/** A message checked and given its ID, not yet sent: nothing changed in the root (`prepareRemoteSend`). */
export type PreparedRemoteSend =
  | Readonly<{ ok: true; message: CollaborationCommunicationMessage; endpoint: RemoteEndpoint }>
  | Readonly<{ ok: false; refusal: Refusal }>;

/** A message a peer node accepted from its run, for a local agent of this root that is paired with it. */
export type RemoteAcceptInput = Readonly<{
  message: CollaborationCommunicationMessage;
  endpoint: RemoteEndpoint;
  receiverIdentity: CollaborationMemberExecutionIdentity;
  receiverDisplayName: string;
  /** This owner's label for the sender's node, named in the receiver's header. */
  senderNodeName: string;
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
    // The Task-scope refusal (a different Task, or a closed one) is an ordinary refusal the agent reads
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
    return this.reserveAndCommit(message, inputMessage, input.receiverIdentity.agentRunId, input.receiverDisplayName, assertAllowed, true);
  }

  /**
   * Outbound, step 1 (DS-002 on the delegating node, DS-003 on the receiving node): the checks and the message
   * ID, with no state change. The root's delivery applied the endpoint's pair rule before; it transmits after.
   * The Task check uses the endpoint's run ID, whose Task chain the endpoint kind gives (`ownershipChain`).
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
    if (input.referenceFiles?.some((file) => file.trim())) {
      return refuse({ accepted: false, code: REMOTE_REFUSAL.ATTACHMENTS_NOT_SUPPORTED, message: REMOTE_ROOT_REFUSAL_TEXT.attachments });
    }
    const createdAt = new Date().toISOString();
    const message = validateCollaborationCommunicationMessage({
      messageId: this.messageId(input.senderIdentity.agentRunId, remoteAgentRunId, content, createdAt),
      senderAgentRunId: input.senderIdentity.agentRunId,
      receiverAgentRunId: remoteAgentRunId,
      content,
      messageType: input.messageType?.trim() || "agent_message",
      referenceFiles: [],
      createdAt,
    });
    return Object.freeze({ ok: true as const, message, endpoint: input.endpoint });
  }

  /**
   * Outbound, step 3: the peer accepted the prepared message, so it is delivered. Only the sender's log gets
   * it, without a second Task check (the truthful record is "delivered"). If this root can no longer write
   * (closed or failed after the peer accepted), the result stays accepted and a warning names the message
   * (the RSK-106 class, FU-002).
   */
  async commitSentToRemote(prepared: Extract<PreparedRemoteSend, { ok: true }>): Promise<AgentOperationResult> {
    const { message, endpoint } = prepared;
    const missing = (reason: string) => console.warn(
      `Message '${message.messageId}' to remote run '${endpoint.reference.agentRunId}' was accepted by its node but not recorded here: ${reason}`);
    // Only the sender's record: no slot, no second Task check, not published to the root's view.
    const control = this.appendFor(message, null, false);
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
   * second message with the same ID is the existing commit-conflict refusal. Only the receiver's log gets it.
   */
  async acceptFromRemote(input: RemoteAcceptInput): Promise<AgentOperationResult> {
    const closed = this.refuseUnlessOpen(ROOT_NOT_ACCEPTING_MESSAGES);
    if (closed) return closed;
    if (!this.isCurrent(input.receiverIdentity)) return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: NOT_HERE };
    const message = validateCollaborationCommunicationMessage({ ...input.message, referenceFiles: [] });
    if (message.receiverAgentRunId !== input.receiverIdentity.agentRunId || message.senderAgentRunId !== input.endpoint.reference.agentRunId) {
      return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: NOT_HERE };
    }
    const assertAllowed = () => this.port.assertDeliveryAllowed(message.senderAgentRunId, message.receiverAgentRunId);
    const scope = this.refuseOutsideTaskScope(assertAllowed);
    if (scope) return scope;
    if (!message.content.trim()) return { accepted: false, code: "INVALID_MESSAGE", message: "Message content is required." };
    const inputMessage = buildRemoteCommunicationInputMessage({
      root: this.port.root, message, receiverIdentity: input.receiverIdentity, senderNodeName: input.senderNodeName,
    });
    // A message from a remote run is not published to the root's view (it shows its own agents' messages).
    return this.reserveAndCommit(message, inputMessage, input.receiverIdentity.agentRunId, input.receiverDisplayName, assertAllowed, false);
  }

  /** Holds the recipient's slot, then has the root's coordinator run the one append (DS-004). */
  private async reserveAndCommit(
    message: CollaborationCommunicationMessage,
    inputMessage: AgentInputUserMessage,
    receiverAgentRunId: string,
    receiverDisplayName: string,
    assertAllowed: () => void,
    publishToRootView: boolean,
  ): Promise<AgentOperationResult> {
    const reservationResult = await this.port.reserveRecipientInput(receiverAgentRunId, inputMessage);
    if (!reservationResult.reserved) {
      return { accepted: false, code: reservationResult.code, message: reservationResult.message };
    }
    const control = this.appendFor(message, {
      reservation: reservationResult.reservation,
      input: inputMessage,
      checkTaskScope: assertAllowed,
      present: () => this.port.presentRecipientInput(message, inputMessage),
    }, publishToRootView);
    let result: RootMessageAppendResult;
    try {
      result = await this.port.commitMessageAppend(control.append);
    } catch (error) {
      control.abandon();
      throw error;
    }
    if (result.outcome === "conflict") return { accepted: false, ...this.port.rejections.commitConflict };
    if (result.outcome === "not_committed") {
      return { accepted: false, code: this.port.rejections.historyCommitFailedCode, message: result.cause.message };
    }
    const closure = control.closure();
    if (closure?.kind === "task_scope") return closure.refusal;
    if (closure?.kind === "recipient_stopped") return RECIPIENT_STOPPED;
    return { accepted: true, agentRunId: receiverAgentRunId, displayName: receiverDisplayName };
  }

  private appendFor(
    message: CollaborationCommunicationMessage,
    receiver: Parameters<typeof createRootMessageAppend>[0]["receiver"],
    publishToRootView: boolean,
  ) {
    return createRootMessageAppend({
      message,
      receiver,
      isOpen: () => this.isOpen(),
      getMessages: () => this.current,
      setMessages: (messages) => { this.current = messages; },
      logOwnersOf: (entry) => this.port.logOwnersOf(entry),
      publishToRootView: publishToRootView ? () => this.port.publishToRootView(message) : null,
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

/** The Task-scope refusals the agent reads (closed, or a different Task), with the error's own text (C-2). */
const taskScopeRefusalOf = (error: unknown): TaskScopeRefusal | null =>
  error instanceof TaskDelegationError && DELIVERY_REFUSAL_CODES.has(error.code)
    ? Object.freeze({ accepted: false as const, code: error.code, message: error.message })
    : null;
