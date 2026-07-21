import type { MemoryTraceEvent } from "../domain/models.js";
import type { RawTraceMedia } from "autobyteus-ts/memory/models/raw-trace-item.js";

export type RawTraceRecord = Record<string, unknown>;

const asFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const toRawTraceMedia = (value: unknown): RawTraceMedia | null => {
  const record = asRecord(value);
  if (!record) return null;
  const media: RawTraceMedia = {};
  for (const key of ["images", "audio", "video"] as const) {
    const locators = record[key];
    if (Array.isArray(locators)) {
      const normalized = locators.filter((locator): locator is string => (
        typeof locator === "string" && locator.trim().length > 0
      ));
      if (normalized.length) media[key] = normalized;
    }
  }
  return Object.keys(media).length ? media : null;
};

const traceId = (item: RawTraceRecord): string =>
  asString(item["id"]) ?? "";

const traceTs = (item: RawTraceRecord): number =>
  asFiniteNumber(item["ts"]) ?? 0;

const traceSeq = (item: RawTraceRecord): number =>
  asFiniteNumber(item["seq"]) ?? 0;

export const compareRawTraceRecords = (a: RawTraceRecord, b: RawTraceRecord): number => {
  const tsDiff = traceTs(a) - traceTs(b);
  if (tsDiff !== 0) return tsDiff;

  const turnDiff = (asString(a["turn_id"]) ?? "").localeCompare(asString(b["turn_id"]) ?? "");
  if (turnDiff !== 0) return turnDiff;

  const seqDiff = traceSeq(a) - traceSeq(b);
  if (seqDiff !== 0) return seqDiff;

  return traceId(a).localeCompare(traceId(b));
};

export const sortRawTraceRecords = (records: RawTraceRecord[]): RawTraceRecord[] =>
  [...records].sort(compareRawTraceRecords);

export const applyRawTraceLimit = <T>(items: T[], limit?: number | null): T[] => {
  if (!limit || limit <= 0) {
    return items;
  }
  return items.slice(-limit);
};

export const toMemoryTraceEvent = (trace: RawTraceRecord): MemoryTraceEvent => {
  const event: MemoryTraceEvent = {
    id: asString(trace["id"]),
    traceType: asString(trace["trace_type"]) ?? "",
    sourceEvent: asString(trace["source_event"]),
    content: asString(trace["content"]),
    toolName: asString(trace["tool_name"]),
    toolCallId: asString(trace["tool_call_id"]),
    toolArgs: asRecord(trace["tool_args"]),
    media: toRawTraceMedia(trace["media"]),
    turnId: asString(trace["turn_id"]) ?? "",
    seq: traceSeq(trace),
    ts: traceTs(trace),
  };
  if (Object.prototype.hasOwnProperty.call(trace, "tool_result")) {
    event.toolResult = trace["tool_result"];
  }
  if (Object.prototype.hasOwnProperty.call(trace, "tool_error")) {
    event.toolError = asString(trace["tool_error"]);
  }
  return event;
};

export const normalizeRawTraceRecords = (
  records: RawTraceRecord[],
  limit?: number | null,
): MemoryTraceEvent[] =>
  applyRawTraceLimit(sortRawTraceRecords(records), limit).map((trace) => toMemoryTraceEvent(trace));
