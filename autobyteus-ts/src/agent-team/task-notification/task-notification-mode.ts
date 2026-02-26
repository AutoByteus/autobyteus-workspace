export enum TaskNotificationMode {
  AGENT_MANUAL_NOTIFICATION = 'agent_manual_notification',
  SYSTEM_EVENT_DRIVEN = 'system_event_driven'
}

export const ENV_TASK_NOTIFICATION_MODE = 'AUTOBYTEUS_TASK_NOTIFICATION_MODE';
export const DEFAULT_TASK_NOTIFICATION_MODE = TaskNotificationMode.AGENT_MANUAL_NOTIFICATION;

const VALID_TASK_NOTIFICATION_MODES: Record<string, TaskNotificationMode> = {
  [TaskNotificationMode.AGENT_MANUAL_NOTIFICATION]: TaskNotificationMode.AGENT_MANUAL_NOTIFICATION,
  [TaskNotificationMode.SYSTEM_EVENT_DRIVEN]: TaskNotificationMode.SYSTEM_EVENT_DRIVEN
};

export function resolveTaskNotificationMode(): TaskNotificationMode {
  const rawValue = process.env[ENV_TASK_NOTIFICATION_MODE];
  if (!rawValue) {
    return DEFAULT_TASK_NOTIFICATION_MODE;
  }
  const normalized = rawValue.trim().toLowerCase();
  return VALID_TASK_NOTIFICATION_MODES[normalized] ?? DEFAULT_TASK_NOTIFICATION_MODE;
}
