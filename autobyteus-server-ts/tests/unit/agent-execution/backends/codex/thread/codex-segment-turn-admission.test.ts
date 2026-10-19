import { describe, expect, it } from "vitest";
import { resolveCodexSegmentTurnAdmission } from "../../../../../../src/agent-execution/backends/codex/thread/codex-segment-turn-admission.js";
import { CodexThreadEventName } from "../../../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";

describe("resolveCodexSegmentTurnAdmission", () => {
  it("accepts an explicit matching turn id and stamps the exact turn", () => {
    const params = { item: { type: "agentMessage", id: "m-1", turnId: " turn-u " } };
    expect(resolveCodexSegmentTurnAdmission(CodexThreadEventName.ITEM_STARTED, params, "turn-u")).toEqual({
      accepted: true,
      turnId: "turn-u",
      paramsWithExactTurn: { ...params, turn_id: "turn-u" },
      source: "explicit",
    });
  });

  it("lets a governed event without a turn id inherit the active turn", () => {
    const params = { itemId: "m-1", delta: "hi" };
    expect(
      resolveCodexSegmentTurnAdmission(CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA, params, "turn-u"),
    ).toEqual({
      accepted: true,
      turnId: "turn-u",
      paramsWithExactTurn: { ...params, turn_id: "turn-u" },
      source: "active_inheritance",
    });
  });

  it("rejects an invalid explicit turn id without an event turn id", () => {
    expect(resolveCodexSegmentTurnAdmission(
      CodexThreadEventName.ITEM_COMPLETED,
      { turnId: "turn-u", item: { type: "commandExecution", turn_id: "  " } },
      "turn-u",
    )).toEqual({ accepted: false, reason: "CODEX_SEGMENT_TURN_EXPLICIT_INVALID", eventTurnId: null });
    expect(resolveCodexSegmentTurnAdmission(
      CodexThreadEventName.ITEM_COMPLETED,
      { turnId: 7 },
      null,
    )).toEqual({ accepted: false, reason: "CODEX_SEGMENT_TURN_EXPLICIT_INVALID", eventTurnId: null });
  });

  it("rejects any event while no turn is active, carrying the event's own turn id or null", () => {
    expect(resolveCodexSegmentTurnAdmission(
      CodexThreadEventName.ITEM_COMPLETED,
      { turnId: " turn-t ", item: { type: "commandExecution" } },
      null,
    )).toEqual({ accepted: false, reason: "CODEX_SEGMENT_TURN_INACTIVE", eventTurnId: "turn-t" });
    expect(resolveCodexSegmentTurnAdmission(
      CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA,
      { itemId: "m-1", delta: "x" },
      "  ",
    )).toEqual({ accepted: false, reason: "CODEX_SEGMENT_TURN_INACTIVE", eventTurnId: null });
  });

  it("rejects a turn id other than the active one as a conflict, carrying the first explicit turn id", () => {
    expect(resolveCodexSegmentTurnAdmission(
      CodexThreadEventName.ITEM_COMPLETED,
      { turnId: "turn-t", item: { type: "commandExecution" } },
      "turn-u",
    )).toEqual({ accepted: false, reason: "CODEX_SEGMENT_TURN_CONFLICT", eventTurnId: "turn-t" });
    expect(resolveCodexSegmentTurnAdmission(
      CodexThreadEventName.ITEM_STARTED,
      { turnId: "turn-u", item: { type: "mcpToolCall", turnId: "turn-t" } },
      "turn-u",
    )).toEqual({ accepted: false, reason: "CODEX_SEGMENT_TURN_CONFLICT", eventTurnId: "turn-u" });
  });

  it("rejects an ungoverned event that omits its turn id", () => {
    expect(resolveCodexSegmentTurnAdmission("item/other", { itemId: "x" }, "turn-u")).toEqual({
      accepted: false,
      reason: "CODEX_SEGMENT_TURN_OMISSION_UNLISTED",
      eventTurnId: null,
    });
  });
});
