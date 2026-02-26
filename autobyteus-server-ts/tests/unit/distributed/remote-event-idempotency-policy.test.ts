import { describe, expect, it } from "vitest";
import { RemoteEventIdempotencyPolicy } from "../../../src/distributed/policies/remote-event-idempotency-policy.js";

describe("RemoteEventIdempotencyPolicy", () => {
  it("drops duplicate source events within TTL", () => {
    let now = 1_700_000_000_000;
    const policy = new RemoteEventIdempotencyPolicy({ ttlMs: 10_000, now: () => now });

    const first = policy.shouldDropDuplicate({
      teamRunId: "run-1",
      sourceNodeId: "node-a",
      sourceEventId: "evt-1",
    });
    const duplicate = policy.shouldDropDuplicate({
      teamRunId: "run-1",
      sourceNodeId: "node-a",
      sourceEventId: "evt-1",
    });

    expect(first).toBe(false);
    expect(duplicate).toBe(true);

    now += 10_001;
    const afterTtl = policy.shouldDropDuplicate({
      teamRunId: "run-1",
      sourceNodeId: "node-a",
      sourceEventId: "evt-1",
    });
    expect(afterTtl).toBe(false);
  });

  it("evicts old entries when max capacity is reached", () => {
    const policy = new RemoteEventIdempotencyPolicy({ ttlMs: 60_000, maxEntries: 2, now: () => 1_700_000_000_000 });

    expect(
      policy.shouldDropDuplicate({
        teamRunId: "run-1",
        sourceNodeId: "node-a",
        sourceEventId: "evt-1",
      }),
    ).toBe(false);
    expect(
      policy.shouldDropDuplicate({
        teamRunId: "run-1",
        sourceNodeId: "node-a",
        sourceEventId: "evt-2",
      }),
    ).toBe(false);

    expect(
      policy.shouldDropDuplicate({
        teamRunId: "run-1",
        sourceNodeId: "node-a",
        sourceEventId: "evt-3",
      }),
    ).toBe(false);

    // evt-1 may be evicted due capacity bound.
    expect(
      policy.shouldDropDuplicate({
        teamRunId: "run-1",
        sourceNodeId: "node-a",
        sourceEventId: "evt-1",
      }),
    ).toBe(false);
  });
});
