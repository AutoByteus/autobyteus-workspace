export const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asContentString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const normalizeTimestampSeconds = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value > 10_000_000_000 ? value / 1000 : value;
  }
  const text = asString(value);
  if (!text) {
    return null;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed / 1000 : null;
};

export const extractTurnId = (payload: Record<string, unknown>): string | null =>
  asString(payload["turnId"]) ?? asString(payload["turn_id"]);

export const extractSegmentId = (payload: Record<string, unknown>): string | null =>
  asString(payload["id"]) ?? asString(payload["segment_id"]);

export const extractContentDelta = (payload: Record<string, unknown>): string | null =>
  asContentString(payload["delta"]) ??
  asContentString(payload["content"]) ??
  asContentString(payload["text"]) ??
  asContentString(payload["message"]);

export const extractTimestamp = (payload: Record<string, unknown>): number | null =>
  normalizeTimestampSeconds(payload["ts"]) ??
  normalizeTimestampSeconds(payload["timestamp"]) ??
  normalizeTimestampSeconds(payload["createdAt"]) ??
  normalizeTimestampSeconds(payload["created_at"]);

export const extractInvocationId = (payload: Record<string, unknown>): string | null =>
  asString(payload["invocation_id"]) ??
  asString(payload["tool_invocation_id"]) ??
  asString(payload["tool_call_id"]) ??
  asString(payload["call_id"]);

export const extractToolName = (payload: Record<string, unknown>): string | null => {
  const metadata = asRecord(payload["metadata"]);
  return asString(payload["tool_name"]) ?? asString(payload["name"]) ?? asString(metadata?.["tool_name"]);
};

export const extractToolArgs = (payload: Record<string, unknown>): Record<string, unknown> | null =>
  asRecord(payload["arguments"]) ?? asRecord(payload["tool_args"]) ?? asRecord(payload["args"]);

export const extractToolResult = (payload: Record<string, unknown>): unknown =>
  payload["result"] ?? payload["tool_result"] ?? null;

export const extractError = (payload: Record<string, unknown>): string | null =>
  asString(payload["error"]) ?? asString(payload["tool_error"]);

export const extractReason = (payload: Record<string, unknown>): string | null =>
  asString(payload["reason"]);

export const asBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

export const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
