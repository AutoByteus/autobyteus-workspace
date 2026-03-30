import { describe, expect, it } from "vitest";
import { CodexReasoningSegmentTracker } from "../../../../../../src/agent-execution/backends/codex/events/codex-reasoning-segment-tracker.js";

describe("CodexReasoningSegmentTracker", () => {
  it("keeps one reasoning id within a block and issues a new one after a tool boundary clears the turn cache", () => {
    const tracker = new CodexReasoningSegmentTracker();

    const firstReasoningPayload = {
      id: "evt-1",
      turnId: "turn-1",
    };
    const secondReasoningPayloadSameBlock = {
      id: "evt-2",
      turnId: "turn-1",
    };
    const toolBoundaryPayload = {
      turnId: "turn-1",
    };
    const nextReasoningPayload = {
      id: "evt-3",
      turnId: "turn-1",
    };

    const firstSegmentId = tracker.resolveReasoningSegmentId(firstReasoningPayload);
    const secondSegmentId = tracker.resolveReasoningSegmentId(secondReasoningPayloadSameBlock);
    tracker.clearReasoningSegmentForTurn(toolBoundaryPayload);
    const thirdSegmentId = tracker.resolveReasoningSegmentId(nextReasoningPayload);

    expect(firstSegmentId).toBe("evt-1");
    expect(secondSegmentId).toBe(firstSegmentId);
    expect(thirdSegmentId).toBe("evt-3");
    expect(thirdSegmentId).not.toBe(firstSegmentId);
  });

  it("prefers stable reasoning item ids when the provider supplies them", () => {
    const tracker = new CodexReasoningSegmentTracker();

    const payload = {
      id: "evt-1",
      turnId: "turn-1",
      item: {
        id: "reasoning-item-1",
      },
    };

    expect(tracker.resolveReasoningSegmentId(payload)).toBe("reasoning-item-1");
  });
});
