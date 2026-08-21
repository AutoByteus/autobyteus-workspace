import { describe, expect, it } from "vitest";
import {
  normalizeRawTraceRecords,
  toMemoryTraceEvent,
} from "../../../src/agent-memory/services/raw-trace-record-normalizer.js";

const base = {
  id: "rt-1", trace_type: "tool_call", turn_id: "turn-1", seq: 1, ts: 1,
  source_event: "test", tool_call_id: "call-1", tool_name: "tool", tool_args: {},
};

describe("raw trace record normalizer outcome presence", () => {
  it("isolates malformed run rows and preserves strict run/turn scope", () => {
    const events = normalizeRawTraceRecords([
      { ...base, content: "turn", ts: 2 },
      {
        id: "system-1", ts: 1, trace_type: "system_instruction", content: "  exact\ntext  ",
        source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED",
      },
      {
        id: "bad-system", ts: 3, trace_type: "system_instruction", content: "bad",
        source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED", extra: true,
      },
    ]);

    expect(events).toEqual([
      {
        scope: "run", id: "system-1", traceType: "system_instruction",
        sourceEvent: "SYSTEM_INSTRUCTIONS_SUPPLIED", content: "  exact\ntext  ",
        turnId: null, seq: null, ts: 1,
      },
      expect.objectContaining({ scope: "turn", id: "rt-1", turnId: "turn-1", seq: 1, ts: 2 }),
    ]);
  });

  it("normalizes only the production RawTraceMedia keys", () => {
    const event = toMemoryTraceEvent({
      ...base,
      media: {
        images: ["images/proof.png", ""],
        image: ["singular-is-not-the-contract.png"],
        audio: ["audio/proof.mp3"],
        video: ["video/proof.mp4"],
      },
    });
    expect(event.media).toEqual({
      images: ["images/proof.png"],
      audio: ["audio/proof.mp3"],
      video: ["video/proof.mp4"],
    });
  });

  it("preserves physical order for every tie group containing a run-scoped row", () => {
    const events = normalizeRawTraceRecords([
      { ...base, id: "turn-z", turn_id: "turn-z", content: "before", ts: 5 },
      {
        id: "system-1", ts: 5, trace_type: "system_instruction", content: "prompt",
        source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED",
      },
      { ...base, id: "turn-a", turn_id: "turn-a", content: "after", ts: 5 },
    ]);

    expect(events.map((event) => event.id)).toEqual(["turn-z", "system-1", "turn-a"]);
  });

  it("preserves absent historical outcome properties", () => {
    const event = toMemoryTraceEvent(base);
    expect(Object.prototype.hasOwnProperty.call(event, "toolResult")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(event, "toolError")).toBe(false);
  });

  it("preserves explicit null outcome properties", () => {
    const event = toMemoryTraceEvent({ ...base, tool_result: null, tool_error: null });
    expect(event).toHaveProperty("toolResult", null);
    expect(event).toHaveProperty("toolError", null);
  });
});
