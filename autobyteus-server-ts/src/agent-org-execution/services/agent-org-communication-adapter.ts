import type { RootCommunicationAdapter } from "../../agent-collaboration/execution/communication/root-communication-adapter.js";
import { buildRootCommunicationInputMessage } from "../../agent-collaboration/execution/communication/root-communication-runtime-builder.js";
import type { AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import type { AgentOrgCommunicationMessagesFileV1 } from "../persistence/agent-org-communication-messages-v1.js";
import { validateAgentOrgCommunicationMessagesV1 } from "../persistence/agent-org-communication-messages-v1-schema.js";
import type { AgentOrgRunPersistenceCoordinator } from "./agent-org-run-persistence-coordinator.js";

/** Org-private sidecar/input/event adapter for RootCommunicationEngine. */
export class AgentOrgCommunicationAdapter implements RootCommunicationAdapter {
  readonly root;
  readonly initialMessages;

  constructor(private readonly options: Readonly<{
    root: RootCommunicationAdapter["root"];
    initial: AgentOrgCommunicationMessagesFileV1;
    persistence: AgentOrgRunPersistenceCoordinator;
    isOpen(): boolean;
    isCurrentAgent: RootCommunicationAdapter["isCurrentAgent"];
    reserveRecipientInput(agentRunId: string, message: ReturnType<RootCommunicationAdapter["buildRecipientInput"]>): Promise<AgentRunInputReservationResult>;
    replaceMessages(messages: AgentOrgCommunicationMessagesFileV1): void;
    publish(message: AgentOrgCommunicationMessagesFileV1["messages"][number]): void;
    presentCommittedMessage(
      message: AgentOrgCommunicationMessagesFileV1["messages"][number],
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
  reserveRecipientInput(agentRunId: string, message: ReturnType<AgentOrgCommunicationAdapter["buildRecipientInput"]>) {
    return this.options.reserveRecipientInput(agentRunId, message);
  }
  async commitAppend(input: Parameters<RootCommunicationAdapter["commitAppend"]>[0]) {
    if (!this.options.isOpen() || input.getCurrentMessages().some((message) => message.messageId === input.message.messageId)) {
      input.reservation.cancel();
      return Object.freeze({ committed: false as const, code: "AGENT_ORG_MESSAGE_COMMIT_CONFLICT", message: "Message append conflicts with current AgentOrg state." });
    }
    const next = validateAgentOrgCommunicationMessagesV1({
      schemaVersion: 1,
      subjectKind: "agent_org",
      orgRunId: this.root.rootRunId,
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
