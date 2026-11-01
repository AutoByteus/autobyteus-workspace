import { describe, expect, it } from "vitest";
import { resolveCodexSegmentTurnAdmission } from "../../../../../../src/agent-execution/backends/codex/thread/codex-segment-turn-admission.js";

describe("resolveCodexSegmentTurnAdmission", () => {
  it("accepts an explicit matching turn id and stamps the exact turn", () => {
    const params = { item: { type: "agentMessage", id: "m-1", turnId: " turn-u " } };
    expect(resolveCodexSegmentTurnAdmission(params, "turn-u")).toEqual({
      accepted: true,
      turnId: "turn-u",
      paramsWithExactTurn: { ...params, turn_id: "turn-u" },
      source: "explicit",
    });
  });

  it("lets a governed event without a turn id inherit the active turn", () => {
    const params = { itemId: "m-1", delta: "hi" };
    expect(
      resolveCodexSegmentTurnAdmission(params, "turn-u"),
    ).toEqual({
      accepted: true,
      turnId: "turn-u",
      paramsWithExactTurn: { ...params, turn_id: "turn-u" },
      source: "active_inheritance",
    });
  });

  it("rejects an invalid explicit turn id without an event turn id", () => {
    expect(resolveCodexSegmentTurnAdmission(
      { turnId: "turn-u", item: { type: "commandExecution", turn_id: "  " } },
      "turn-u",
    )).toEqual({ accepted: false, reason: "CODEX_SEGMENT_TURN_EXPLICIT_INVALID", eventTurnId: null });
    expect(resolveCodexSegmentTurnAdmission(
      { turnId: 7 },
      null,
    )).toEqual({ accepted: false, reason: "CODEX_SEGMENT_TURN_EXPLICIT_INVALID", eventTurnId: null });
  });

  it("rejects any event while no turn is active, carrying the event's own turn id or null", () => {
    expect(resolveCodexSegmentTurnAdmission(
      { turnId: " turn-t ", item: { type: "commandExecution" } },
      null,
    )).toEqual({ accepted: false, reason: "CODEX_SEGMENT_TURN_INACTIVE", eventTurnId: "turn-t" });
    expect(resolveCodexSegmentTurnAdmission(
      { itemId: "m-1", delta: "x" },
      "  ",
    )).toEqual({ accepted: false, reason: "CODEX_SEGMENT_TURN_INACTIVE", eventTurnId: null });
  });

  it("rejects a turn id other than the active one as a conflict, carrying the first explicit turn id", () => {
    expect(resolveCodexSegmentTurnAdmission(
      { turnId: "turn-t", item: { type: "commandExecution" } },
      "turn-u",
    )).toEqual({ accepted: false, reason: "CODEX_SEGMENT_TURN_CONFLICT", eventTurnId: "turn-t" });
    expect(resolveCodexSegmentTurnAdmission(
      { turnId: "turn-u", item: { type: "mcpToolCall", turnId: "turn-t" } },
      "turn-u",
    )).toEqual({ accepted: false, reason: "CODEX_SEGMENT_TURN_CONFLICT", eventTurnId: "turn-u" });
  });
});
