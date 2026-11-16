import { describe, expect, it } from "vitest";
import { buildHistoricalReplayEvents } from "../../../../src/run-history/projection/transformers/raw-trace-to-historical-replay-events.js";
import { buildRunProjectionConversation } from "../../../../src/run-history/projection/transformers/historical-replay-events-to-conversation.js";
import { isEventMonitorReplayEvent } from "../../../../src/run-history/projection/historical-replay-event-types.js";
import { turnIdOfReplayTurnGroup, buildReplayTurnGroupId } from "../../../../src/run-history/projection/historical-replay-event-identity.js";

/**
 * autobyteus-461 SR-087: an agent's own output carries its raw trace turn (server-side), by which an agent stream
 * snapshot keeps or leaves it out; user messages carry none (always kept; the web matches them by `messageId`).
 */
describe("projection conversation turn IDs", () => {
  it("gives assistant, reasoning and tool entries their raw trace turn, and user messages none", () => {
    const events = buildHistoricalReplayEvents([
      { traceType: "user", content: "Write it.", turnId: "turn-1", seq: 1, ts: 1 },
      { traceType: "reasoning", content: "Thinking", turnId: "turn-1", seq: 2, ts: 2 },
      { traceType: "assistant", content: "Done.", turnId: "turn-1", seq: 3, ts: 3 },
    ] as never).filter(isEventMonitorReplayEvent);
    const conversation = buildRunProjectionConversation(events);
    expect(conversation.map((entry) => [entry.kind, entry.role, entry.turnId])).toEqual([
      ["message", "user", undefined],
      ["reasoning", null, "turn-1"],
      ["message", "assistant", "turn-1"],
    ]);
  });

  it("reads the turn back from its replay group, and none from an ungrouped event", () => {
    expect(turnIdOfReplayTurnGroup(buildReplayTurnGroupId("turn:with:colons", "e1"))).toBe("turn:with:colons");
    expect(turnIdOfReplayTurnGroup(buildReplayTurnGroupId(null, "e2"))).toBeNull();
  });
});
