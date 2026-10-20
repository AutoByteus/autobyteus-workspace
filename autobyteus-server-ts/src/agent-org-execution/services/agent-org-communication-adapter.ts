import { messageLogOwners, type MessageLogOwner } from "../../run-history/store/task-agent-message-logs.js";
import type { RootCommunicationAdapter } from "../../agent-collaboration/execution/communication/root-communication-adapter.js";
import { buildRootCommunicationInputMessage } from "../../agent-collaboration/execution/communication/root-communication-runtime-builder.js";
import type { AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import type { AgentOrgCommunicationMessagesFile } from "../persistence/agent-org-communication-messages.js";
import type { AgentOrgRunPersistenceCoordinator } from "./agent-org-run-persistence-coordinator.js";

/** Org-private sidecar/input/event adapter for RootCommunicationEngine. */
export class AgentOrgCommunicationAdapter implements RootCommunicationAdapter {
  readonly root;
  readonly initialMessages;

  constructor(private readonly options: Readonly<{
    root: RootCommunicationAdapter["root"];
    initial: AgentOrgCommunicationMessagesFile;
    persistence: AgentOrgRunPersistenceCoordinator;
    isOpen(): boolean;
    isCurrentAgent: RootCommunicationAdapter["isCurrentAgent"];
    /** The log an endpoint's messages belong to (the organization run's, or a task agent's own, D-4). */
    messageLogOwnerOf(agentRunId: string): MessageLogOwner;
  assertDeliveryAllowed: RootCommunicationAdapter["assertDeliveryAllowed"];
    reserveRecipientInput(agentRunId: string, message: ReturnType<RootCommunicationAdapter["buildRecipientInput"]>): Promise<AgentRunInputReservationResult>;
    replaceMessages(messages: AgentOrgCommunicationMessagesFile): void;
    publish(message: AgentOrgCommunicationMessagesFile["messages"][number]): void;
    presentCommittedMessage(
      message: AgentOrgCommunicationMessagesFile["messages"][number],
      receiverInput: ReturnType<RootCommunicationAdapter["buildRecipientInput"]>,
    ): void;
  }>) {
    this.root = options.root;
    this.initialMessages = options.initial.messages;
  }
  isOpen(): boolean { return this.options.isOpen(); }
  assertDeliveryAllowed(...runIds: Parameters<RootCommunicationAdapter["assertDeliveryAllowed"]>): void {
    this.options.assertDeliveryAllowed(...runIds);
  }
  /** The peer admitted the message: only the sender's log here; not published to the root's view. */
  async commitSentToRemote(input: Parameters<RootCommunicationAdapter["commitSentToRemote"]>[0]) {
    if (!this.options.isOpen() || input.getCurrentMessages().some((message) => message.messageId === input.message.messageId)) {
      return Object.freeze({ committed: false as const, code: "AGENT_ORG_MESSAGE_COMMIT_CONFLICT", message: "Message append conflicts with current AgentOrg state." });
    }
    const next: AgentOrgCommunicationMessagesFile = Object.freeze({
      schemaVersion: 1, subjectKind: "agent_org", orgRunId: this.root.rootRunId,
      messages: Object.freeze([...input.getCurrentMessages(), input.message]),
    });
    return this.options.persistence.commitCommunication({
      nextMessages: next,
      message: input.message,
      logOwners: messageLogOwners(input.message, (agentRunId) => this.options.messageLogOwnerOf(agentRunId)),
      cancelBeforeDurability: () => undefined,
      commitAfterDurability: () => {
        input.commitMessages(next.messages);
        this.options.replaceMessages(next);
      },
    });
  }
  isCurrentAgent(identity: Parameters<RootCommunicationAdapter["isCurrentAgent"]>[0]): boolean {
    return this.options.isCurrentAgent(identity);
  }
  buildRecipientInput(input: Parameters<RootCommunicationAdapter["buildRecipientInput"]>[0]) {
    return buildRootCommunicationInputMessage(input);
  }
  reserveRecipientInput(agentRunId: string, message: ReturnType<AgentOrgCommunicationAdapter["buildRecipientInput"]>) {
    return this.options.reserveRecipientInput(agentRunId, message);
  }
  async commitAppend(input: Parameters<RootCommunicationAdapter["commitAppend"]>[0]) {
    if (!this.options.isOpen() || input.getCurrentMessages().some((message) => message.messageId === input.message.messageId)) {
      input.reservation.cancel();
      return Object.freeze({ committed: false as const, code: "AGENT_ORG_MESSAGE_COMMIT_CONFLICT", message: "Message append conflicts with current AgentOrg state." });
    }
    const next: AgentOrgCommunicationMessagesFile = Object.freeze({
      schemaVersion: 1,
      subjectKind: "agent_org",
      orgRunId: this.root.rootRunId,
      messages: Object.freeze([...input.getCurrentMessages(), input.message]),
    });
    let reservationCommitted = false;
    try {
      return await this.options.persistence.commitCommunication({
        nextMessages: next,
        message: input.message,
        logOwners: messageLogOwners(input.message, (agentRunId) => this.options.messageLogOwnerOf(agentRunId)),
        cancelBeforeDurability: () => input.reservation.cancel(),
        commitAfterDurability: () => {
          input.commitMessages(next.messages);
          this.options.replaceMessages(next);
          const committed = input.reservation.commit();
          reservationCommitted = true;
          try {
            if (input.publishToRootView) this.options.publish(input.message);
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
