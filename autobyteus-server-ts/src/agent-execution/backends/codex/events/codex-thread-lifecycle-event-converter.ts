import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { AgentStatusPayload } from "../../../domain/agent-status-payload.js";
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
  createStatusEvent: (codexEventName: string, payload?: Partial<AgentStatusPayload>) => AgentRunEvent;
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
      const nestedError = asObject(payload.error);
      const errorCode = nestedError?.code ?? payload.code;
      const errorMessage = nestedError?.message ?? payload.message;
      return [
        context.createStatusEvent(codexEventName, { status: "error", can_interrupt: false }),
        context.createEvent(codexEventName, AgentRunEventType.ERROR, {
          code: typeof errorCode === "string" ? errorCode : "RUNTIME_ERROR",
          message:
            typeof errorMessage === "string"
              ? errorMessage
              : "Runtime emitted an error event.",
        }),
      ];
    }
    default:
      return [];
  }
};
