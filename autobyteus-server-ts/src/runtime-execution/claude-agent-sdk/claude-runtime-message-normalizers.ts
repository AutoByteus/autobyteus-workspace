import {
  asNonEmptyRawString,
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

export const normalizeClaudeStreamChunk = (
  chunk: unknown,
): { sessionId: string | null; delta: string | null; source: "stream_delta" | "assistant_message" | "result" | "unknown" } => {
  if (typeof chunk === "string") {
    return {
      sessionId: null,
      delta: chunk,
      source: "stream_delta",
    };
  }

  const payload = asObject(chunk);
  if (!payload) {
    return {
      sessionId: null,
      delta: null,
      source: "unknown",
    };
  }

  const sessionId =
    asString(payload.sessionId) ??
    asString(payload.session_id) ??
    asString(payload.threadId) ??
    asString(payload.thread_id) ??
    null;

  const delta =
    asNonEmptyRawString(payload.delta) ??
    asNonEmptyRawString(payload.textDelta) ??
    asNonEmptyRawString(payload.text_delta) ??
    asNonEmptyRawString(payload.output_text_delta) ??
    null;

  if (delta) {
    return { sessionId, delta, source: "stream_delta" };
  }

  const nested = asObject(payload.message) ?? asObject(payload.content) ?? null;
  const nestedDelta =
    asNonEmptyRawString(nested?.delta) ??
    asNonEmptyRawString(nested?.textDelta) ??
    asNonEmptyRawString(nested?.text_delta) ??
    null;
  if (nestedDelta) {
    return {
      sessionId,
      delta: nestedDelta,
      source: "stream_delta",
    };
  }

  const assistantMessage = asObject(payload.message);
  const assistantMessageText = extractAssistantMessageText(assistantMessage);
  if (assistantMessageText) {
    return {
      sessionId,
      delta: assistantMessageText,
      source: "assistant_message",
    };
  }

  const fallbackResult =
    asNonEmptyRawString(payload.result) ?? asNonEmptyRawString(payload.text) ?? null;
  if (fallbackResult) {
    return {
      sessionId,
      delta: fallbackResult,
      source: "result",
    };
  }

  return {
    sessionId,
    delta: null,
    source: "unknown",
  };
};

const extractAssistantMessageText = (messagePayload: Record<string, unknown> | null): string | null => {
  if (!messagePayload) {
    return null;
  }

  const content = messagePayload.content;
  if (typeof content === "string" && content.length > 0) {
    return content;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const textParts: string[] = [];
  for (const entry of content) {
    if (typeof entry === "string" && entry.length > 0) {
      textParts.push(entry);
      continue;
    }

    const block = asObject(entry);
    if (!block) {
      continue;
    }

    const text =
      asNonEmptyRawString(block.text) ??
      asNonEmptyRawString(block.delta) ??
      asNonEmptyRawString(block.textDelta) ??
      asNonEmptyRawString(block.text_delta) ??
      null;
    if (text) {
      textParts.push(text);
    }
  }

  return textParts.length > 0 ? textParts.join("") : null;
};
