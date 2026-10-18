import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SequencedContentCadenceScheduler } from "../../../../src/services/agent-streaming/websocket-egress/sequenced-content-cadence-scheduler.js";
import { createSequencedStreamEgressControlComposition } from "../../../../src/services/agent-streaming/websocket-egress/agent-stream-egress-control-composition.js";
import type { SequencedStreamShape } from "../../../../src/services/agent-streaming/websocket-egress/sequenced-stream-shape.js";

/** A minimal sequenced wire format: the rules under test do not depend on a concrete DTO. */
type Message = Readonly<{ type: string; payload: Readonly<Record<string, unknown>> }>;
type Item = Readonly<{ agent: string }>;
const shape: SequencedStreamShape<Message, Item> = {
  sequenceOf: (message) => typeof message.payload.seq === "number" ? message.payload.seq : null,
  contentOf: (message) => message.type === "CONTENT"
    ? { identityKey: String(message.payload.agent), item: { agent: String(message.payload.agent) }, delta: String(message.payload.delta) }
    : null,
  statusOf: (message) => message.type === "STATUS"
    ? { agentRunId: String(message.payload.agent), comparable: { status: message.payload.status } }
    : null,
  isSnapshot: (message) => message.type === "SNAPSHOT",
  buildBatch: (first, through, aggregates) => ({
    type: "BATCH", payload: { first, through, items: aggregates.map(({ item, text }) => `${item.agent}:${text}`) },
  }),
};
const content = (seq: number, agent: string, delta: string): Message => ({ type: "CONTENT", payload: { seq, agent, delta } });
const status = (seq: number, agent: string, value = "running"): Message => ({ type: "STATUS", payload: { seq, agent, status: value } });
const other = (type: string, seq: number | null = null): Message => ({ type, payload: seq === null ? {} : { seq } });
const describeFrame = (message: Message): string => message.type === "BATCH"
  ? `BATCH ${String(message.payload.first)}..${String(message.payload.through)} [${(message.payload.items as string[]).join(", ")}]`
  : `${message.type}${typeof message.payload.seq === "number" ? ` ${message.payload.seq}` : ""}`;

const harness = (intervalMs = 500) => {
  const frames: string[] = [];
  const readIntervalMs = vi.fn(() => intervalMs);
  const scheduler = new SequencedContentCadenceScheduler(shape, { readIntervalMs, onScheduledError: vi.fn() });
  const forward = (message: Message) => { frames.push(describeFrame(message)); };
  return { frames, readIntervalMs, scheduler, send: (...messages: Message[]) => messages.forEach((message) => scheduler.accept(message, forward)) };
};

describe("SequencedContentCadenceScheduler", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("covers absorbed identical statuses in one batch and sends the boundary after it (design example 11..15)", () => {
    const test = harness();
    test.send(status(11, "A"), content(12, "A", "a"), status(13, "A"), content(14, "A", "b"));
    expect(test.frames).toEqual(["STATUS 11"]);
    test.send(other("SEGMENT_END", 15));
    expect(test.frames).toEqual(["STATUS 11", "BATCH 12..14 [A:ab]", "SEGMENT_END 15"]);
  });

  it("coalesces interleaved agents into one batch per window, per agent in order (design example 21..26)", () => {
    const test = harness();
    test.send(status(19, "A"), status(20, "B"));
    test.send(content(21, "A", "x"), status(22, "B"), content(23, "B", "1"), content(24, "A", "y"), status(25, "A"), content(26, "B", "2"));
    vi.advanceTimersByTime(499);
    expect(test.frames).toEqual(["STATUS 19", "STATUS 20"]);
    vi.advanceTimersByTime(1);
    expect(test.frames).toEqual(["STATUS 19", "STATUS 20", "BATCH 21..26 [A:xy, B:12]"]);
  });

  it("lets no sequenced message overtake a pending batch", () => {
    const test = harness();
    test.send(content(12, "A", "a"), content(13, "A", "b"), content(14, "A", "c"), other("TOKEN_USAGE_UPDATED", 15));
    expect(test.frames).toEqual(["BATCH 12..14 [A:abc]", "TOKEN_USAGE_UPDATED 15"]);
  });

  it("treats a changed status, or a status without a baseline, as a boundary", () => {
    const test = harness();
    test.send(status(1, "A"), content(2, "A", "a"), status(3, "A", "idle"));
    test.send(content(4, "A", "b"), status(5, "B"));
    expect(test.frames).toEqual(["STATUS 1", "BATCH 2..2 [A:a]", "STATUS 3", "BATCH 4..4 [A:b]", "STATUS 5"]);
  });

  it("forwards an identical status unchanged when no batch is pending", () => {
    const test = harness();
    test.send(status(1, "A"), status(2, "A"));
    expect(test.frames).toEqual(["STATUS 1", "STATUS 2"]);
  });

  it("flushes before a sequence that does not continue the pending range", () => {
    const test = harness();
    // Sequence 3 never reaches this socket (e.g. a root event it does not project).
    test.send(status(1, "A"), content(2, "A", "a"), content(4, "A", "b"), content(5, "A", "c"));
    expect(test.frames).toEqual(["STATUS 1", "BATCH 2..2 [A:a]"]);
    vi.advanceTimersByTime(500);
    expect(test.frames).toEqual(["STATUS 1", "BATCH 2..2 [A:a]", "BATCH 4..5 [A:bc]"]);
    test.send(content(6, "A", "d"), status(8, "A"));
    expect(test.frames.slice(3)).toEqual(["BATCH 6..6 [A:d]", "STATUS 8"]);
  });

  it("forwards unsequenced companions without flushing and flushes before any other unsequenced message", () => {
    const test = harness();
    test.send(content(1, "A", "a"), other("CONNECTED"), other("AGENT_COMMAND_ACK"));
    expect(test.frames).toEqual(["CONNECTED", "AGENT_COMMAND_ACK"]);
    test.send(other("ERROR"));
    expect(test.frames).toEqual(["CONNECTED", "AGENT_COMMAND_ACK", "BATCH 1..1 [A:a]", "ERROR"]);
  });

  it("reads the interval when a window opens, so a changed interval applies to the next window", () => {
    const test = harness();
    test.send(content(1, "A", "a"));
    test.readIntervalMs.mockReturnValue(1_000);
    test.send(content(2, "A", "b"));
    vi.advanceTimersByTime(500);
    expect(test.frames).toEqual(["BATCH 1..2 [A:ab]"]);
    test.send(content(3, "A", "c"));
    vi.advanceTimersByTime(999);
    expect(test.frames).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(test.frames).toEqual(["BATCH 1..2 [A:ab]", "BATCH 3..3 [A:c]"]);
  });

  it("compares status repeats from scratch after a snapshot", () => {
    const test = harness();
    test.send(status(1, "A"), other("SNAPSHOT"), content(2, "A", "a"), status(3, "A"));
    expect(test.frames).toEqual(["STATUS 1", "SNAPSHOT", "BATCH 2..2 [A:a]", "STATUS 3"]);
  });

  it("drops pending content and its timer on dispose", () => {
    const test = harness();
    test.send(content(1, "A", "a"));
    test.scheduler.dispose();
    vi.advanceTimersByTime(1_000);
    test.send(other("ERROR"));
    expect(test.frames).toEqual([]);
  });

  it("refuses suppressing filters in a sequenced composition", () => {
    expect(() => createSequencedStreamEgressControlComposition(shape, {
      extensions: { filterFactories: [() => ({ evaluate: () => ({ action: "FORWARD" as const }) })] },
    })).toThrow("sequence gap");
  });
});
