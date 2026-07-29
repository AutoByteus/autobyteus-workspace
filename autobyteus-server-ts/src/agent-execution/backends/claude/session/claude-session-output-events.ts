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

const AUTHENTICATION_FAILURE_MARKERS = [
  "authentication_failed",
  "not logged in",
  "please run /login",
] as const;

const resolveResultErrorText = (payload: Record<string, unknown>): string | null =>
  asString(payload.result) ??
  asString(payload.message) ??
  asString(payload.error_message) ??
  asString(payload.error) ??
  null;

export const resolveClaudeTurnTerminalError = (
  chunk: unknown,
): { code: string; message: string } | null => {
  if (!isClaudeTurnTerminalChunk(chunk)) {
    return null;
  }
  const payload = asObject(chunk);
  if (!payload) {
    return null;
  }
  const errorText = resolveResultErrorText(payload);
  const errorCode = asString(payload.error) ?? asString(payload.code);
  const searchable = [errorCode, errorText]
    .filter((value): value is string => Boolean(value))
    .join("\n")
    .toLowerCase();
  const isAuthenticationFailure = AUTHENTICATION_FAILURE_MARKERS.some((marker) =>
    searchable.includes(marker),
  );
  const isErrorResult =
    payload.is_error === true ||
    Boolean(errorCode) ||
    isAuthenticationFailure;
  if (!isErrorResult) {
    return null;
  }
  return {
    code: isAuthenticationFailure
      ? "CLAUDE_RUNTIME_AUTHENTICATION_FAILED"
      : "CLAUDE_RUNTIME_RESULT_ERROR",
    message: errorText ?? errorCode ?? "Claude runtime returned an error result.",
  };
};

export const buildClaudeTurnTerminalErrorEvent = (
  turnId: string,
  error: unknown,
): ClaudeSessionEvent => ({
  method: ClaudeSessionEventName.ERROR,
  params: {
    code: "CLAUDE_RUNTIME_TURN_FAILED",
    message: String(error),
    error_scope: "turn",
    error_effect: "terminal",
    turn_id: turnId,
  },
});

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
