import { describe, expect, it, vi } from "vitest";
import { ClaudeCallUsageTracker } from "../../../../../../src/agent-execution/backends/claude/session/claude-call-usage-tracker.js";
import { createTokenUsageUpdatedPayload } from "../../../../../../src/agent-execution/domain/agent-run-token-usage.js";

/** Frame receipt times from the recorded single-call probe (Claude Code 2.1.296, claude-opus-5-5). */
const frame = (event: Record<string, unknown>, parentToolUseId: string | null = null) =>
  ({ type: "stream_event", parent_tool_use_id: parentToolUseId, event });
const messageStart = (id: string) => frame({ type: "message_start",
  message: { id, model: "claude-opus-5-5", usage: { cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 } } } });
const messageDelta = (output: number) => frame({ type: "message_delta",
  usage: { input_tokens: 10, output_tokens: output, cache_read_input_tokens: 0, cache_creation_input_tokens: 0,
    output_tokens_details: { thinking_tokens: 1529 } } });

const harness = () => {
  let clock = 0;
  const emitted: Record<string, unknown>[] = [];
  const tracker = new ClaudeCallUsageTracker({
    runId: "run", getSessionId: () => "session", getActiveTurnId: () => "turn",
    // The SDK context read takes 800 ms; it must not count toward the call.
    readContextUsage: vi.fn(async () => { clock += 800; return null; }),
    emitEvent: (event) => emitted.push(event.params as Record<string, unknown>),
    now: () => clock,
  });
  return { tracker, emitted, at: (ms: number) => { clock = ms; } };
};

describe("ClaudeCallUsageTracker per-call TPS (DEC-002 generation speed)", () => {
  it("measures message_start → message_delta receipt and excludes the awaited context read (AC-002)", async () => {
    const { tracker, emitted, at } = harness();
    at(3551); await tracker.observe(messageStart("msg-1"));
    at(4000); await tracker.observe(frame({ type: "content_block_start" }));
    at(20487); await tracker.observe(messageDelta(1762));
    expect(emitted).toHaveLength(1);
    expect(emitted[0]!.output_throughput).toEqual({ method: "generation", output_tokens: 1762, duration_ms: 16936 });
    const payload = createTokenUsageUpdatedPayload({ runId: "run", payload: emitted[0]! });
    expect(payload.output_throughput).toEqual({ method: "generation", output_tokens: 1762, duration_ms: 16936 });
    expect((1762 / 16.936).toFixed(1)).toBe("104.0");
  });

  it("gives no reading without a paired main-loop message_start, and ignores subagent frames", async () => {
    const { tracker, emitted, at } = harness();
    at(0); await tracker.observe(messageDelta(500));
    expect(emitted).toHaveLength(0);
    at(100); await tracker.observe(messageStart("msg-2"));
    at(150); await tracker.observe(frame({ type: "message_start", message: { id: "sub" } }, "tool-1"));
    at(4000); await tracker.observe(frame({ type: "message_delta", usage: { input_tokens: 1, output_tokens: 1 } }, "tool-1"));
    at(5100); await tracker.observe(messageDelta(500));
    expect(emitted).toHaveLength(1);
    expect(emitted[0]!.output_throughput).toEqual({ method: "generation", output_tokens: 500, duration_ms: 5000 });
  });

  it("leaves a tiny tool-call message to the run-side minimum sample", async () => {
    const { tracker, emitted, at } = harness();
    at(0); await tracker.observe(messageStart("msg-3"));
    at(900); await tracker.observe(messageDelta(12));
    expect(createTokenUsageUpdatedPayload({ runId: "run", payload: emitted[0]! }).output_throughput).toBeNull();
  });
});
