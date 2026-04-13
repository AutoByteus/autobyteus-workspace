import type { HistoricalReplayEvent } from "../historical-replay-event-types.js";
import type { RunProjectionActivityEntry } from "../run-projection-types.js";

export const buildRunProjectionActivities = (
  events: HistoricalReplayEvent[],
): RunProjectionActivityEntry[] =>
  events.flatMap((event) => {
    if (event.kind !== "tool") {
      return [];
    }

    return [
      {
        invocationId: event.invocationId,
        toolName: event.toolName,
        type: event.activityType,
        status: event.status,
        contextText: event.contextText,
        arguments: event.toolArgs,
        logs: event.logs,
        result: event.toolResult,
        error: event.toolError,
        ts: event.ts,
        detailLevel: event.detailLevel,
      },
    ];
  });
