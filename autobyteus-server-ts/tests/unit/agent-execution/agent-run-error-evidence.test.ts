import { describe, expect, it } from "vitest";
import { resolveAgentRunErrorEvidence } from "../../../src/agent-execution/domain/agent-run-error-evidence.js";
import { resolveAgentRunEventTurnId } from "../../../src/agent-execution/domain/agent-run-event-turn-id.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";

const errorEvent = (payload: Record<string, unknown>): AgentRunEvent => ({
  eventType: AgentRunEventType.ERROR,
  runId: "run-1",
  payload,
  statusHint: "ERROR",
});

describe("canonical agent run evidence", () => {
  it("normalizes camel and snake turn identity while rejecting blanks", () => {
    expect(resolveAgentRunEventTurnId(errorEvent({ turnId: " camel " }))).toBe("camel");
    expect(resolveAgentRunEventTurnId(errorEvent({ turn_id: " snake " }))).toBe("snake");
    expect(resolveAgentRunEventTurnId(errorEvent({ turnId: " ", turn_id: "" }))).toBeNull();
  });

  it("validates correlation and effect as a strict union", () => {
    expect(resolveAgentRunErrorEvidence(errorEvent({
      error_scope: "turn", error_effect: "diagnostic", turn_id: "turn-1",
    }))).toEqual({ kind: "TURN_DIAGNOSTIC", turnId: "turn-1" });
    expect(resolveAgentRunErrorEvidence(errorEvent({
      error_scope: "turn", error_effect: "terminal", turnId: "turn-1",
    }))).toEqual({ kind: "TURN_TERMINAL", turnId: "turn-1" });
    expect(resolveAgentRunErrorEvidence(errorEvent({
      error_scope: "runtime", error_effect: "terminal",
    }))).toEqual({ kind: "RUNTIME_GLOBAL" });
  });

  it.each([
    {},
    { error_scope: "turn", error_effect: "terminal" },
    { error_scope: "runtime", error_effect: "diagnostic" },
    { error_scope: "runtime", error_effect: "terminal", turn_id: "turn-1" },
    { error_scope: "turn", error_effect: "unknown", turn_id: "turn-1" },
  ])("keeps invalid evidence non-authoritative: %j", (payload) => {
    expect(resolveAgentRunErrorEvidence(errorEvent(payload))).toBeNull();
  });
});
