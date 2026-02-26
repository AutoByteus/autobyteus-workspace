import {
  AssistantCompleteResponseData,
  ErrorEventData,
  ToolInteractionLogEntryData,
  ToolApprovalRequestedData,
  ToolExecutionStartedData,
  ToolDeniedData,
  ToolExecutionSucceededData,
  ToolExecutionFailedData,
  SystemTaskNotificationData
} from '../../../agent/streaming/events/stream-event-payloads.js';
import {
  ASSISTANT_ICON,
  TOOL_ICON,
  PROMPT_ICON,
  ERROR_ICON,
  LOG_ICON,
  SYSTEM_TASK_ICON
} from './shared.js';

export const renderAssistantCompleteResponse = (data: AssistantCompleteResponseData): string[] => {
  const entries: string[] = [];
  if (data.reasoning) {
    entries.push(`<Thinking>\n${data.reasoning}\n</Thinking>`);
  }
  if (data.content) {
    entries.push(`${ASSISTANT_ICON} assistant: ${data.content}`);
  }
  return entries;
};

export const renderToolInteractionLog = (data: ToolInteractionLogEntryData): string => {
  return `${LOG_ICON} [tool-log] ${data.log_entry}`;
};

export const renderToolExecutionStarted = (data: ToolExecutionStartedData): string => {
  let argsStr = '';
  try {
    argsStr = JSON.stringify(data.arguments ?? {}, null, 2);
  } catch {
    argsStr = String(data.arguments ?? {});
  }
  return `${TOOL_ICON} Executing tool '${data.tool_name}' with arguments:\n${argsStr}`;
};

export const renderToolApprovalRequest = (data: ToolApprovalRequestedData): string => {
  let argsStr = '';
  try {
    argsStr = JSON.stringify(data.arguments, null, 2);
  } catch {
    argsStr = String(data.arguments);
  }
  return `${PROMPT_ICON} Requesting approval for tool '${data.tool_name}' with arguments:\n${argsStr}`;
};

export const renderToolDenied = (data: ToolDeniedData): string => {
  const reason = data.reason ?? data.error ?? 'Tool execution denied.';
  return `${ERROR_ICON} Tool '${data.tool_name}' denied: ${reason}`;
};

export const renderToolExecutionSucceeded = (data: ToolExecutionSucceededData): string => {
  return `${TOOL_ICON} Tool '${data.tool_name}' completed successfully.`;
};

export const renderToolExecutionFailed = (data: ToolExecutionFailedData): string => {
  return `${ERROR_ICON} Tool '${data.tool_name}' failed: ${data.error}`;
};

export const renderError = (data: ErrorEventData): string => {
  const details = data.details ? `\nDetails: ${data.details}` : '';
  return `${ERROR_ICON} Error from ${data.source}: ${data.message}${details}`;
};

export const renderSystemTaskNotification = (data: SystemTaskNotificationData): string => {
  return `${SYSTEM_TASK_ICON} System Task Notification: ${data.content}`;
};
