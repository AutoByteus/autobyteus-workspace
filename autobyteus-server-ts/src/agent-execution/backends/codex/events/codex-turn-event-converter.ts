import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
import type { JsonObject } from "../codex-app-server-json.js";
import { resolveTurnIdFromAppServerMessage } from "../thread/codex-thread-id-resolver.js";
import { CodexThreadEventName } from "./codex-thread-event-name.js";

export type CodexTurnEventConverterContext = {
  createEvent: (
    codexEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ) => AgentRunEvent;
  clearReasoningSegmentForTurn: (payload: JsonObject) => void;
};

export const isCodexTurnEventName = (codexEventName: string): boolean =>
  codexEventName.startsWith("turn/");

export const convertCodexTurnEvent = (
  context: CodexTurnEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent[] => {
  const turnId = resolveTurnIdFromAppServerMessage(payload);
  switch (codexEventName) {
    case CodexThreadEventName.TURN_STARTED:
      return [
        context.createEvent(codexEventName, AgentRunEventType.TURN_STARTED, {
          ...(turnId ? { turnId } : {}),
        }),
        context.createEvent(codexEventName, AgentRunEventType.AGENT_STATUS, {
          new_status: "RUNNING",
          old_status: null,
          ...(turnId ? { turnId } : {}),
        }),
      ];
    case CodexThreadEventName.TURN_COMPLETED:
      context.clearReasoningSegmentForTurn(payload);
      return [
        context.createEvent(codexEventName, AgentRunEventType.TURN_COMPLETED, {
          ...(turnId ? { turnId } : {}),
        }),
        context.createEvent(codexEventName, AgentRunEventType.AGENT_STATUS, {
          new_status: "IDLE",
          old_status: "RUNNING",
          ...(turnId ? { turnId } : {}),
        }),
      ];
    case CodexThreadEventName.TURN_DIFF_UPDATED:
      return [];
    case CodexThreadEventName.TURN_TASK_PROGRESS_UPDATED:
      return [
        context.createEvent(
          codexEventName,
          AgentRunEventType.TODO_LIST_UPDATE,
          serializePayload(payload),
        ),
      ];
    default:
      return [];
  }
};
