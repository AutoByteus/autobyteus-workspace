import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { ResolvedInterAgentMessageDeliveryRequest } from "../domain/inter-agent-message-delivery.js";
import { buildTeamCommunicationReferenceId } from "../../services/team-communication/team-communication-identity.js";
import { inferTeamCommunicationReferenceFileType } from "../../services/team-communication/team-communication-normalizer.js";
import { buildTeamMemberInputDedupeKey, buildTeamMemberInputMessageId } from "./team-member-input-event-builder.js";

const messageType = (value: string | null | undefined): string => value?.trim() || "agent_message";
const references = (values: string[] | null | undefined): string[] => [...new Set(
  (values ?? []).map((value) => value.trim()).filter(Boolean),
)];

export const buildInterAgentMessageReferenceFileEntries = (input: {
  teamRunId: string;
  messageId: string;
  referenceFiles: string[];
  timestamp: string;
}) => input.referenceFiles.map((path) => ({
  referenceId: buildTeamCommunicationReferenceId({ teamRunId: input.teamRunId, messageId: input.messageId, path }),
  path,
  type: inferTeamCommunicationReferenceFileType(path),
  createdAt: input.timestamp,
  updatedAt: input.timestamp,
}));

export const buildRecipientVisibleInterAgentMessageContent = (
  request: ResolvedInterAgentMessageDeliveryRequest,
): string => {
  const sender = request.sender.participant;
  const files = references(request.referenceFiles);
  const fileBlock = files.length ? `\n\nReference files:\n${files.map((path) => `- ${path}`).join("\n")}` : "";
  return `You received a message from sender name: ${sender.displayName}, sender id: ${sender.identity.agentRunId}\nmessage:\n${request.content}${fileBlock}`;
};

export const buildInterAgentDeliveryInputMessage = (
  request: ResolvedInterAgentMessageDeliveryRequest,
): AgentInputUserMessage => {
  const files = references(request.referenceFiles);
  const visibleContent = buildRecipientVisibleInterAgentMessageContent(request);
  const messageId = request.recipientInputMessageId?.trim() || buildTeamMemberInputMessageId({
    rootTeamRunId: request.rootTeamRunId,
    recipientAgentRunId: request.receiverIdentity.agentRunId,
    content: visibleContent,
    receivedAt: request.parentCommunicationMessageId ?? "",
    parentCommunicationMessageId: request.parentCommunicationMessageId,
  });
  const dedupeKey = request.recipientInputDedupeKey?.trim() || buildTeamMemberInputDedupeKey({
    rootTeamRunId: request.rootTeamRunId,
    recipientAgentRunId: request.receiverIdentity.agentRunId,
    messageId,
  });
  return new AgentInputUserMessage(visibleContent, SenderType.AGENT, null, {
    message_id: messageId,
    recipient_input_message_id: messageId,
    dedupe_key: dedupeKey,
    input_origin: "inter_agent_delivery",
    sender_agent_id: request.sender.participant.identity.agentRunId,
    sender_agent_name: request.sender.participant.displayName,
    sender_member_address: request.senderIdentity.memberAddress,
    receiver_member_address: request.receiverIdentity.memberAddress,
    original_message_type: messageType(request.messageType),
    team_run_id: request.rootTeamRunId,
    ...(request.parentCommunicationMessageId ? { parent_communication_message_id: request.parentCommunicationMessageId } : {}),
    reference_files: files,
  });
};
