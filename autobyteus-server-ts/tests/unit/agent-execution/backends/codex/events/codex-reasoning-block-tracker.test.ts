import { describe, expect, it } from "vitest";
import { CodexReasoningBlockTracker } from "../../../../../../src/agent-execution/backends/codex/events/codex-reasoning-block-tracker.js";

const appendCompleted = (
  tracker: CodexReasoningBlockTracker,
  turnId: string | null,
  providerItemId: string | null,
  delta: string,
) => tracker.append({ turnId, providerItemId, fragmentKind: "completed_item", delta });

describe("CodexReasoningBlockTracker", () => {
  it("joins adjacent provider items under one allocator-owned id with completed-item separators", () => {
    const tracker = new CodexReasoningBlockTracker("nonce-a");

    const first = appendCompleted(tracker, "turn-1", "provider-a", "first");
    const second = appendCompleted(tracker, "turn-1", "provider-b", "second");

    expect(first).toEqual({
      segmentId: "reasoning-block:nonce-a:1",
      delta: "first",
    });
    expect(second).toEqual({
      segmentId: first.segmentId,
      delta: "\n\nsecond",
    });
    expect(first.segmentId).not.toBe("provider-a");
  });

  it("appends deltas without separators and treats provider ids as correlation only", () => {
    const tracker = new CodexReasoningBlockTracker("nonce-a");

    const first = tracker.append({
      turnId: "turn-1",
      providerItemId: "provider-a",
      fragmentKind: "delta",
      delta: "hel",
    });
    const second = tracker.append({
      turnId: "turn-1",
      providerItemId: "provider-a",
      fragmentKind: "delta",
      delta: "lo",
    });

    expect(second).toEqual({ segmentId: first.segmentId, delta: "lo" });
  });

  it("allocates fresh monotonic ids after turn clear and clear-all even for repeated identity", () => {
    const tracker = new CodexReasoningBlockTracker("nonce-a");

    const first = appendCompleted(tracker, "turn-1", "provider-a", "first");
    tracker.clearForTurn("turn-1");
    const second = appendCompleted(tracker, "turn-1", "provider-a", "second");
    tracker.clearAll();
    const third = appendCompleted(tracker, "turn-1", "provider-a", "third");

    expect([first.segmentId, second.segmentId, third.segmentId]).toEqual([
      "reasoning-block:nonce-a:1",
      "reasoning-block:nonce-a:2",
      "reasoning-block:nonce-a:3",
    ]);
  });

  it("does not cache unscoped reasoning and safely separates missing provider identities", () => {
    const tracker = new CodexReasoningBlockTracker("nonce-a");

    const first = appendCompleted(tracker, null, null, "first");
    const second = appendCompleted(tracker, null, null, "second");

    expect(first.segmentId).toBe("reasoning-block:nonce-a:1");
    expect(second.segmentId).toBe("reasoning-block:nonce-a:2");
    expect(second.delta).toBe("second");
  });

  it("uses a distinct namespace for each tracker instance", () => {
    const first = appendCompleted(
      new CodexReasoningBlockTracker("nonce-a"),
      "turn-1",
      "provider-a",
      "first",
    );
    const second = appendCompleted(
      new CodexReasoningBlockTracker("nonce-b"),
      "turn-1",
      "provider-a",
      "second",
    );

    expect(first.segmentId).toBe("reasoning-block:nonce-a:1");
    expect(second.segmentId).toBe("reasoning-block:nonce-b:1");
  });

  it("allocates a fresh id when an active turn is evicted", () => {
    const tracker = new CodexReasoningBlockTracker("nonce-a");
    const first = appendCompleted(tracker, "turn-0", null, "first");
    for (let index = 1; index <= 128; index += 1) {
      appendCompleted(tracker, `turn-${index}`, null, `fragment-${index}`);
    }

    const afterEviction = appendCompleted(tracker, "turn-0", null, "again");

    expect(first.segmentId).toBe("reasoning-block:nonce-a:1");
    expect(afterEviction.segmentId).toBe("reasoning-block:nonce-a:130");
  });
});
