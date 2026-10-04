import { describe, expect, it } from "vitest";
import type {
  HistoricalReplayEvent,
  HistoricalReplayToolEvent,
} from "../../../../src/run-history/projection/historical-replay-event-types.js";
import {
  buildEventMonitorActiveTracePageEvent,
  buildEventMonitorActiveTracePageEvents,
  resolveActiveTracePageSenderAddresses,
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
  media: { images: ["image://one"], audio: ["audio://one"] },
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
        content: "ask", media: { images: ["image://attachment"] }, ts: 1,
      },
      {
        kind: "message", eventId: "assistant", turnGroupId: "turn-1", role: "assistant",
        content: "answer", media: { video: ["video://one"], images: ["image://one"] }, ts: 2,
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
    expect(buildEventMonitorActiveTracePageEvents(events)[0]?.visuals[0]).toMatchObject({
      kind: "user",
      attachments: [{ fileType: "image", locator: "image://attachment" }],
    });
  });

  it("projects an agent-to-agent delivery as an inter-agent visual, as the replay does (REQ-007, RD-004)", () => {
    const content = "You received a message from sender name: lead, sender address: /eng/lead, sender id: lead-run\nmessage:\nStatus?";
    const [delivery, user] = buildEventMonitorActiveTracePageEvents([
      { kind: "message", eventId: "delivery", turnGroupId: "turn-1", role: "user", senderId: "lead-run", content, media: null, ts: 1 },
      { kind: "message", eventId: "typed", turnGroupId: "turn-2", role: "user", content: "hello", media: null, ts: 2 },
    ]);
    expect(delivery!.visuals).toEqual([expect.objectContaining({
      kind: "inter_agent", eventId: "delivery", senderAgentRunId: "lead-run", senderAddress: null, text: content, attachments: [],
    })]);
    expect(user!.visuals.map((visual) => visual.kind)).toEqual(["user"]);

    const page = { events: [delivery!, user!], beforeCursor: null, hasEarlier: false, loadedEarlierCount: 0, activeGeneration: "g", cursorStatus: "VALID" as const };
    const resolved = resolveActiveTracePageSenderAddresses(page, (runId) => runId === "lead-run" ? "/eng/lead" : null);
    expect(resolved.events[0]!.visuals[0]).toMatchObject({ kind: "inter_agent", senderAddress: "/eng/lead" });
    expect(resolved.events[1]!.visuals[0]).toEqual(user!.visuals[0]);
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
