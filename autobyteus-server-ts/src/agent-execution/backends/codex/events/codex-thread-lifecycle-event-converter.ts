import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import {
  normalizeAgentApiStatus,
  type AgentStatusPayload,
} from "../../../domain/agent-status-payload.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import { resolveAgentRunErrorEvidence } from "../../../domain/agent-run-error-evidence.js";
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
  createStatusEvent: (codexEventName: string, payload?: Partial<AgentStatusPayload>) => AgentRunEvent;
  closeAllReasoningBlocks: (codexEventName: string) => AgentRunEvent[];
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
      const reasoningEnds = context.closeAllReasoningBlocks(codexEventName);
      context.clearAllOrderedTools();
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
          ...(typeof payload.turn_id === "string" ? { turn_id: payload.turn_id } : {}),
        };
      const errorEvent = context.createEvent(
        codexEventName,
        AgentRunEventType.ERROR,
        errorPayload,
      );
      const evidence = resolveAgentRunErrorEvidence(errorEvent);
      if (evidence?.kind !== "TURN_TERMINAL" && evidence?.kind !== "RUNTIME_GLOBAL") {
        return [...reasoningEnds, errorEvent];
      }
      const statusEvent = context.createStatusEvent(codexEventName);
      return normalizeAgentApiStatus(statusEvent.payload.status) === "error"
        ? [...reasoningEnds, errorEvent, statusEvent]
        : [...reasoningEnds, errorEvent];
    }
    default:
      return [];
  }
};
