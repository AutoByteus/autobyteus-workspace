import type { HistoricalReplayEvent } from "../historical-replay-event-types.js";
import type { RunProjectionActivityEntry } from "../run-projection-types.js";

export const buildRunProjectionActivities = (
  events: HistoricalReplayEvent[],
): RunProjectionActivityEntry[] => {
  const activities: RunProjectionActivityEntry[] = [];

  for (const event of events) {
    if (event.kind === "tool") {
      activities.push({
        kind: "tool",
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
      });
      continue;
    }

    if (event.kind === "compaction") {
      activities.push({
        kind: "compaction",
        activityId: event.activityId,
        phase: event.phase,
        message: event.message,
        turnId: event.turnId,
        provider: event.provider,
        sourceSurface: event.sourceSurface,
        boundaryKey: event.boundaryKey,
        providerEventId: event.providerEventId,
        providerSessionId: event.providerSessionId,
        trigger: event.trigger,
        preTokens: event.preTokens,
        rotationEligible: event.rotationEligible,
        ts: event.ts,
        updatedTs: event.ts,
        detailLevel: event.detailLevel,
      });
    }
  }

  return activities;
};
