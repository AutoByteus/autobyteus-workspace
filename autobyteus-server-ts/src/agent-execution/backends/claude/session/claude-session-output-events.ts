import {
  asObject,
  asString,
  type ClaudeSessionEvent,
} from "../claude-runtime-shared.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";

export const resolveClaudeIncrementalDelta = (options: {
  normalizedDelta: string;
  source: "stream_delta" | "assistant_message" | "result" | "unknown";
  assistantOutput: string;
  hasObservedStreamingDelta: boolean;
}): string | null => {
  const {
    normalizedDelta,
    source,
    assistantOutput,
    hasObservedStreamingDelta,
  } = options;

  if (source === "stream_delta") {
    return normalizedDelta;
  }

  if (source === "result" && assistantOutput.length > 0 && !hasObservedStreamingDelta) {
    return null;
  }

  if (!hasObservedStreamingDelta || (source !== "assistant_message" && source !== "result")) {
    return normalizedDelta;
  }

  if (normalizedDelta.startsWith(assistantOutput)) {
    const suffix = normalizedDelta.slice(assistantOutput.length);
    return suffix.length > 0 ? suffix : null;
  }

  if (assistantOutput.startsWith(normalizedDelta)) {
    return null;
  }

  return null;
};

export const isClaudeTurnTerminalChunk = (chunk: unknown): boolean => {
  const payload =
    chunk && typeof chunk === "object" && !Array.isArray(chunk)
      ? (chunk as Record<string, unknown>)
      : null;
  return asString(payload?.type)?.toLowerCase() === "result";
};

export const buildClaudeProviderCompactionEvent = (input: {
  chunk: unknown;
  turnId: string;
  sessionId: string;
}): ClaudeSessionEvent | null => {
  const payload = asObject(input.chunk);
  if (!payload) {
    return null;
  }
  const nested = asObject(payload.message) ?? asObject(payload.event) ?? payload;
  const type = asString(nested.type)?.toLowerCase() ?? asString(payload.type)?.toLowerCase();
  const status = asString(nested.status)?.toLowerCase() ?? asString(payload.status)?.toLowerCase();
  const baseParams = {
    ...payload,
    turnId: input.turnId,
    sessionId: input.sessionId,
  };
  if (type === "compact_boundary" || Boolean(nested.compact_boundary) || Boolean(payload.compact_boundary)) {
    return {
      method: ClaudeSessionEventName.COMPACT_BOUNDARY,
      params: baseParams,
    };
  }
  if (status === "compacting") {
    return {
      method: ClaudeSessionEventName.STATUS_COMPACTING,
      params: baseParams,
    };
  }
  return null;
};
