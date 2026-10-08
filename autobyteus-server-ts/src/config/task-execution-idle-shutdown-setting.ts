import { appConfigProvider } from "./app-config-provider.js";

export const TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_SETTING_KEY =
  "AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS";
export const DEFAULT_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS = 600_000;
export const MIN_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS = 60_000;
export const MAX_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS = 86_400_000;

const parseGracePeriod = (rawValue: string | undefined): number | null => {
  const normalized = rawValue?.trim() ?? "";
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  if (
    !Number.isSafeInteger(value)
    || value < MIN_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS
    || value > MAX_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS
  ) return null;
  return value;
};

/** Read at arm time so a changed server setting applies to the next quiet moment. */
export const resolveTaskExecutionIdleShutdownGraceMs = (
  rawValue: string | undefined = appConfigProvider.config.get(TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_SETTING_KEY),
): number => parseGracePeriod(rawValue) ?? DEFAULT_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS;

export const normalizeTaskExecutionIdleShutdownGraceForPersistence = (
  rawValue: string,
): [true, string] | [false, string] => {
  const parsed = parseGracePeriod(rawValue);
  if (parsed === null) {
    return [
      false,
      `Delegated agent idle shutdown grace period must be a whole number from ${MIN_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS} through ${MAX_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS} milliseconds.`,
    ];
  }
  return [true, String(parsed)];
};
