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
  const senderName =
    typeof request.senderMemberName === "string" && request.senderMemberName.trim().length > 0
      ? request.senderMemberName.trim()
      : request.senderRunId;
  const referenceFiles = normalizeReferenceFiles(request.referenceFiles);
  return (
    `You received a message from sender name: ${senderName}, sender id: ${request.senderRunId}\n` +
    `message:\n${request.content}${buildReferenceFilesBlock(referenceFiles)}`
  );
};

export const buildInterAgentDeliveryInputMessage = (
  request: InterAgentMessageDeliveryRequest,
): AgentInputUserMessage => {
  const referenceFiles = normalizeReferenceFiles(request.referenceFiles);
  return new AgentInputUserMessage(
    buildRecipientVisibleInterAgentMessageContent(request),
    SenderType.AGENT,
    null,
    {
      sender_agent_id: request.senderRunId,
      sender_agent_name: request.senderMemberName ?? null,
      ...(request.senderRouteKey ? {
        sender_route_key: request.senderRouteKey,
        sender_member_route_key: request.senderRouteKey,
      } : {}),
      ...(request.senderPath ? {
        sender_path: request.senderPath,
        sender_member_path: request.senderPath,
      } : {}),
      original_message_type: resolveMessageType(request.messageType),
      team_run_id: request.teamRunId,
      ...(request.recipientRouteKey ? {
        receiver_route_key: request.recipientRouteKey,
        receiver_member_route_key: request.recipientRouteKey,
      } : {}),
      ...(request.recipientPath ? {
        receiver_path: request.recipientPath,
        receiver_member_path: request.recipientPath,
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
  const messageId = buildTeamCommunicationMessageId({
    teamRunId: input.request.teamRunId,
    senderRunId: input.request.senderRunId,
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
      sender_agent_id: input.request.senderRunId,
      sender_agent_name: input.request.senderMemberName ?? null,
      ...(input.request.senderRouteKey ? {
        sender_route_key: input.request.senderRouteKey,
        sender_member_route_key: input.request.senderRouteKey,
      } : {}),
      ...(input.request.senderPath ? {
        sender_path: input.request.senderPath,
        sender_member_path: input.request.senderPath,
      } : {}),
      receiver_run_id: input.recipientRunId,
      receiver_agent_name: input.request.recipientMemberName ?? input.request.recipientRouteKey ?? null,
      ...(input.request.recipientRouteKey ? { receiver_member_route_key: input.request.recipientRouteKey } : {}),
      ...(input.request.recipientPath ? { receiver_member_path: input.request.recipientPath } : {}),
      recipient_role_name: input.request.recipientMemberName ?? input.request.recipientRouteKey ?? null,
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
