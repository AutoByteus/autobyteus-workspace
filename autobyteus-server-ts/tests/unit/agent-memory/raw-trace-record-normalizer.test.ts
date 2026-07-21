import { describe, expect, it } from "vitest";
import { toMemoryTraceEvent } from "../../../src/agent-memory/services/raw-trace-record-normalizer.js";

const base = {
  id: "rt-1", trace_type: "tool_call", turn_id: "turn-1", seq: 1, ts: 1,
  source_event: "test", tool_call_id: "call-1", tool_name: "tool", tool_args: {},
};

describe("raw trace record normalizer outcome presence", () => {
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
