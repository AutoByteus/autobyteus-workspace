import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
import type { JsonObject } from "../codex-app-server-json.js";
import { isCodexCompletedCompactionItemType } from "./codex-compaction-event-classifier.js";
import { CodexThreadEventName } from "./codex-thread-event-name.js";
import type { CodexToolLifecyclePlacement } from "./codex-ordered-tool-boundary-tracker.js";

export type CodexRawResponseEventConverterContext = {
  createEvent: (
    codexEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ) => AgentRunEvent;
  resolveItemType: (payload: JsonObject) => string | null;
  resolveInvocationId: (payload: JsonObject) => string | null;
  resolveLogEntry: (payload: JsonObject) => string;
  closeReasoningBlocksForBoundary: (
    codexEventName: string,
    payload: JsonObject,
  ) => AgentRunEvent[];
  classifyToolLifecycleUpdate: (payload: JsonObject) => CodexToolLifecyclePlacement;
  createCompactionBoundaryEvent: (
    sourceSurface: "codex.raw_response_compaction_item",
    payload: JsonObject,
  ) => AgentRunEvent | null;
};

export const isCodexRawResponseEventName = (codexEventName: string): boolean =>
  codexEventName === CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED;

export const convertCodexRawResponseEvent = (
  context: CodexRawResponseEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent[] => {
  if (codexEventName !== CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED) {
    return [];
  }

  const itemType = context.resolveItemType(payload);
  if (isCodexCompletedCompactionItemType(itemType)) {
    const event = context.createCompactionBoundaryEvent(
      "codex.raw_response_compaction_item",
      payload,
    );
    return event ? [event] : [];
  }
  if (itemType !== "functioncalloutput") {
    return [];
  }
  const invocationId = context.resolveInvocationId(payload);
  const logEntry = context.resolveLogEntry(payload);
  if (!logEntry) {
    return [];
  }
  const reasoningEnds = context.classifyToolLifecycleUpdate(payload) === "result_first_creation"
    ? context.closeReasoningBlocksForBoundary(codexEventName, payload)
    : [];

  return [
    ...reasoningEnds,
    context.createEvent(codexEventName, AgentRunEventType.TOOL_LOG, {
      ...serializePayload(payload),
      ...(invocationId ? { tool_invocation_id: invocationId } : {}),
      log_entry: logEntry,
    }),
  ];
};
