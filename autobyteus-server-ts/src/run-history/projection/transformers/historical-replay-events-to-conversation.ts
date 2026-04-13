import type { HistoricalReplayEvent } from "../historical-replay-event-types.js";
import type { RunProjectionConversationEntry } from "../run-projection-types.js";

export const buildRunProjectionConversation = (
  events: HistoricalReplayEvent[],
): RunProjectionConversationEntry[] =>
  events.map((event) => {
    if (event.kind === "message") {
      return {
        kind: "message",
        role: event.role,
        content: event.content,
        media: event.media,
        ts: event.ts,
      };
    }

    if (event.kind === "reasoning") {
      return {
        kind: "reasoning",
        role: null,
        content: event.content,
        media: event.media,
        ts: event.ts,
      };
    }

    return {
      kind:
        event.status === "parsed" || event.status === "parsing"
          ? "tool_call_pending"
          : "tool_call",
      invocationId: event.invocationId,
      role: null,
      content: event.content,
      toolName: event.toolName,
      toolArgs: event.toolArgs,
      toolResult: event.toolResult,
      toolError: event.toolError,
      media: event.media,
      ts: event.ts,
    };
  });
