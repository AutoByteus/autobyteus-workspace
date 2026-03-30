import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
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
): AgentRunEvent | null => {
  switch (codexEventName) {
    case CodexThreadEventName.THREAD_STARTED:
      return null;
    case CodexThreadEventName.THREAD_STATUS_CHANGED:
      return context.createEvent(
        codexEventName,
        AgentRunEventType.AGENT_STATUS,
        serializePayload(payload),
      );
    case CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED:
      return null;
    case CodexThreadEventName.ERROR: {
      const nestedError = asObject(payload.error);
      const errorCode = nestedError?.code ?? payload.code;
      const errorMessage = nestedError?.message ?? payload.message;
      return context.createEvent(codexEventName, AgentRunEventType.ERROR, {
        code: typeof errorCode === "string" ? errorCode : "RUNTIME_ERROR",
        message:
          typeof errorMessage === "string"
            ? errorMessage
            : "Runtime emitted an error event.",
      });
    }
    default:
      return null;
  }
};
