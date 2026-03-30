import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
import type { JsonObject } from "../codex-app-server-json.js";
import { CodexThreadEventName } from "./codex-thread-event-name.js";

export type CodexRawResponseEventConverterContext = {
  createEvent: (
    codexEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ) => AgentRunEvent;
  resolveItemType: (payload: JsonObject) => string | null;
  resolveInvocationId: (payload: JsonObject) => string | null;
  resolveLogEntry: (payload: JsonObject) => string;
};

export const isCodexRawResponseEventName = (codexEventName: string): boolean =>
  codexEventName === CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED;

export const convertCodexRawResponseEvent = (
  context: CodexRawResponseEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent | null => {
  if (codexEventName !== CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED) {
    return null;
  }

  const itemType = context.resolveItemType(payload);
  if (itemType !== "functioncalloutput") {
    return null;
  }

  const invocationId = context.resolveInvocationId(payload);
  const logEntry = context.resolveLogEntry(payload);
  if (!logEntry) {
    return null;
  }

  return context.createEvent(codexEventName, AgentRunEventType.TOOL_LOG, {
    ...serializePayload(payload),
    ...(invocationId ? { tool_invocation_id: invocationId } : {}),
    log_entry: logEntry,
  });
};
