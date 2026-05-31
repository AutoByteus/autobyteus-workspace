import { describe, expect, it } from "vitest";
import { dedupeRunProjectionActivityEntries } from "../../../../src/run-history/projection/run-projection-dedupe.js";
import { buildRunProjectionActivities } from "../../../../src/run-history/projection/transformers/historical-replay-events-to-activities.js";
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

  it("coalesces provider compacting and compacted boundaries by provider operation identity", () => {
    const events = buildHistoricalReplayEvents([
      {
        traceType: "provider_compaction_boundary",
        turnId: "turn-1",
        seq: 1,
        ts: 10,
        toolResult: {
          provider: "claude",
          source_surface: "claude.status_compacting",
          boundary_key: "claude:session-1:claude.status_compacting:operation-1:turn-1",
          provider_session_id: "session-1",
          provider_event_id: "operation-1",
          status: "compacting",
          rotation_eligible: false,
        },
      },
      {
        traceType: "provider_compaction_boundary",
        turnId: "turn-1",
        seq: 2,
        ts: 12,
        toolResult: {
          provider: "claude",
          source_surface: "claude.compact_boundary",
          boundary_key: "claude:session-1:claude.compact_boundary:operation-1:turn-1",
          provider_session_id: "session-1",
          provider_event_id: "operation-1",
          status: "compacted",
          rotation_eligible: true,
        },
      },
    ]);

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.kind)).toEqual(["compaction", "compaction"]);
    expect(events[0]).toMatchObject({
      kind: "compaction",
      activityId: "compaction:provider:claude:session-1:operation-1:turn-1",
      phase: "started",
    });
    expect(events[1]).toMatchObject({
      kind: "compaction",
      activityId: "compaction:provider:claude:session-1:operation-1:turn-1",
      phase: "completed",
    });

    const activities = dedupeRunProjectionActivityEntries(buildRunProjectionActivities(events));
    expect(activities).toEqual([
      expect.objectContaining({
        kind: "compaction",
        activityId: "compaction:provider:claude:session-1:operation-1:turn-1",
        phase: "completed",
        boundaryKey: "claude:session-1:claude.compact_boundary:operation-1:turn-1",
        providerEventId: "operation-1",
        providerSessionId: "session-1",
        ts: 10,
        updatedTs: 12,
      }),
    ]);
  });
});
