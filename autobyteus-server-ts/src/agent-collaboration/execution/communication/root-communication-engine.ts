import { createHash } from "node:crypto";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import {
  rootExecutionIdentityKey,
  sameRootExecutionIdentity,
} from "../domain/root-execution-identity.js";
import type {
  RootCommunicationAdapter,
  RootCommunicationDeliveryInput,
} from "./root-communication-adapter.js";
import { validateCollaborationCommunicationMessageArrayV1 } from "./collaboration-communication-message-v1-schema.js";
import type { CollaborationCommunicationMessageV1 } from "./collaboration-communication-message-v1.js";

/** Same-root message validation, accepted-record construction, and reservation lifecycle. */
export class RootCommunicationEngine {
  private current: readonly CollaborationCommunicationMessageV1[];
  private accepting = true;

  constructor(private readonly adapter: RootCommunicationAdapter) {
    this.current = validateCollaborationCommunicationMessageArrayV1(adapter.initialMessages);
  }

  getMessages(): readonly CollaborationCommunicationMessageV1[] { return this.current; }
  closeAdmission(): void { this.accepting = false; }

  async deliver(input: RootCommunicationDeliveryInput): Promise<AgentOperationResult> {
    if (!this.accepting || !this.adapter.isOpen()) {
      return { accepted: false, code: "COLLABORATION_ROOT_NOT_ACCEPTING_MESSAGES", message: "The collaboration root is not accepting messages." };
    }
    if (!sameRootExecutionIdentity(input.senderIdentity.root, this.adapter.root)
      || !sameRootExecutionIdentity(input.receiverIdentity.root, this.adapter.root)
      || !this.adapter.isCurrentAgent(input.senderIdentity)
      || !this.adapter.isCurrentAgent(input.receiverIdentity)) {
      return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: "Sender and receiver must be exact live executions in the same collaboration root." };
    }
    if (input.senderIdentity.agentRunId === input.receiverIdentity.agentRunId) {
      return { accepted: false, code: "COLLABORATION_SELF_TARGET_REJECTED", message: "An AgentRun cannot send an ordinary collaboration message to itself." };
    }
    const content = input.content.trim();
    if (!content) return { accepted: false, code: "INVALID_MESSAGE", message: "Message content is required." };
    const createdAt = new Date().toISOString();
    const message: CollaborationCommunicationMessageV1 = Object.freeze({
      messageId: this.messageId(input, content, createdAt),
      senderAgentRunId: input.senderIdentity.agentRunId,
      receiverAgentRunId: input.receiverIdentity.agentRunId,
      content,
      messageType: input.messageType?.trim() || "agent_message",
      referenceFiles: Object.freeze([...(input.referenceFiles ?? [])]),
      createdAt,
    });
    const inputMessage = this.adapter.buildRecipientInput({ delivery: input, message });
    const reservationResult = await this.adapter.reserveRecipientInput(input.receiverIdentity.agentRunId, inputMessage);
    if (!reservationResult.reserved) {
      return { accepted: false, code: reservationResult.code, message: reservationResult.message };
    }
    const result = await this.adapter.commitAppend({
      message,
      inputMessage,
      reservation: reservationResult.reservation,
      getCurrentMessages: () => this.current,
      commitMessages: (messages) => { this.current = validateCollaborationCommunicationMessageArrayV1(messages); },
    });
    return result.committed
      ? { accepted: true, agentRunId: input.receiverIdentity.agentRunId, displayName: input.receiverDisplayName }
      : { accepted: false, code: result.code, message: result.message };
  }

  private messageId(input: RootCommunicationDeliveryInput, content: string, createdAt: string): string {
    const digest = createHash("sha256").update([
      rootExecutionIdentityKey(this.adapter.root),
      input.senderIdentity.agentRunId,
      input.receiverIdentity.agentRunId,
      content,
      createdAt,
    ].join("\0")).digest("base64url").slice(0, 32);
    return `collabmsg_${digest}`;
  }
}
