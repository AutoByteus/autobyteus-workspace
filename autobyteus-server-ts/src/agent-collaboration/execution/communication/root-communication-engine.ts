import { createHash } from "node:crypto";
import { ROOT_NOT_ACTIVE_MESSAGE, TaskDelegationError } from "../task/task-delegation-command.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import {
  rootExecutionIdentityKey,
  sameRootExecutionIdentity,
} from "../domain/root-execution-identity.js";
import type {
  RootCommunicationAdapter,
  RootCommunicationDeliveryInput,
} from "./root-communication-adapter.js";
import { validateCollaborationCommunicationMessageArray } from "./collaboration-communication-message-schema.js";
import type { CollaborationCommunicationMessage } from "./collaboration-communication-message.js";

const DELIVERY_REFUSAL_CODES: ReadonlySet<string> = new Set(["TASK_AGENT_RESOURCE_CLOSED", "TASK_AGENT_RESOURCE_CONFLICT"]);

/** Same-root message validation, accepted-record construction, and reservation lifecycle. */
export class RootCommunicationEngine {
  private current: readonly CollaborationCommunicationMessage[];
  private accepting = true;

  constructor(private readonly adapter: RootCommunicationAdapter) {
    this.current = validateCollaborationCommunicationMessageArray(adapter.initialMessages);
  }

  getMessages(): readonly CollaborationCommunicationMessage[] { return this.current; }
  closeAdmission(): void { this.accepting = false; }

  async deliver(input: RootCommunicationDeliveryInput): Promise<AgentOperationResult> {
    if (!this.accepting || !this.adapter.isOpen()) {
      return { accepted: false, code: "COLLABORATION_ROOT_NOT_ACCEPTING_MESSAGES", message: ROOT_NOT_ACTIVE_MESSAGE };
    }
    if (!sameRootExecutionIdentity(input.senderIdentity.root, this.adapter.root)
      || !sameRootExecutionIdentity(input.receiverIdentity.root, this.adapter.root)
      || !this.adapter.isCurrentAgent(input.senderIdentity)
      || !this.adapter.isCurrentAgent(input.receiverIdentity)) {
      return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: "The agent with that run id is not running here, so the message was not sent. Use an exact run id you were given." };
    }
    if (input.senderIdentity.agentRunId === input.receiverIdentity.agentRunId) {
      return { accepted: false, code: "COLLABORATION_SELF_TARGET_REJECTED", message: "You can't send a message to yourself." };
    }
    const assertAllowed = () => this.adapter.assertDeliveryAllowed(input.senderIdentity, input.receiverIdentity);
    // The Task-scope refusal (a different Task, or a closed one) is an ordinary refusal the agent reads
    // (SR-003 T-4); the later re-checks inside reservation and commit keep throwing.
    try { assertAllowed(); } catch (error) {
      if (error instanceof TaskDelegationError && DELIVERY_REFUSAL_CODES.has(error.code)) {
        return { accepted: false, code: error.code, message: error.message };
      }
      throw error;
    }
    const content = input.content.trim();
    if (!content) return { accepted: false, code: "INVALID_MESSAGE", message: "Message content is required." };
    const createdAt = new Date().toISOString();
    const message: CollaborationCommunicationMessage = Object.freeze({
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
      commitMessages: (messages) => { this.current = validateCollaborationCommunicationMessageArray(messages); },
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
