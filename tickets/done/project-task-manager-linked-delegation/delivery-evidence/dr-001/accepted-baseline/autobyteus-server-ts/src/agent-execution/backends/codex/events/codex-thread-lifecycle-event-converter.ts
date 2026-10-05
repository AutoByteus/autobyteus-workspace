import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import type { JsonObject } from "../codex-app-server-json.js";
import { CodexThreadEventName } from "./codex-thread-event-name.js";

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export type CodexThreadLifecycleEventConverterContext = {
  createEvent: (
    codexEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ) => AgentRunEvent;
  createStatusEvent: (codexEventName: string, payload?: Record<string, unknown>) => AgentRunEvent;
  closeReasoningBlocksForBoundary: (
    codexEventName: string,
    payload: JsonObject,
  ) => AgentRunEvent[];
  closeAllReasoningBlocks: (codexEventName: string) => AgentRunEvent[];
  clearOrderedToolsForBoundary: (payload: JsonObject) => void;
  clearAllOrderedTools: () => void;
};

export const isCodexThreadLifecycleEventName = (
  codexEventName: string,
): boolean =>
  codexEventName.startsWith("thread/") ||
  codexEventName === CodexThreadEventName.ERROR;

export const convertCodexThreadLifecycleEvent = (
  context: CodexThreadLifecycleEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent[] => {
  switch (codexEventName) {
    case CodexThreadEventName.THREAD_STARTED:
      return [];
    case CodexThreadEventName.THREAD_STATUS_CHANGED:
      return [context.createStatusEvent(codexEventName)];
    case CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED:
      return [];
    case CodexThreadEventName.ERROR: {
      const turnId = typeof payload.turn_id === "string" && payload.turn_id.trim().length > 0
        ? payload.turn_id.trim()
        : null;
      const isTurnDiagnostic =
        payload.error_scope === "turn" &&
        payload.error_effect === "diagnostic" &&
        turnId !== null;
      const isTurnTerminal =
        payload.error_scope === "turn" &&
        payload.error_effect === "terminal" &&
        turnId !== null;
      let reasoningEnds: AgentRunEvent[] = [];
      if (isTurnTerminal) {
        reasoningEnds = context.closeReasoningBlocksForBoundary(codexEventName, payload);
        context.clearOrderedToolsForBoundary(payload);
      } else if (!isTurnDiagnostic) {
        reasoningEnds = context.closeAllReasoningBlocks(codexEventName);
        context.clearAllOrderedTools();
      }
      const nestedError = asObject(payload.error);
      const errorCode = nestedError?.code ?? payload.code;
      const errorMessage = nestedError?.message ?? payload.message;
      const errorPayload = {
          code: typeof errorCode === "string" ? errorCode : "RUNTIME_ERROR",
          message:
            typeof errorMessage === "string"
              ? errorMessage
              : "Runtime emitted an error event.",
          ...(typeof payload.error_scope === "string"
            ? { error_scope: payload.error_scope }
            : {}),
          ...(typeof payload.error_effect === "string"
            ? { error_effect: payload.error_effect }
            : {}),
          ...(turnId ? { turn_id: turnId } : {}),
        };
      const errorEvent = context.createEvent(
        codexEventName,
        AgentRunEventType.ERROR,
        errorPayload,
      );
      return [...reasoningEnds, errorEvent];
    }
    default:
      return [];
  }
};
