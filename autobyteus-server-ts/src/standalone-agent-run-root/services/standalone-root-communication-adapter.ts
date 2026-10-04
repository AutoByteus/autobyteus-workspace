import type { RootCommunicationAdapter } from "../../agent-collaboration/execution/communication/root-communication-adapter.js";
import { buildRootCommunicationInputMessage } from "../../agent-collaboration/execution/communication/root-communication-runtime-builder.js";
import type { CollaborationCommunicationMessageV1 } from "../../agent-collaboration/execution/communication/collaboration-communication-message-v1.js";
import type { AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import { validateStandaloneRootMessagesV1 } from "../persistence/standalone-root-tree-schema.js";
import type { StandaloneRootMessagesFileV1 } from "../domain/standalone-root-tree.js";
import type { StandaloneRootPersistenceCoordinator } from "./standalone-root-persistence-coordinator.js";

/** Agent-root sidecar/input/event adapter for RootCommunicationEngine (v1 messages, subjectKind `agent`). */
export class StandaloneRootCommunicationAdapter implements RootCommunicationAdapter {
  readonly root;
  readonly initialMessages;

  constructor(private readonly options: Readonly<{
    root: RootCommunicationAdapter["root"];
    initial: StandaloneRootMessagesFileV1;
    persistence: StandaloneRootPersistenceCoordinator;
    isOpen(): boolean;
    isCurrentAgent: RootCommunicationAdapter["isCurrentAgent"];
    reserveRecipientInput(agentRunId: string, message: ReturnType<RootCommunicationAdapter["buildRecipientInput"]>): Promise<AgentRunInputReservationResult>;
    replaceMessages(messages: StandaloneRootMessagesFileV1): void;
    publish(message: CollaborationCommunicationMessageV1): void;
    presentCommittedMessage(
      message: CollaborationCommunicationMessageV1,
      receiverInput: ReturnType<RootCommunicationAdapter["buildRecipientInput"]>,
    ): void;
  }>) {
    this.root = options.root;
    this.initialMessages = options.initial.messages;
  }

  isOpen(): boolean { return this.options.isOpen(); }
  isCurrentAgent(identity: Parameters<RootCommunicationAdapter["isCurrentAgent"]>[0]): boolean {
    return this.options.isCurrentAgent(identity);
  }
  buildRecipientInput(input: Parameters<RootCommunicationAdapter["buildRecipientInput"]>[0]) {
    return buildRootCommunicationInputMessage(input);
  }
  reserveRecipientInput(agentRunId: string, message: ReturnType<StandaloneRootCommunicationAdapter["buildRecipientInput"]>) {
    return this.options.reserveRecipientInput(agentRunId, message);
  }

  async commitAppend(input: Parameters<RootCommunicationAdapter["commitAppend"]>[0]) {
    if (!this.options.isOpen() || input.getCurrentMessages().some((message) => message.messageId === input.message.messageId)) {
      input.reservation.cancel();
      return Object.freeze({ committed: false as const, code: "AGENT_ROOT_MESSAGE_COMMIT_CONFLICT", message: "Message append conflicts with the current Agent root state." });
    }
    const next = validateStandaloneRootMessagesV1({
      schemaVersion: 1,
      subjectKind: "agent",
      hostRunId: this.root.rootRunId,
      messages: [...input.getCurrentMessages(), input.message],
    }, this.root.rootRunId);
    let reservationCommitted = false;
    try {
      return await this.options.persistence.commitCommunication({
        nextMessages: next,
        cancelBeforeDurability: () => input.reservation.cancel(),
        commitAfterDurability: () => {
          input.commitMessages(next.messages);
          this.options.replaceMessages(next);
          const committed = input.reservation.commit();
          reservationCommitted = true;
          try {
            this.options.publish(input.message);
            this.options.presentCommittedMessage(input.message, input.inputMessage);
          } finally {
            committed.release();
          }
        },
      });
    } catch (error) {
      if (!reservationCommitted) input.reservation.cancel();
      throw error;
    }
  }
}
