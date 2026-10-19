import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AgyStreamEventConverter } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js";
import { parseAgyStreamMessage, type AgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { createTokenUsageUpdatedPayload } from "../../../../../src/agent-execution/domain/agent-run-token-usage.js";

const usage = (output: number, thinking: number | undefined) => ({
  input_tokens: 9000, output_tokens: output, cache_read_tokens: 0, total_tokens: 9000 + output,
  ...(thinking === undefined ? {} : { thinking_tokens: thinking }),
});
const step = (stepIndex: number, state: string, extra: Record<string, unknown>): AgyStreamMessage =>
  ({ event: "step_update", step_update: { conversation_id: "conversation", step_index: stepIndex,
    step_type: "agent_response", state, ...extra } }) as AgyStreamMessage;

const harness = () => {
  let clock = 0;
  const converter = new AgyStreamEventConverter("run", "conversation", "gemini-3.8-flash-low", undefined, undefined, undefined,
    { compactionDetection: false, now: () => clock });
  converter.startTurn("turn");
  const throughputOf = (message: AgyStreamMessage, atMs: number) => {
    clock = atMs;
    const event = converter.convert(message).find((item) => item.eventType === AgentRunEventType.TOKEN_USAGE_UPDATED);
    return event ? createTokenUsageUpdatedPayload({ runId: "run", payload: event.payload }).output_throughput : undefined;
  };
  return { throughputOf };
};

describe("AGY per-step TPS (DEC-002)", () => {
  it("uses generation speed from the first text_delta when AGY reports no thinking", () => {
    const { throughputOf } = harness();
    expect(throughputOf(step(1, "ACTIVE", { text_delta: "Hello" }), 1000)).toBeUndefined();
    expect(throughputOf(step(1, "ACTIVE", { text_delta: " world" }), 1500)).toBeUndefined();
    expect(throughputOf(step(1, "DONE", { text_delta: ".", duration_seconds: 4.2, usage: usage(400, 0) }), 3000))
      .toEqual({ method: "generation", output_tokens: 400, duration_ms: 2000 });
  });

  it("uses AGY's fractional duration_seconds, rounded to integer ms, when thinking is reported (IC-1)", () => {
    const { throughputOf } = harness();
    throughputOf(step(3, "ACTIVE", { text_delta: "after hidden thinking" }), 1000);
    expect(throughputOf(step(3, "DONE", { duration_seconds: 2.673724, usage: usage(250, 120) }), 2000))
      .toEqual({ method: "end_to_end", output_tokens: 250, duration_ms: 2674 });
  });

  it("falls back to the provider duration when the streamed window is too short or unproven", () => {
    const { throughputOf } = harness();
    // The whole text arrives on DONE: no generation window.
    expect(throughputOf(step(5, "DONE", { text_delta: "all at once", duration_seconds: 3.5343489999999997, usage: usage(60, 0) }), 500))
      .toEqual({ method: "end_to_end", output_tokens: 60, duration_ms: 3534 });
    // A 100 ms burst window is below the minimum.
    throughputOf(step(7, "ACTIVE", { text_delta: "burst" }), 1000);
    expect(throughputOf(step(7, "DONE", { duration_seconds: 1.25, usage: usage(80, 0) }), 1100))
      .toEqual({ method: "end_to_end", output_tokens: 80, duration_ms: 1250 });
    // No thinking count reported: hidden thinking is not ruled out.
    throughputOf(step(9, "ACTIVE", { text_delta: "maybe after thinking" }), 1000);
    expect(throughputOf(step(9, "DONE", { duration_seconds: 2, usage: usage(80, undefined) }), 3000))
      .toEqual({ method: "end_to_end", output_tokens: 80, duration_ms: 2000 });
  });

  it("gives no reading without thinking-free streaming or a provider duration", () => {
    const { throughputOf } = harness();
    throughputOf(step(11, "ACTIVE", { text_delta: "x" }), 1000);
    expect(throughputOf(step(11, "DONE", { usage: usage(300, 40) }), 4000)).toBeNull();
  });

  it("keeps the recorded 4-token fixture calls below the minimum sample", () => {
    const messages = fs.readFileSync(path.resolve("tests/fixtures/agy-compaction/agy-stream-auto-compaction.stdout.jsonl"), "utf8")
      .split("\n").filter(Boolean).map((line) => parseAgyStreamMessage(line)).filter((message) => message !== null);
    const init = messages.find((message) => message.event === "init")!;
    const converter = new AgyStreamEventConverter("run", init.conversation_id, "gemini-3.8-flash-low");
    converter.startTurn("turn-0");
    const readings: unknown[] = [];
    let turn = 0;
    for (const message of messages) {
      if (message.event === "init") continue;
      for (const event of converter.convert(message)) {
        if (event.eventType !== AgentRunEventType.TOKEN_USAGE_UPDATED) continue;
        expect((event.payload.output_throughput as { duration_ms: number }).duration_ms).toSatisfy(Number.isSafeInteger);
        readings.push(createTokenUsageUpdatedPayload({ runId: "run", payload: event.payload }).output_throughput);
      }
      if (message.event === "result" && message !== messages.at(-1)) converter.startTurn(`turn-${++turn}`);
    }
    expect(readings.length).toBeGreaterThan(0);
    expect(readings.every((reading) => reading === null)).toBe(true);
  });
});
