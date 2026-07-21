import { describe, expect, it } from "vitest";
import type { HistoricalReplayEvent } from "../../../../src/run-history/projection/historical-replay-event-types.js";
import {
  RECENT_RUN_PROJECTION_EVENT_LIMIT,
  selectRecentReplayEvents,
} from "../../../../src/run-history/projection/recent-run-projection-policy.js";

describe("recent run projection policy", () => {
  it("returns the newest 100 canonical replay events in their existing order", () => {
    const events: HistoricalReplayEvent[] = Array.from({ length: 105 }, (_, index) => ({
      eventId: `event-${index}`,
      turnGroupId: `turn-${index}`,
      kind: "message",
      role: "user",
      content: `event-${index}`,
      media: null,
      ts: index,
    }));

    const selected = selectRecentReplayEvents(events);

    expect(RECENT_RUN_PROJECTION_EVENT_LIMIT).toBe(100);
    expect(selected).toHaveLength(100);
    expect(selected[0]).toEqual(expect.objectContaining({ content: "event-5" }));
    expect(selected.at(-1)).toEqual(expect.objectContaining({ content: "event-104" }));
  });
});
