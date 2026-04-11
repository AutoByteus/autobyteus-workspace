import { describe, expect, it } from "vitest";
import { buildHistoricalReplayEvents } from "../../../../src/run-history/projection/transformers/raw-trace-to-historical-replay-events.js";

describe("raw trace to historical replay events", () => {
  it("merges tool call and result into one canonical tool replay event", () => {
    const events = buildHistoricalReplayEvents([
      {
        traceType: "user",
        content: "hi",
        turnId: "turn-1",
        seq: 1,
        ts: 1,
      },
      {
        traceType: "tool_call",
        toolCallId: "call-1",
        toolName: "search_web",
        toolArgs: { query: "projection layering" },
        turnId: "turn-1",
        seq: 2,
        ts: 2,
      },
      {
        traceType: "tool_result",
        toolCallId: "call-1",
        toolResult: { ok: true },
        turnId: "turn-1",
        seq: 3,
        ts: 3,
      },
    ]);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      kind: "message",
      role: "user",
      content: "hi",
    });
    expect(events[1]).toMatchObject({
      kind: "tool",
      invocationId: "call-1",
      toolName: "search_web",
      toolResult: { ok: true },
      status: "success",
      detailLevel: "source_limited",
    });
  });

  it("emits orphan tool results as standalone tool replay events", () => {
    const events = buildHistoricalReplayEvents([
      {
        traceType: "tool_result",
        toolResult: { ok: true },
        turnId: "turn-9",
        seq: 7,
        ts: 9,
      },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "tool",
      invocationId: "turn-9:7",
      toolResult: { ok: true },
      status: "success",
      detailLevel: "source_limited",
    });
  });
});
