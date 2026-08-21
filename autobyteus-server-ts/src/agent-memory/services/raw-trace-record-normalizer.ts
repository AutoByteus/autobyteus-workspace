import {
  parseSystemInstructionTraceRecord,
  SYSTEM_INSTRUCTION_TRACE_TYPE,
} from "autobyteus-ts";
import type { MemoryTraceEvent, MemoryTurnTraceEvent } from "../domain/models.js";
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

const traceTs = (item: RawTraceRecord): number =>
  asFiniteNumber(item["ts"]) ?? 0;

const traceSeq = (item: RawTraceRecord): number =>
  asFiniteNumber(item["seq"]) ?? 0;

export const applyRawTraceLimit = <T>(items: T[], limit?: number | null): T[] => {
  if (!limit || limit <= 0) {
    return items;
  }
  return items.slice(-limit);
};

export const toMemoryTraceEvent = (trace: RawTraceRecord): MemoryTurnTraceEvent => {
  const event: MemoryTurnTraceEvent = {
    scope: "turn",
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
): MemoryTraceEvent[] => {
  const normalizedWithOrdinal: Array<{ event: MemoryTraceEvent; ordinal: number }> = [];
  for (const [ordinal, record] of records.entries()) {
    if (record.trace_type !== SYSTEM_INSTRUCTION_TRACE_TYPE) {
      normalizedWithOrdinal.push({ event: toMemoryTraceEvent(record), ordinal });
      continue;
    }
    const parsed = parseSystemInstructionTraceRecord(record);
    if (!parsed) {
      console.warn('[RawTraceRecordNormalizer] omitted malformed system instruction trace row.');
      continue;
    }
    normalizedWithOrdinal.push({
      event: {
        scope: "run",
        id: parsed.id,
        traceType: parsed.trace_type,
        sourceEvent: parsed.source_event,
        content: parsed.content,
        turnId: null,
        seq: null,
        ts: parsed.ts,
      },
      ordinal,
    });
  }

  const runScopedTimestamps = new Set(normalizedWithOrdinal.flatMap(({ event }) => (
    event.scope === "run" ? [event.ts] : []
  )));
  const normalized = normalizedWithOrdinal.sort((leftEntry, rightEntry) => {
    const left = leftEntry.event;
    const right = rightEntry.event;
    if (left.ts !== right.ts) return left.ts - right.ts;
    if (runScopedTimestamps.has(left.ts)) return leftEntry.ordinal - rightEntry.ordinal;
    if (left.scope === "run" || right.scope === "run") return leftEntry.ordinal - rightEntry.ordinal;
    const turnDiff = left.turnId.localeCompare(right.turnId);
    if (turnDiff !== 0) return turnDiff;
    if (left.seq !== right.seq) return left.seq - right.seq;
    return (left.id ?? "").localeCompare(right.id ?? "");
  }).map(({ event }) => event);
  return applyRawTraceLimit(normalized, limit);
};
