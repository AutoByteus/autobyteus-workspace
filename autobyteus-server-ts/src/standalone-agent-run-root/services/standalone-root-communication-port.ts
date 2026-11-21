import type { RunMessagesFeed } from "../../agent-collaboration/delegation/run-messages-feed.js";
import {
  ROOT_NOT_ACCEPTING_MESSAGES,
  type RootCommunicationPort,
} from "../../agent-collaboration/execution/communication/root-communication-port.js";
import { buildRootCommunicationInputMessage } from "../../agent-collaboration/execution/communication/root-communication-runtime-builder.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import { messageLogOwners, type MessageLogOwner } from "../../run-history/store/message-log-owners.js";
import type { StandaloneRootMessagesFile } from "../domain/standalone-run-agent.js";
import type { StandaloneRootPersistenceCoordinator } from "./standalone-root-persistence-coordinator.js";

/** The Agent root's facts and effects for RootCommunicationEngine (messages with subjectKind `agent`). */
export const createStandaloneRootCommunicationPort = (input: Readonly<{
  root: RootCommunicationPort["root"];
  initial: StandaloneRootMessagesFile;
  persistence: StandaloneRootPersistenceCoordinator;
  isOpen(): boolean;
  isCurrentAgent: RootCommunicationPort["isCurrentAgent"];
  /** The log an endpoint's messages belong to (the run's own agent's, or a task agent's own, D-4). */
  messageLogOwnerOf(agentRunId: string): MessageLogOwner;
  assertDeliveryAllowed: RootCommunicationPort["assertDeliveryAllowed"];
  reserveRecipientInput: RootCommunicationPort["reserveRecipientInput"];
  receivedFilesFor: RootCommunicationPort["receivedFilesFor"];
  /** The node's message feed (SR-072): each committed message into the views of its runs and the runs above them. */
  messageFeed: Pick<RunMessagesFeed, "publish">;
  presentCommittedMessage: RootCommunicationPort["presentRecipientInput"];
}>): RootCommunicationPort => {
  const port: RootCommunicationPort = {
    root: input.root,
    initialMessages: input.initial.messages,
    rejections: Object.freeze({
      deliverNotAccepting: ROOT_NOT_ACCEPTING_MESSAGES,
      commitConflict: Object.freeze({ code: "AGENT_ROOT_MESSAGE_COMMIT_CONFLICT", message: "Message append conflicts with the current Agent root state." }),
      historyCommitFailedCode: "AGENT_ROOT_MESSAGE_HISTORY_COMMIT_FAILED",
    }),
    isOpen: () => input.isOpen(),
    isCurrentAgent: (identity) => input.isCurrentAgent(identity),
    assertDeliveryAllowed: (sender, receiver) => input.assertDeliveryAllowed(sender, receiver),
    buildRecipientInput: (delivery) => buildRootCommunicationInputMessage(delivery),
    reserveRecipientInput: (agentRunId, message) => input.reserveRecipientInput(agentRunId, message),
    receivedFilesFor: (receiver, senderAgentRunId, files) => input.receivedFilesFor(receiver, senderAgentRunId, files),
    logOwnersOf: (message) => messageLogOwners(message, (agentRunId) => input.messageLogOwnerOf(agentRunId)),
    commitMessageAppend: (append) => input.persistence.commitMessageAppend(append),
    publishMessage: (publication) => input.messageFeed.publish(publication),
    presentRecipientInput: (message, recipientInput) => input.presentCommittedMessage(message, recipientInput),
  };
  return Object.freeze(port);
};
