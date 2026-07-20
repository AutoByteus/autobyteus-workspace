import { Buffer } from "node:buffer";
import type { HistoricalReplayEvent, HistoricalReplayToolEvent } from "./historical-replay-event-types.js";
import type {
  EventMonitorActiveTraceAttachment,
  EventMonitorActiveTracePageEvent,
  EventMonitorActiveTracePageVisual,
  EventMonitorMediaType,
  EventMonitorToolStatusKey,
  EventMonitorToolSummaryArgs,
} from "./event-monitor-active-trace-page-types.js";

const SUMMARY_KEYS = [
  "path", "file_path", "filepath", "filename", "target_path", "command", "cmd", "script",
  "query", "prompt", "url", "message", "text", "title", "name", "raw",
] as const;
const FILE_KEYS = new Set(["path", "file_path", "filepath", "filename", "target_path"]);
const COMMAND_KEYS = new Set(["command", "cmd", "script"]);

const visualId = (eventId: string, kind: string, ordinal: number): string =>
  `active-trace-visual:v1:${Buffer.from(eventId, "utf8").toString("base64url")}:${kind}:${ordinal}`;

const ownString = (record: Record<string, unknown> | null, key: string): string | null => {
  if (!record) return null;
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "string") return null;
  const value = descriptor.value.trim();
  return value || null;
};

const summaryArgs = (event: HistoricalReplayToolEvent): EventMonitorToolSummaryArgs => {
  const allowed = event.activityType === "write_file" || event.activityType === "edit_file"
    ? SUMMARY_KEYS.filter((key) => FILE_KEYS.has(key))
    : event.activityType === "terminal_command"
      ? SUMMARY_KEYS.filter((key) => COMMAND_KEYS.has(key))
      : SUMMARY_KEYS;
  const output: EventMonitorToolSummaryArgs = {};
  for (const key of allowed) {
    const value = ownString(event.toolArgs, key);
    if (value !== null) output[key] = value;
  }
  return output;
};

const statusKey = (status: HistoricalReplayToolEvent["status"]): EventMonitorToolStatusKey => {
  if (status === "parsing" || status === "executing") return "running";
  if (["success", "error", "approved", "awaiting-approval", "denied"].includes(status)) {
    return status as EventMonitorToolStatusKey;
  }
  return "default";
};

const normalizedMedia = (media: Record<string, string[]> | null): Array<[EventMonitorMediaType, string[]]> => {
  if (!media) return [];
  return (["image", "audio", "video"] as const).flatMap((kind) => {
    const urls = Array.isArray(media[kind]) ? media[kind].filter((url) => typeof url === "string") : [];
    return urls.length ? [[kind, urls] as [EventMonitorMediaType, string[]]] : [];
  });
};

const appendMediaVisuals = (
  visuals: EventMonitorActiveTracePageVisual[],
  eventId: string,
  media: Record<string, string[]> | null,
): void => {
  for (const [mediaType, urls] of normalizedMedia(media)) {
    visuals.push({
      kind: "media", visualId: visualId(eventId, `media-${mediaType}`, 0), eventId, kindOrdinal: 0,
      mediaType, urls: [...urls],
    });
  }
};

const userAttachments = (eventId: string, media: Record<string, string[]> | null): EventMonitorActiveTraceAttachment[] => {
  const attachments: EventMonitorActiveTraceAttachment[] = [];
  for (const [mediaType, urls] of normalizedMedia(media)) {
    urls.forEach((locator, ordinal) => attachments.push({
      attachmentId: `${visualId(eventId, "user", 0)}:attachment:${mediaType}:${ordinal}`,
      mediaType,
      locator,
    }));
  }
  return attachments;
};

export const buildEventMonitorActiveTracePageEvent = (
  event: HistoricalReplayEvent,
): EventMonitorActiveTracePageEvent => {
  const visuals: EventMonitorActiveTracePageVisual[] = [];
  if (event.kind === "message") {
    if (event.role === "user") {
      visuals.push({
        kind: "user", visualId: visualId(event.eventId, "user", 0), eventId: event.eventId,
        kindOrdinal: 0, text: event.content ?? "", attachments: userAttachments(event.eventId, event.media),
      });
    } else {
      if (event.content) visuals.push({
        kind: "assistant_text", visualId: visualId(event.eventId, "assistant-text", 0),
        eventId: event.eventId, kindOrdinal: 0, content: event.content,
      });
      appendMediaVisuals(visuals, event.eventId, event.media);
    }
  } else if (event.kind === "reasoning") {
    if (event.content) visuals.push({
      kind: "thinking", visualId: visualId(event.eventId, "thinking", 0),
      eventId: event.eventId, kindOrdinal: 0, content: event.content,
    });
    appendMediaVisuals(visuals, event.eventId, event.media);
  } else if (event.kind === "tool") {
    visuals.push({
      kind: "tool_card", visualId: visualId(event.eventId, "tool-card", 0), eventId: event.eventId,
      kindOrdinal: 0, invocationId: event.invocationId, cardKind: event.activityType,
      toolName: event.toolName, statusKey: statusKey(event.status), summaryArgs: summaryArgs(event),
      errorMessage: event.toolError, approvalTarget: null,
    });
    if (event.content) visuals.push({
      kind: "assistant_text", visualId: visualId(event.eventId, "assistant-text", 0),
      eventId: event.eventId, kindOrdinal: 0, content: event.content,
    });
    appendMediaVisuals(visuals, event.eventId, event.media);
  } else {
    visuals.push({
      kind: "compaction", visualId: visualId(event.eventId, "compaction", 0), eventId: event.eventId,
      kindOrdinal: 0, activityId: event.activityId, phase: event.phase, message: event.message,
      turnId: event.turnId, rawTraceCount: event.rawTraceCount,
      semanticFactCount: event.semanticFactCount, provider: event.provider,
    });
  }
  return {
    eventId: event.eventId,
    turnGroupId: event.turnGroupId,
    occurredAtMs: event.ts === null ? null : event.ts * 1000,
    visuals,
  };
};

export const buildEventMonitorActiveTracePageEvents = (
  events: readonly HistoricalReplayEvent[],
): EventMonitorActiveTracePageEvent[] => events.map(buildEventMonitorActiveTracePageEvent);
