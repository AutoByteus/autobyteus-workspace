import type { RootCommunicationPort } from "../../agent-collaboration/execution/communication/root-communication-port.js";
import type { RootMessageAppend, RootMessageAppendResult } from "../../agent-collaboration/execution/communication/root-message-append.js";
import { createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { ROOT_NOT_ACTIVE_MESSAGE } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { buildDeliveryEndpointForParticipant } from "../../agent-team-execution/domain/inter-agent-message-delivery.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import { buildInterAgentDeliveryInputMessage } from "../../agent-team-execution/services/inter-agent-message-runtime-builders.js";
import { buildTeamMemberInputEventPayload } from "../../agent-team-execution/services/team-member-input-event-builder.js";
import { messageLogOwners, type MessageLogOwner } from "../../run-history/store/task-agent-message-logs.js";
import type { TeamCommunicationMessagesSnapshot } from "./team-communication-messages-file.js";

/** The Team root's facts and effects for RootCommunicationEngine. */
export const createTeamCommunicationPort = (input: Readonly<{
  rootTeamRunId: string;
  initial: TeamCommunicationMessagesSnapshot;
  isCurrentAgent: RootCommunicationPort["isCurrentAgent"];
  /** The log an endpoint's messages belong to (its memory placement, D-4). */
  messageLogOwnerOf(agentRunId: string): MessageLogOwner;
  assertDeliveryAllowed: RootCommunicationPort["assertDeliveryAllowed"];
  requireContainingTeamRun(agentRunId: string): Promise<TeamRun>;
  commitMessageAppend(append: RootMessageAppend): Promise<RootMessageAppendResult>;
  publish(event: TeamRunEvent): void;
}>): RootCommunicationPort => {
  const port: RootCommunicationPort = {
    root: createTeamRootExecutionIdentity(input.rootTeamRunId),
    initialMessages: input.initial.messages,
    rejections: Object.freeze({
      deliverNotAccepting: Object.freeze({ code: "TEAM_RUN_NOT_ACCEPTING_MESSAGES", message: ROOT_NOT_ACTIVE_MESSAGE }),
      commitConflict: Object.freeze({ code: "TEAM_MESSAGE_COMMIT_CONFLICT", message: "Message append conflicts with current root state." }),
      historyCommitFailedCode: "TEAM_MESSAGE_HISTORY_COMMIT_FAILED",
    }),
    // The engine's own admission flag carries the Team's: it closes only with `closeAdmission` (fail-stop,
    // terminate). Not the root's broader `isAdmitting()`, which would change the code returned at those edges.
    isOpen: () => true,
    isCurrentAgent: (identity) => input.isCurrentAgent(identity),
    assertDeliveryAllowed: (sender, receiver) => input.assertDeliveryAllowed(sender, receiver),
    buildRecipientInput: ({ delivery, message }) => buildInterAgentDeliveryInputMessage({
      rootTeamRunId: input.rootTeamRunId,
      recipientAddress: delivery.receiverIdentity.memberAddress,
      sender: buildDeliveryEndpointForParticipant(Object.freeze({
        kind: "agent",
        identity: delivery.senderIdentity,
        displayName: delivery.senderDisplayName,
      })),
      recipient: buildDeliveryEndpointForParticipant(Object.freeze({
        kind: "agent",
        identity: delivery.receiverIdentity,
        displayName: delivery.receiverDisplayName,
      })),
      senderAddress: delivery.senderAddress,
      senderIdentity: delivery.senderIdentity,
      receiverIdentity: delivery.receiverIdentity,
      content: message.content,
      messageType: message.messageType,
      referenceFiles: [...message.referenceFiles],
      parentCommunicationMessageId: message.messageId,
    }),
    reserveRecipientInput: async (agentRunId, message) => (await input.requireContainingTeamRun(agentRunId)).reserveDirectAgentInput(agentRunId, message),
    logOwnersOf: (message) => messageLogOwners(message, (agentRunId) => input.messageLogOwnerOf(agentRunId)),
    commitMessageAppend: (append) => input.commitMessageAppend(append),
    publishToRootView: (message) => input.publish({ eventSourceType: TeamRunEventSourceType.COMMUNICATION, payload: message }),
    presentRecipientInput: (message, recipientInput) => input.publish({
      eventSourceType: TeamRunEventSourceType.MEMBER_INPUT,
      agentRunId: message.receiverAgentRunId,
      payload: buildTeamMemberInputEventPayload({
        rootTeamRunId: input.rootTeamRunId,
        recipientAgentRunId: message.receiverAgentRunId,
        message: recipientInput,
        receivedAt: message.createdAt,
      }),
    }),
  };
  return Object.freeze(port);
};
