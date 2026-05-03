import {
  asObject,
  asString,
} from "./claude-runtime-shared.js";

export const normalizeSessionMessages = (value: unknown): Array<Record<string, unknown>> => {
  if (!value) {
    return [];
  }

  const payload = asObject(value);
  const rows = Array.isArray(value)
    ? value
    : Array.isArray(payload?.messages)
      ? (payload.messages as unknown[])
      : Array.isArray(payload?.data)
        ? (payload.data as unknown[])
        : [];

  return rows
    .map((row) => asObject(row))
    .filter((row): row is Record<string, unknown> => row !== null);
};

export const resolveClaudeStreamChunkSessionId = (chunk: unknown): string | null => {
  const payload = asObject(chunk);
  if (!payload) {
    return null;
  }
  return (
    asString(payload.sessionId) ??
    asString(payload.session_id) ??
    asString(payload.threadId) ??
    asString(payload.thread_id) ??
    null
  );
};
