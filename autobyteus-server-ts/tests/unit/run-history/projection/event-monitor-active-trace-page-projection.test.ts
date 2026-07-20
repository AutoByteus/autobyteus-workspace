import { describe, expect, it } from "vitest";
import type {
  HistoricalReplayEvent,
  HistoricalReplayToolEvent,
} from "../../../../src/run-history/projection/historical-replay-event-types.js";
import {
  buildEventMonitorActiveTracePageEvent,
  buildEventMonitorActiveTracePageEvents,
} from "../../../../src/run-history/projection/event-monitor-active-trace-page-projection.js";

const tool = (toolResult: unknown): HistoricalReplayToolEvent => ({
  kind: "tool",
  eventId: "tool:v1:1:t:1:c",
  turnGroupId: "turn:v1:1:t",
  invocationId: "c",
  toolName: "search_web",
  toolArgs: { query: "cats", hidden: { deep: true } },
  toolResult,
  toolError: null,
  content: "visible text",
  media: { image: ["image://one"], audio: ["audio://one"] },
  ts: 12,
  activityType: "tool_call",
  status: "success",
  contextText: "search_web",
  logs: ["hidden log"],
  detailLevel: "source_limited",
});

describe("event monitor active trace page projection", () => {
  it("projects every closed central kind in canonical event and subvisual order", () => {
    const events: HistoricalReplayEvent[] = [
      {
        kind: "message", eventId: "user", turnGroupId: "turn-1", role: "user",
        content: "ask", media: { image: ["image://attachment"] }, ts: 1,
      },
      {
        kind: "message", eventId: "assistant", turnGroupId: "turn-1", role: "assistant",
        content: "answer", media: { video: ["video://one"], image: ["image://one"] }, ts: 2,
      },
      {
        kind: "reasoning", eventId: "thinking", turnGroupId: "turn-1",
        content: "reason", media: { audio: ["audio://one"] }, ts: 3,
      },
      tool(null),
      {
        kind: "compaction", eventId: "compaction", turnGroupId: "turn-2",
        activityId: "compact-1", phase: "completed", message: "Compacted", turnId: "turn-2",
        compactionOperationId: null, requestedTurnId: null, executionTurnId: null,
        provider: "local", sourceSurface: null, boundaryKey: null, providerEventId: null,
        providerSessionId: null, trigger: null, preTokens: null, rawTraceCount: 7,
        semanticFactCount: 3, rotationEligible: true, ts: 4, detailLevel: "source_limited",
      },
    ];

    expect(buildEventMonitorActiveTracePageEvents(events).map(event => ({
      eventId: event.eventId,
      kinds: event.visuals.map(visual => visual.kind),
    }))).toEqual([
      { eventId: "user", kinds: ["user"] },
      { eventId: "assistant", kinds: ["assistant_text", "media", "media"] },
      { eventId: "thinking", kinds: ["thinking", "media"] },
      { eventId: "tool:v1:1:t:1:c", kinds: ["tool_card", "assistant_text", "media", "media"] },
      { eventId: "compaction", kinds: ["compaction"] },
    ]);
  });

  it("emits deterministic distinct visual identities for every central subvisual", () => {
    const pageEvent = buildEventMonitorActiveTracePageEvent(tool(null));
    expect(pageEvent.visuals.map(visual => visual.kind)).toEqual([
      "tool_card", "assistant_text", "media", "media",
    ]);
    expect(new Set(pageEvent.visuals.map(visual => visual.visualId)).size).toBe(4);
    expect(pageEvent.visuals.every(visual => visual.eventId === pageEvent.eventId)).toBe(true);
    expect(pageEvent.visuals.map(visual => visual.visualId)).toEqual([
      expect.stringMatching(/:tool-card:0$/),
      expect.stringMatching(/:assistant-text:0$/),
      expect.stringMatching(/:media-image:0$/),
      expect.stringMatching(/:media-audio:0$/),
    ]);
  });

  it("is byte-identical for null and multi-megabyte results without result/log recursion", () => {
    const sentinel = "RESULT_SENTINEL".repeat(400_000);
    const withNull = JSON.stringify(buildEventMonitorActiveTracePageEvent(tool(null)));
    const withHugeResult = JSON.stringify(buildEventMonitorActiveTracePageEvent(tool({ sentinel })));
    expect(withHugeResult).toBe(withNull);
    expect(withHugeResult).not.toContain("RESULT_SENTINEL");
    expect(withHugeResult).not.toContain("hidden log");
    expect(withHugeResult).not.toContain("hidden");
  });

  it("reads allowlisted shallow data properties without invoking deep or getter fields", () => {
    let getterReads = 0;
    const args: Record<string, unknown> = { query: "safe" };
    Object.defineProperty(args, "prompt", { enumerable: true, get: () => { getterReads += 1; throw new Error("getter"); } });
    Object.defineProperty(args, "deep", { enumerable: true, get: () => { getterReads += 1; throw new Error("deep"); } });
    const projected = buildEventMonitorActiveTracePageEvent({ ...tool(null), toolArgs: args });
    expect(getterReads).toBe(0);
    expect(projected.visuals[0]).toMatchObject({ summaryArgs: { query: "safe" } });
  });
});
