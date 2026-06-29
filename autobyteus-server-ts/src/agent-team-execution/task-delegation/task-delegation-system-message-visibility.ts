import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";

export const TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_METADATA_KEY = "task_delegation_system_task_notification";

export const markTaskDelegationSystemTaskNotificationMetadata = (
  metadata: Record<string, unknown>,
): Record<string, unknown> => ({
  ...metadata,
  [TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_METADATA_KEY]: true,
  [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true,
});

export const isTaskDelegationSystemTaskNotificationMessage = (
  message: AgentInputUserMessage,
): boolean => (
  message.senderType === SenderType.SYSTEM &&
  message.metadata[TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_METADATA_KEY] === true
);

export const buildTaskDelegationSystemTaskNotificationEvent = (
  runId: string,
  message: AgentInputUserMessage,
): AgentRunEvent => {
  const rawSenderId = message.metadata.sender_id;
  const senderId = typeof rawSenderId === "string" && rawSenderId.trim().length > 0
    ? rawSenderId
    : "system.task_delegation";

  return {
    eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
    runId,
    payload: {
      sender_id: senderId,
      content: message.content,
    },
    statusHint: null,
  };
};
