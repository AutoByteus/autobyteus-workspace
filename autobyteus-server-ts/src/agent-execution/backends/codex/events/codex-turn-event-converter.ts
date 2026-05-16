import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { AgentStatusPayload } from "../../../domain/agent-status-payload.js";
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
  createStatusEvent: (codexEventName: string, payload?: Partial<AgentStatusPayload>) => AgentRunEvent;
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
        context.createStatusEvent(codexEventName),
      ];
    case CodexThreadEventName.TURN_COMPLETED:
      context.clearReasoningSegmentForTurn(payload);
      return [
        context.createEvent(codexEventName, AgentRunEventType.TURN_COMPLETED, {
          ...(turnId ? { turnId } : {}),
        }),
        context.createStatusEvent(codexEventName),
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
