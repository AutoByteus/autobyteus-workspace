export type WatcherRuntimeEventType = "add" | "addDir" | "unlink" | "unlinkDir" | "change";

export type RawWatchEvent = {
  eventType: WatcherRuntimeEventType;
  path: string;
  isDirectory: boolean;
};

export type WatcherRuntimeStats = {
  watchedDirectoryCount?: number;
  watchedEntryCount?: number;
};

export type WatcherRuntimeStartCommand = {
  type: "start";
  watcherId: string;
  generation: number;
  workspaceRootPath: string;
};

export type WatcherRuntimeStopCommand = {
  type: "stop";
  watcherId: string;
  generation: number;
  reason?: string;
};

export type WatcherRuntimeShutdownCommand = {
  type: "shutdown";
  watcherId: string;
  generation: number;
  reason?: string;
};

export type WatcherRuntimeCommand =
  | WatcherRuntimeStartCommand
  | WatcherRuntimeStopCommand
  | WatcherRuntimeShutdownCommand;

export type WatcherRuntimeReadyMessage = {
  type: "ready";
  watcherId: string;
  generation: number;
  stats: WatcherRuntimeStats;
  startDurationMs: number;
};

export type WatcherRuntimeRawEventMessage = {
  type: "rawEvent";
  watcherId: string;
  generation: number;
  event: RawWatchEvent;
};

export type WatcherRuntimeErrorMessage = {
  type: "error";
  watcherId: string;
  generation: number;
  message: string;
  stack?: string;
};

export type WatcherRuntimeStoppedMessage = {
  type: "stopped";
  watcherId: string;
  generation: number;
  reason?: string;
  stats: WatcherRuntimeStats;
  closeDurationMs: number;
};

export type WatcherRuntimeLogMessage = {
  type: "log";
  watcherId: string;
  generation: number;
  level: "info" | "warn" | "error";
  message: string;
};

export type WatcherRuntimeMessage =
  | WatcherRuntimeReadyMessage
  | WatcherRuntimeRawEventMessage
  | WatcherRuntimeErrorMessage
  | WatcherRuntimeStoppedMessage
  | WatcherRuntimeLogMessage;

const eventTypeValues = new Set<WatcherRuntimeEventType>([
  "add",
  "addDir",
  "unlink",
  "unlinkDir",
  "change",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasIdentity = (
  value: Record<string, unknown>,
): value is Record<string, unknown> & { watcherId: string; generation: number } =>
  typeof value.watcherId === "string" && Number.isInteger(value.generation);

export const isRawWatchEvent = (value: unknown): value is RawWatchEvent => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.eventType === "string" &&
    eventTypeValues.has(value.eventType as WatcherRuntimeEventType) &&
    typeof value.path === "string" &&
    typeof value.isDirectory === "boolean"
  );
};

export const isWatcherRuntimeCommand = (value: unknown): value is WatcherRuntimeCommand => {
  if (!isRecord(value) || !hasIdentity(value)) {
    return false;
  }

  switch (value.type) {
    case "start":
      return typeof value.workspaceRootPath === "string" && value.workspaceRootPath.length > 0;
    case "stop":
    case "shutdown":
      return value.reason === undefined || typeof value.reason === "string";
    default:
      return false;
  }
};

export const isWatcherRuntimeMessage = (value: unknown): value is WatcherRuntimeMessage => {
  if (!isRecord(value) || !hasIdentity(value)) {
    return false;
  }

  switch (value.type) {
    case "ready":
      return isRecord(value.stats) && typeof value.startDurationMs === "number";
    case "rawEvent":
      return isRawWatchEvent(value.event);
    case "error":
      return (
        typeof value.message === "string" &&
        (value.stack === undefined || typeof value.stack === "string")
      );
    case "stopped":
      return (
        isRecord(value.stats) &&
        typeof value.closeDurationMs === "number" &&
        (value.reason === undefined || typeof value.reason === "string")
      );
    case "log":
      return (
        (value.level === "info" || value.level === "warn" || value.level === "error") &&
        typeof value.message === "string"
      );
    default:
      return false;
  }
};
