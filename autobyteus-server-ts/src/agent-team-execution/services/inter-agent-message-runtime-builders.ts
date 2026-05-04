import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import type { InterAgentMessageDeliveryRequest } from "../domain/inter-agent-message-delivery.js";

const resolveMessageType = (value: string | null | undefined): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "agent_message";
  }
  return value.trim();
};

export const buildRecipientVisibleInterAgentMessageContent = (
  request: InterAgentMessageDeliveryRequest,
): string => {
  const senderName =
    typeof request.senderMemberName === "string" && request.senderMemberName.trim().length > 0
      ? request.senderMemberName.trim()
      : request.senderRunId;
  return (
    `You received a message from sender name: ${senderName}, sender id: ${request.senderRunId}\n` +
    `message:\n${request.content}`
  );
};

export const buildInterAgentDeliveryInputMessage = (
  request: InterAgentMessageDeliveryRequest,
): AgentInputUserMessage =>
  new AgentInputUserMessage(buildRecipientVisibleInterAgentMessageContent(request), SenderType.AGENT, null, {
    sender_agent_id: request.senderRunId,
    sender_agent_name: request.senderMemberName ?? null,
    original_message_type: resolveMessageType(request.messageType),
    team_run_id: request.teamRunId,
  });

export const buildInterAgentMessageAgentRunEvent = (input: {
  recipientRunId: string;
  request: InterAgentMessageDeliveryRequest;
}): AgentRunEvent => ({
  eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
  runId: input.recipientRunId,
  payload: {
    team_run_id: input.request.teamRunId,
    sender_agent_id: input.request.senderRunId,
    sender_agent_name: input.request.senderMemberName ?? null,
    receiver_run_id: input.recipientRunId,
    receiver_agent_name: input.request.recipientMemberName,
    recipient_role_name: input.request.recipientMemberName,
    content: input.request.content,
    message_type: resolveMessageType(input.request.messageType),
  },
  statusHint: null,
});
