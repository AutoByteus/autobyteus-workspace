export const SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY = 'suppress_system_task_notification';

export const shouldSuppressSystemTaskNotification = (
  metadata: Record<string, unknown> | null | undefined,
): boolean => metadata?.[SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY] === true;
