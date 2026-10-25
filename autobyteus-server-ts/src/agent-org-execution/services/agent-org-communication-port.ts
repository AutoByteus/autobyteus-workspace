import {
  ROOT_NOT_ACCEPTING_MESSAGES,
  type RootCommunicationPort,
} from "../../agent-collaboration/execution/communication/root-communication-port.js";
import { buildRootCommunicationInputMessage } from "../../agent-collaboration/execution/communication/root-communication-runtime-builder.js";
import { messageLogOwners, type MessageLogOwner } from "../../run-history/store/task-agent-message-logs.js";
import type { AgentOrgCommunicationMessagesFile } from "../persistence/agent-org-communication-messages.js";
import type { AgentOrgRunPersistenceCoordinator } from "./agent-org-run-persistence-coordinator.js";

/** The AgentOrg root's facts and effects for RootCommunicationEngine. */
export const createAgentOrgCommunicationPort = (input: Readonly<{
  root: RootCommunicationPort["root"];
  initial: AgentOrgCommunicationMessagesFile;
  persistence: AgentOrgRunPersistenceCoordinator;
  isOpen(): boolean;
  isCurrentAgent: RootCommunicationPort["isCurrentAgent"];
  /** The log an endpoint's messages belong to (the organization run's, or a task agent's own, D-4). */
  messageLogOwnerOf(agentRunId: string): MessageLogOwner;
  assertDeliveryAllowed: RootCommunicationPort["assertDeliveryAllowed"];
  reserveRecipientInput: RootCommunicationPort["reserveRecipientInput"];
  publish(message: AgentOrgCommunicationMessagesFile["messages"][number]): void;
  presentCommittedMessage: RootCommunicationPort["presentRecipientInput"];
}>): RootCommunicationPort => {
  const port: RootCommunicationPort = {
    root: input.root,
    initialMessages: input.initial.messages,
    rejections: Object.freeze({
      deliverNotAccepting: ROOT_NOT_ACCEPTING_MESSAGES,
      commitConflict: Object.freeze({ code: "AGENT_ORG_MESSAGE_COMMIT_CONFLICT", message: "Message append conflicts with current AgentOrg state." }),
      historyCommitFailedCode: "AGENT_ORG_MESSAGE_HISTORY_COMMIT_FAILED",
    }),
    isOpen: () => input.isOpen(),
    isCurrentAgent: (identity) => input.isCurrentAgent(identity),
    assertDeliveryAllowed: (sender, receiver) => input.assertDeliveryAllowed(sender, receiver),
    buildRecipientInput: (delivery) => buildRootCommunicationInputMessage(delivery),
    reserveRecipientInput: (agentRunId, message) => input.reserveRecipientInput(agentRunId, message),
    logOwnersOf: (message) => messageLogOwners(message, (agentRunId) => input.messageLogOwnerOf(agentRunId)),
    commitMessageAppend: (append) => input.persistence.commitMessageAppend(append),
    publishToRootView: (message) => input.publish(message),
    presentRecipientInput: (message, recipientInput) => input.presentCommittedMessage(message, recipientInput),
  };
  return Object.freeze(port);
};
