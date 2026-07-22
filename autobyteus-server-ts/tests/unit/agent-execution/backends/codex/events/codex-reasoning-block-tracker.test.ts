import { describe, expect, it } from "vitest";
import { CodexReasoningBlockTracker } from "../../../../../../src/agent-execution/backends/codex/events/codex-reasoning-block-tracker.js";

const appendCompleted = (
  tracker: CodexReasoningBlockTracker,
  turnId: string | null,
  providerItemId: string | null,
  snapshot: string,
) => tracker.append({ turnId, providerItemId, snapshot });

const contentAction = (actions: ReturnType<CodexReasoningBlockTracker["append"]>) => {
  expect(actions[0]?.kind).toBe("content");
  return actions[0]!;
};

describe("CodexReasoningBlockTracker", () => {
  it("joins adjacent provider items under one allocator-owned id with completed-item separators", () => {
    const tracker = new CodexReasoningBlockTracker("nonce-a");

    const first = appendCompleted(tracker, "turn-1", "provider-a", "first");
    const second = appendCompleted(tracker, "turn-1", "provider-b", "second");

    expect(first).toEqual([{
      kind: "content",
      segmentId: "reasoning-block:nonce-a:1",
      turnId: "turn-1",
      delta: "first",
    }]);
    expect(second).toEqual([{
      kind: "content",
      segmentId: "reasoning-block:nonce-a:1",
      turnId: "turn-1",
      delta: "\n\nsecond",
    }]);
  });

  it("ignores repeated completion of the same known provider item", () => {
    const tracker = new CodexReasoningBlockTracker("nonce-a");

    appendCompleted(tracker, "turn-1", "provider-a", "complete");
    const repeated = appendCompleted(tracker, "turn-1", "provider-a", "complete");

    expect(repeated).toEqual([]);
  });

  it("returns one ordered end, closes idempotently, and allocates a new id after close", () => {
    const tracker = new CodexReasoningBlockTracker("nonce-a");
    const first = contentAction(appendCompleted(tracker, "turn-1", "provider-a", "first"));

    expect(tracker.closeForTurn("turn-1")).toEqual([{
      kind: "end",
      segmentId: first.segmentId,
      turnId: "turn-1",
    }]);
    expect(tracker.closeForTurn("turn-1")).toEqual([]);

    const second = contentAction(appendCompleted(tracker, "turn-1", "provider-a", "second"));
    expect(second.segmentId).toBe("reasoning-block:nonce-a:2");
  });

  it("closes all active blocks in insertion order and has no later duplicate effects", () => {
    const tracker = new CodexReasoningBlockTracker("nonce-a");
    const first = contentAction(appendCompleted(tracker, "turn-a", "provider-a", "a"));
    const second = contentAction(appendCompleted(tracker, "turn-b", "provider-b", "b"));

    expect(tracker.closeAll()).toEqual([
      { kind: "end", segmentId: first.segmentId, turnId: "turn-a" },
      { kind: "end", segmentId: second.segmentId, turnId: "turn-b" },
    ]);
    expect(tracker.closeAll()).toEqual([]);
  });

  it("emits adjacent content and end for missing turn identity without retaining the block", () => {
    const tracker = new CodexReasoningBlockTracker("nonce-a");

    const first = appendCompleted(tracker, null, null, "first");
    const second = appendCompleted(tracker, null, null, "second");

    expect(first).toEqual([
      { kind: "content", segmentId: "reasoning-block:nonce-a:1", turnId: null, delta: "first" },
      { kind: "end", segmentId: "reasoning-block:nonce-a:1", turnId: null },
    ]);
    expect(second).toEqual([
      { kind: "content", segmentId: "reasoning-block:nonce-a:2", turnId: null, delta: "second" },
      { kind: "end", segmentId: "reasoning-block:nonce-a:2", turnId: null },
    ]);
    expect(tracker.closeAll()).toEqual([]);
  });

  it("uses a distinct namespace for each tracker instance", () => {
    const first = contentAction(appendCompleted(
      new CodexReasoningBlockTracker("nonce-a"),
      "turn-1",
      "provider-a",
      "first",
    ));
    const second = contentAction(appendCompleted(
      new CodexReasoningBlockTracker("nonce-b"),
      "turn-1",
      "provider-a",
      "second",
    ));

    expect(first.segmentId).toBe("reasoning-block:nonce-a:1");
    expect(second.segmentId).toBe("reasoning-block:nonce-b:1");
  });

  it("allocates a fresh id when an active turn is evicted", () => {
    const tracker = new CodexReasoningBlockTracker("nonce-a");
    const first = contentAction(appendCompleted(tracker, "turn-0", null, "first"));
    for (let index = 1; index <= 128; index += 1) {
      appendCompleted(tracker, `turn-${index}`, null, `fragment-${index}`);
    }

    const afterEviction = contentAction(appendCompleted(tracker, "turn-0", null, "again"));

    expect(first.segmentId).toBe("reasoning-block:nonce-a:1");
    expect(afterEviction.segmentId).toBe("reasoning-block:nonce-a:130");
  });
});
