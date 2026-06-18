import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { JsonObject } from "../codex-app-server-json.js";
import {
  isCodexCompactionTriggerItemType,
  isCodexContextCompactionItemType,
} from "./codex-compaction-event-classifier.js";
import { CodexThreadEventName } from "./codex-thread-event-name.js";

export type CodexItemCompactionEventConverterContext = {
  createCompactionStatusEvent: (
    sourceSurface: "codex.context_compaction_started" | "codex.context_compaction_completed",
    payload: JsonObject,
    status: "compacting" | "compacted",
    rotationEligible: boolean,
  ) => AgentRunEvent | null;
  resolveItemType: (payload: JsonObject) => string | null;
};

export const convertCodexItemCompactionEvent = (
  context: CodexItemCompactionEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent[] | null => {
  const itemType = context.resolveItemType(payload);
  if (isCodexContextCompactionItemType(itemType)) {
    const event = context.createCompactionStatusEvent(
      codexEventName === CodexThreadEventName.ITEM_STARTED
        ? "codex.context_compaction_started"
        : "codex.context_compaction_completed",
      payload,
      codexEventName === CodexThreadEventName.ITEM_STARTED ? "compacting" : "compacted",
      codexEventName === CodexThreadEventName.ITEM_COMPLETED,
    );
    return event ? [event] : [];
  }
  return isCodexCompactionTriggerItemType(itemType) ? [] : null;
};
