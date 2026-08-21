import { createHash } from "node:crypto";
import type { EventMonitorReplayEvent } from "./historical-replay-event-types.js";

export const ACTIVE_TRACE_EARLIER_PAGE_SIZE = 50;
export const ACTIVE_TRACE_LATEST_WINDOW_SIZE = 100;

type CursorPayload = {
  version: 1;
  subjectFingerprint: string;
  activeGeneration: string;
  beforeEventId: string;
};

export type ActiveTracePageSelection = {
  events: EventMonitorReplayEvent[];
  beforeCursor: string | null;
  hasEarlier: boolean;
  loadedEarlierCount: number;
  cursorStatus: "VALID" | "EXPIRED";
};

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");
export const buildActiveTraceSubjectFingerprint = (canonicalSubject: string): string =>
  sha256(`event-monitor-active-trace-subject:v1:${canonicalSubject}`);
export const buildActiveTraceGeneration = (parts: {
  device: string | null;
  inode: string | null;
  manifestGeneration: string | null;
  earliestEventId: string | null;
}): string => sha256([
  "event-monitor-active-generation:v1", parts.device ?? "", parts.inode ?? "",
  parts.manifestGeneration ?? "", parts.earliestEventId ?? "",
].join("\u0000"));

const encodeCursor = (payload: CursorPayload): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const decodeCursor = (cursor: string): CursorPayload => {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid active-trace page cursor.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid active-trace page cursor.");
  }
  const payload = value as Record<string, unknown>;
  const keys = Object.keys(payload).sort().join(",");
  if (keys !== "activeGeneration,beforeEventId,subjectFingerprint,version"
    || payload["version"] !== 1
    || typeof payload["subjectFingerprint"] !== "string"
    || typeof payload["activeGeneration"] !== "string"
    || typeof payload["beforeEventId"] !== "string"
    || !payload["subjectFingerprint"] || !payload["activeGeneration"] || !payload["beforeEventId"]) {
    throw new Error("Invalid active-trace page cursor.");
  }
  return payload as CursorPayload;
};

const cursorForIndex = (
  events: readonly EventMonitorReplayEvent[], index: number, subjectFingerprint: string, activeGeneration: string,
): string | null => {
  const anchor = events[index];
  return index > 0 && anchor ? encodeCursor({
    version: 1, subjectFingerprint, activeGeneration, beforeEventId: anchor.eventId,
  }) : null;
};

export const selectActiveTraceEventPage = (input: {
  events: readonly EventMonitorReplayEvent[];
  beforeCursor?: string | null;
  subjectFingerprint: string;
  activeGeneration: string;
}): ActiveTracePageSelection => {
  const { events, subjectFingerprint, activeGeneration } = input;
  if (!input.beforeCursor) {
    const latestStart = Math.max(0, events.length - ACTIVE_TRACE_LATEST_WINDOW_SIZE);
    const start = Math.max(0, latestStart - ACTIVE_TRACE_EARLIER_PAGE_SIZE);
    return {
      events: events.slice(start),
      beforeCursor: cursorForIndex(events, start, subjectFingerprint, activeGeneration),
      hasEarlier: start > 0,
      loadedEarlierCount: latestStart - start,
      cursorStatus: "VALID",
    };
  }
  const cursor = decodeCursor(input.beforeCursor);
  if (cursor.subjectFingerprint !== subjectFingerprint) {
    throw new Error("Active-trace page cursor does not belong to this run subject.");
  }
  if (cursor.activeGeneration !== activeGeneration) {
    return { events: [], beforeCursor: null, hasEarlier: false, loadedEarlierCount: 0, cursorStatus: "EXPIRED" };
  }
  const anchor = events.findIndex((event) => event.eventId === cursor.beforeEventId);
  if (anchor < 0) {
    return { events: [], beforeCursor: null, hasEarlier: false, loadedEarlierCount: 0, cursorStatus: "EXPIRED" };
  }
  const start = Math.max(0, anchor - ACTIVE_TRACE_EARLIER_PAGE_SIZE);
  return {
    events: events.slice(start, anchor),
    beforeCursor: cursorForIndex(events, start, subjectFingerprint, activeGeneration),
    hasEarlier: start > 0,
    loadedEarlierCount: anchor - start,
    cursorStatus: "VALID",
  };
};
