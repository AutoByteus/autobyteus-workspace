import { describe, expect, it } from "vitest";
import type { HistoricalReplayEvent } from "../../../../src/run-history/projection/historical-replay-event-types.js";
import {
  RECENT_RUN_PROJECTION_EVENT_LIMIT,
  selectRecentRunProjectionEvents,
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

  it("keeps the Event Monitor-compatible 100-event window authoritative while admitting eligible system activity", () => {
    const events: HistoricalReplayEvent[] = Array.from({ length: 105 }, (_, index) => ({
      eventId: `event-${index}`,
      turnGroupId: `turn-${index}`,
      kind: "message" as const,
      role: "user",
      content: `event-${index}`,
      media: null,
      ts: index,
    }));
    events.splice(2, 0, {
      eventId: "old-system", kind: "system_instruction", activityId: "old-system",
      content: "too old", ts: 2,
    });
    events.splice(8, 0, {
      eventId: "visible-system", kind: "system_instruction", activityId: "visible-system",
      content: "visible", ts: 8,
    });

    const selected = selectRecentRunProjectionEvents(events);

    expect(selected.eventMonitorEvents).toHaveLength(100);
    expect(selected.eventMonitorEvents[0]?.eventId).toBe("event-5");
    expect(selected.activityEvents.some((event) => event.eventId === "old-system")).toBe(false);
    expect(selected.activityEvents.some((event) => event.eventId === "visible-system")).toBe(true);
  });
});
