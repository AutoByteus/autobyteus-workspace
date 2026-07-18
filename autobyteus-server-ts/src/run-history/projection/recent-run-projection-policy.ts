import type { HistoricalReplayEvent } from "./historical-replay-event-types.js";

export const RECENT_RUN_PROJECTION_EVENT_LIMIT = 100;

export const selectRecentReplayEvents = (
  events: readonly HistoricalReplayEvent[],
): HistoricalReplayEvent[] => events.slice(-RECENT_RUN_PROJECTION_EVENT_LIMIT);
