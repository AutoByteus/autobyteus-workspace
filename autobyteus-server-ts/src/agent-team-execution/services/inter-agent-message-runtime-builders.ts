import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import type { InterAgentMessageDeliveryRequest } from "../domain/inter-agent-message-delivery.js";
import {
  buildTeamCommunicationMessageId,
  buildTeamCommunicationReferenceId,
} from "../../services/team-communication/team-communication-identity.js";
import { inferTeamCommunicationReferenceFileType } from "../../services/team-communication/team-communication-normalizer.js";
import {
  buildTeamMemberInputDedupeKey,
  buildTeamMemberInputMessageId,
} from "./team-member-input-event-builder.js";

const resolveMessageType = (value: string | null | undefined): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "agent_message";
  }
  return value.trim();
};

const normalizeReferenceFiles = (
  referenceFiles: string[] | null | undefined,
): string[] => {
  if (!Array.isArray(referenceFiles)) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of referenceFiles) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
};

export const buildInterAgentMessageReferenceFileEntries = (input: {
  teamRunId: string;
  messageId: string;
  referenceFiles: string[];
  timestamp: string;
}) => input.referenceFiles.map((filePath) => ({
  referenceId: buildTeamCommunicationReferenceId({
    teamRunId: input.teamRunId,
    messageId: input.messageId,
    path: filePath,
  }),
  path: filePath,
  type: inferTeamCommunicationReferenceFileType(filePath),
  createdAt: input.timestamp,
  updatedAt: input.timestamp,
}));

const buildReferenceFilesBlock = (referenceFiles: string[]): string =>
  referenceFiles.length === 0
    ? ""
    : `\n\nReference files:\n${referenceFiles.map((filePath) => `- ${filePath}`).join("\n")}`;

export const buildRecipientVisibleInterAgentMessageContent = (
  request: InterAgentMessageDeliveryRequest,
): string => {
  const sender = request.sender.participant;
  const senderName = sender.memberName?.trim() || sender.memberRunId;
  const referenceFiles = normalizeReferenceFiles(request.referenceFiles);
  return (
    `You received a message from sender name: ${senderName}, sender id: ${sender.memberRunId}\n` +
    `message:\n${request.content}${buildReferenceFilesBlock(referenceFiles)}`
  );
};

export const buildInterAgentDeliveryInputMessage = (
  request: InterAgentMessageDeliveryRequest,
): AgentInputUserMessage => {
  const referenceFiles = normalizeReferenceFiles(request.referenceFiles);
  const sender = request.sender.participant;
  const recipient = request.recipient.participant;
  const visibleContent = buildRecipientVisibleInterAgentMessageContent(request);
  const messageId = request.recipientInputMessageId?.trim() || buildTeamMemberInputMessageId({
    teamRunId: request.teamRunId,
    memberRunId: recipient.memberRunId,
    memberRouteKey: recipient.memberRouteKey,
    content: visibleContent,
    receivedAt: request.parentCommunicationMessageId ?? "",
    parentCommunicationMessageId: request.parentCommunicationMessageId ?? null,
  });
  const dedupeKey = request.recipientInputDedupeKey?.trim() || buildTeamMemberInputDedupeKey({
    teamRunId: request.teamRunId,
    memberRouteKey: recipient.memberRouteKey,
    messageId,
  });
  return new AgentInputUserMessage(
    visibleContent,
    SenderType.AGENT,
    null,
    {
      message_id: messageId,
      recipient_input_message_id: messageId,
      dedupe_key: dedupeKey,
      input_origin: "inter_agent_delivery",
      sender_agent_id: sender.memberRunId,
      sender_agent_name: sender.memberName,
      sender_route_key: sender.memberRouteKey,
      sender_member_route_key: sender.memberRouteKey,
      sender_path: sender.memberPath,
      sender_member_path: sender.memberPath,
      original_message_type: resolveMessageType(request.messageType),
      team_run_id: request.teamRunId,
      receiver_route_key: recipient.memberRouteKey,
      receiver_member_route_key: recipient.memberRouteKey,
      receiver_path: recipient.memberPath,
      receiver_member_path: recipient.memberPath,
      ...(request.parentCommunicationMessageId ? {
        parent_communication_message_id: request.parentCommunicationMessageId,
      } : {}),
      reference_files: referenceFiles,
    },
  );
};

export const buildInterAgentMessageAgentRunEvent = (input: {
  recipientRunId: string;
  request: InterAgentMessageDeliveryRequest;
  createdAt?: string | null;
}): AgentRunEvent => {
  const messageType = resolveMessageType(input.request.messageType);
  const createdAt =
    typeof input.createdAt === "string" && input.createdAt.trim().length > 0
      ? input.createdAt.trim()
      : new Date().toISOString();
  const sender = input.request.sender.participant;
  const recipient = input.request.recipient.participant;
  const messageId = buildTeamCommunicationMessageId({
    teamRunId: input.request.teamRunId,
    senderRunId: sender.memberRunId,
    receiverRunId: input.recipientRunId,
    messageType,
    content: input.request.content,
    createdAt,
  });
  const referenceFiles = normalizeReferenceFiles(input.request.referenceFiles);

  return {
    eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
    runId: input.recipientRunId,
    payload: {
      message_id: messageId,
      team_run_id: input.request.teamRunId,
      sender_agent_id: sender.memberRunId,
      sender_agent_name: sender.memberName,
      sender_route_key: sender.memberRouteKey,
      sender_member_route_key: sender.memberRouteKey,
      sender_path: sender.memberPath,
      sender_member_path: sender.memberPath,
      receiver_run_id: input.recipientRunId,
      receiver_agent_name: recipient.memberName,
      receiver_member_route_key: recipient.memberRouteKey,
      receiver_member_path: recipient.memberPath,
      recipient_role_name: recipient.memberName,
      content: input.request.content,
      message_type: messageType,
      reference_files: referenceFiles,
      reference_file_entries: buildInterAgentMessageReferenceFileEntries({
        teamRunId: input.request.teamRunId,
        messageId,
        referenceFiles,
        timestamp: createdAt,
      }),
      created_at: createdAt,
    },
    statusHint: null,
  };
};
