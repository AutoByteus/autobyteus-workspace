import { describe, expect, it } from "vitest";
import type { HistoricalReplayEvent } from "../../../../src/run-history/projection/historical-replay-event-types.js";
import {
  buildActiveTraceSubjectFingerprint,
  selectActiveTraceEventPage,
} from "../../../../src/run-history/projection/active-trace-event-page-policy.js";

const events = (count: number): HistoricalReplayEvent[] => Array.from({ length: count }, (_, index) => ({
  kind: "message",
  eventId: `e${index}`,
  turnGroupId: `t${index}`,
  role: "assistant",
  content: `content-${index}`,
  media: null,
  ts: index,
}));

describe("active trace event page policy", () => {
  it("returns one consistent latest-100 plus earlier-50 snapshot and fixed continuations", () => {
    const all = events(275);
    const subjectFingerprint = buildActiveTraceSubjectFingerprint("run:r1");
    const first = selectActiveTraceEventPage({ events: all, subjectFingerprint, activeGeneration: "g1" });
    expect(first.events.map(event => event.eventId)).toEqual(all.slice(125).map(event => event.eventId));
    expect(first.loadedEarlierCount).toBe(50);
    expect(first.hasEarlier).toBe(true);

    const continuation = selectActiveTraceEventPage({
      events: [...all, ...events(2).map((event, index) => ({ ...event, eventId: `append${index}` }))],
      subjectFingerprint,
      activeGeneration: "g1",
      beforeCursor: first.beforeCursor,
    });
    expect(continuation.events.map(event => event.eventId)).toEqual(all.slice(75, 125).map(event => event.eventId));
    expect(continuation.loadedEarlierCount).toBe(50);
  });

  it("rejects malformed/foreign cursors and expires rewrite generations or missing anchors", () => {
    const all = events(200);
    const subjectFingerprint = buildActiveTraceSubjectFingerprint("run:r1");
    const first = selectActiveTraceEventPage({ events: all, subjectFingerprint, activeGeneration: "g1" });
    expect(() => selectActiveTraceEventPage({
      events: all, subjectFingerprint, activeGeneration: "g1", beforeCursor: "not-json",
    })).toThrow(/Invalid active-trace page cursor/);
    expect(() => selectActiveTraceEventPage({
      events: all,
      subjectFingerprint: buildActiveTraceSubjectFingerprint("run:r2"),
      activeGeneration: "g1",
      beforeCursor: first.beforeCursor,
    })).toThrow(/does not belong/);
    expect(selectActiveTraceEventPage({
      events: all, subjectFingerprint, activeGeneration: "g2", beforeCursor: first.beforeCursor,
    }).cursorStatus).toBe("EXPIRED");
    expect(selectActiveTraceEventPage({
      events: all.slice(100), subjectFingerprint, activeGeneration: "g1", beforeCursor: first.beforeCursor,
    }).cursorStatus).toBe("EXPIRED");
  });
});
