import { createHash } from "node:crypto";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ROOT_NOT_ACTIVE_MESSAGE, TaskDelegationError } from "../task/task-delegation-command.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import {
  rootExecutionIdentityKey,
  sameRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
} from "../domain/root-execution-identity.js";
import type {
  RootCommunicationAdapter,
  RootCommunicationDeliveryInput,
} from "./root-communication-adapter.js";
import {
  validateCollaborationCommunicationMessage,
  validateCollaborationCommunicationMessageArray,
} from "./collaboration-communication-message-schema.js";
import type { CollaborationCommunicationMessage } from "./collaboration-communication-message.js";
import { buildRemoteCommunicationInputMessage } from "./root-communication-runtime-builder.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "../remote/remote-refusal-codes.js";

const DELIVERY_REFUSAL_CODES: ReadonlySet<string> = new Set(["TASK_AGENT_RESOURCE_CLOSED", "TASK_AGENT_RESOURCE_CONFLICT"]);
const NOT_HERE = "The agent with that run id is not running here, so the message was not sent. Use an exact run id you were given.";

type Refusal = Readonly<{ accepted: false; code: string; message: string }>;

/** A message from a local agent of this root to a remote run it is linked with (CM-11). */
export type RemoteSendInput = Readonly<{
  senderIdentity: CollaborationMemberExecutionIdentity;
  remoteAgentRunId: string;
  receiverDisplayName: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;

/** A message a peer node accepted from its run, for a local agent of this root that is linked with it. */
export type RemoteAcceptInput = Readonly<{
  message: CollaborationCommunicationMessage;
  receiverIdentity: CollaborationMemberExecutionIdentity;
  receiverDisplayName: string;
  /** This owner's label for the sender's node, named in the receiver's header. */
  senderNodeName: string;
}>;

/** The peer's answer to one transmitted message: accepted, or a refusal the agent reads. */
export type RemoteTransmitReceipt = Readonly<{ accepted: true }> | Refusal;

/**
 * The only owner of a root's message state (`current`, the duplicate-ID check, the commit). Same-root
 * delivery (`deliver`), and the two remote entry points (design § Remote Delivery In The Engine):
 * `sendToRemote` (a local sender, a remote receiver: the peer stores the receiver's side) and
 * `acceptFromRemote` (a remote sender, a local receiver: the peer stored the sender's side).
 */
export class RootCommunicationEngine {
  private current: readonly CollaborationCommunicationMessage[];
  private accepting = true;

  constructor(private readonly adapter: RootCommunicationAdapter) {
    this.current = validateCollaborationCommunicationMessageArray(adapter.initialMessages);
  }

  getMessages(): readonly CollaborationCommunicationMessage[] { return this.current; }
  closeAdmission(): void { this.accepting = false; }

  async deliver(input: RootCommunicationDeliveryInput): Promise<AgentOperationResult> {
    const closed = this.refuseUnlessOpen();
    if (closed) return closed;
    if (!this.isCurrent(input.senderIdentity) || !this.isCurrent(input.receiverIdentity)) {
      return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: NOT_HERE };
    }
    if (input.senderIdentity.agentRunId === input.receiverIdentity.agentRunId) {
      return { accepted: false, code: "COLLABORATION_SELF_TARGET_REJECTED", message: "You can't send a message to yourself." };
    }
    const assertAllowed = () => this.adapter.assertDeliveryAllowed(input.senderIdentity.agentRunId, input.receiverIdentity.agentRunId);
    // The Task-scope refusal (a different Task, or a closed one) is an ordinary refusal the agent reads
    // (SR-003 T-4); the later re-checks inside reservation and commit keep throwing.
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
    const inputMessage = this.adapter.buildRecipientInput({ delivery: input, message });
    return this.reserveAndCommit(message, inputMessage, input.receiverIdentity.agentRunId, input.receiverDisplayName, assertAllowed);
  }

  /**
   * DS-002 on the delegating node, DS-003 on the receiving node. The caller already applied the pair rule
   * (`RemoteRunLinks`). The sender's node assigns the message ID; the receiving node uses it. Nothing is
   * written unless the peer accepted; then only the sender's log gets the message.
   */
  async sendToRemote(input: RemoteSendInput, transmit: (message: CollaborationCommunicationMessage) => Promise<RemoteTransmitReceipt>): Promise<AgentOperationResult> {
    const closed = this.refuseUnlessOpen();
    if (closed) return closed;
    if (!this.isCurrent(input.senderIdentity)) return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: NOT_HERE };
    if (input.senderIdentity.agentRunId === input.remoteAgentRunId) {
      return { accepted: false, code: "COLLABORATION_SELF_TARGET_REJECTED", message: "You can't send a message to yourself." };
    }
    const scope = this.refuseOutsideTaskScope(() => this.adapter.assertDeliveryAllowed(input.senderIdentity.agentRunId, input.remoteAgentRunId));
    if (scope) return scope;
    const content = input.content.trim();
    if (!content) return { accepted: false, code: "INVALID_MESSAGE", message: "Message content is required." };
    if (input.referenceFiles?.some((file) => file.trim())) {
      return { accepted: false, code: REMOTE_REFUSAL.ATTACHMENTS_NOT_SUPPORTED, message: REMOTE_ROOT_REFUSAL_TEXT.attachments };
    }
    const createdAt = new Date().toISOString();
    const message = validateCollaborationCommunicationMessage({
      messageId: this.messageId(input.senderIdentity.agentRunId, input.remoteAgentRunId, content, createdAt),
      senderAgentRunId: input.senderIdentity.agentRunId,
      receiverAgentRunId: input.remoteAgentRunId,
      content,
      messageType: input.messageType?.trim() || "agent_message",
      referenceFiles: [],
      createdAt,
    });
    const receipt = await transmit(message);
    if (!receipt.accepted) return { accepted: false, code: receipt.code, message: receipt.message };
    const result = await this.adapter.commitSentToRemote({
      message,
      getCurrentMessages: () => this.current,
      commitMessages: (messages) => { this.current = messages; },
    });
    return result.committed
      ? { accepted: true, agentRunId: input.remoteAgentRunId, displayName: input.receiverDisplayName }
      : { accepted: false, code: result.code, message: result.message };
  }

  /**
   * DS-002 on the receiving node, DS-003 on the delegating node. The caller already applied the link check
   * and woke or restored the receiver (N-8). The message keeps the sender's ID; a second message with the
   * same ID is the existing commit-conflict refusal. Only the receiver's log gets the message.
   */
  async acceptFromRemote(input: RemoteAcceptInput): Promise<AgentOperationResult> {
    const closed = this.refuseUnlessOpen();
    if (closed) return closed;
    if (!this.isCurrent(input.receiverIdentity)) return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: NOT_HERE };
    const message = validateCollaborationCommunicationMessage({ ...input.message, referenceFiles: [] });
    if (message.receiverAgentRunId !== input.receiverIdentity.agentRunId || message.senderAgentRunId === message.receiverAgentRunId) {
      return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: NOT_HERE };
    }
    const assertAllowed = () => this.adapter.assertDeliveryAllowed(message.senderAgentRunId, message.receiverAgentRunId);
    const scope = this.refuseOutsideTaskScope(assertAllowed);
    if (scope) return scope;
    if (!message.content.trim()) return { accepted: false, code: "INVALID_MESSAGE", message: "Message content is required." };
    const inputMessage = buildRemoteCommunicationInputMessage({
      root: this.adapter.root, message, receiverIdentity: input.receiverIdentity, senderNodeName: input.senderNodeName,
    });
    return this.reserveAndCommit(message, inputMessage, input.receiverIdentity.agentRunId, input.receiverDisplayName, assertAllowed);
  }

  private async reserveAndCommit(
    message: CollaborationCommunicationMessage,
    inputMessage: AgentInputUserMessage,
    receiverAgentRunId: string,
    receiverDisplayName: string,
    assertAllowed: () => void,
  ): Promise<AgentOperationResult> {
    const reservationResult = await this.adapter.reserveRecipientInput(receiverAgentRunId, inputMessage);
    if (!reservationResult.reserved) {
      return { accepted: false, code: reservationResult.code, message: reservationResult.message };
    }
    const exact = reservationResult.reservation;
    const guarded = Object.freeze({ agentRunId: exact.agentRunId,
      cancel: () => exact.cancel(),
      commit: () => { assertAllowed(); const committed = exact.commit(); return Object.freeze({ release: () => { assertAllowed(); committed.release(); } }); },
    });
    try { assertAllowed(); } catch (error) { exact.cancel(); throw error; }
    const result = await this.adapter.commitAppend({
      message,
      inputMessage,
      reservation: guarded,
      getCurrentMessages: () => this.current,
      commitMessages: (messages) => { this.current = messages; },
    });
    return result.committed
      ? { accepted: true, agentRunId: receiverAgentRunId, displayName: receiverDisplayName }
      : { accepted: false, code: result.code, message: result.message };
  }

  private refuseUnlessOpen(): Refusal | null {
    return !this.accepting || !this.adapter.isOpen()
      ? { accepted: false, code: "COLLABORATION_ROOT_NOT_ACCEPTING_MESSAGES", message: ROOT_NOT_ACTIVE_MESSAGE }
      : null;
  }

  private isCurrent(identity: CollaborationMemberExecutionIdentity): boolean {
    return sameRootExecutionIdentity(identity.root, this.adapter.root) && this.adapter.isCurrentAgent(identity);
  }

  private refuseOutsideTaskScope(assertAllowed: () => void): Refusal | null {
    try { assertAllowed(); return null; } catch (error) {
      if (error instanceof TaskDelegationError && DELIVERY_REFUSAL_CODES.has(error.code)) {
        return { accepted: false, code: error.code, message: error.message };
      }
      throw error;
    }
  }

  private messageId(senderAgentRunId: string, receiverAgentRunId: string, content: string, createdAt: string): string {
    const digest = createHash("sha256").update([
      rootExecutionIdentityKey(this.adapter.root),
      senderAgentRunId,
      receiverAgentRunId,
      content,
      createdAt,
    ].join("\0")).digest("base64url").slice(0, 32);
    return `collabmsg_${digest}`;
  }
}
