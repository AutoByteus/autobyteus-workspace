import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";


export const TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_METADATA_KEY = "task_delegation_system_task_notification";
export const TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_DISPLAY_CONTENT_METADATA_KEY = "task_delegation_system_task_notification_display_content";

type TaskDelegationSystemTaskNotificationMetadataOptions = {
  displayContent?: string | null;
};

const normalizeDisplayContent = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const markTaskDelegationSystemTaskNotificationMetadata = (
  metadata: Record<string, unknown>,
  options: TaskDelegationSystemTaskNotificationMetadataOptions = {},
): Record<string, unknown> => {
  const displayContent = normalizeDisplayContent(options.displayContent);
  return {
    ...metadata,
    [TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_METADATA_KEY]: true,
    [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true,
    ...(displayContent
      ? { [TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_DISPLAY_CONTENT_METADATA_KEY]: displayContent }
      : {}),
  };
};

export const isTaskDelegationSystemTaskNotificationMessage = (
  message: AgentInputUserMessage,
): boolean => (
  message.senderType === SenderType.SYSTEM &&
  message.metadata[TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_METADATA_KEY] === true
);

export const getTaskDelegationSystemTaskNotificationDisplayContent = (
  message: AgentInputUserMessage,
): string | null =>
  normalizeDisplayContent(
    message.metadata[TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_DISPLAY_CONTENT_METADATA_KEY],
  );
