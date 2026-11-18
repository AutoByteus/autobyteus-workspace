import { describe, expect, it } from "vitest";
import { NOTHING_TO_INTERRUPT, userInterruptOutcome } from "../../../../src/services/agent-streaming/user-interrupt-outcome.js";

describe("userInterruptOutcome (autobyteus-533 REQ-001)", () => {
  it.each(["NO_ACTIVE_TURN", "RUN_NOT_ACTIVE"])("answers %s as nothing to stop, accepted", (code) => {
    expect(userInterruptOutcome({ accepted: false, code, message: "AgentRun 'r' has nothing." })).toBe(NOTHING_TO_INTERRUPT);
    expect(NOTHING_TO_INTERRUPT).toEqual({ accepted: true });
  });

  it.each([
    { accepted: true, turnId: "turn-1" },
    { accepted: false, code: "RUNTIME_COMMAND_FAILED", message: "Failed." },
    { accepted: false, code: "INTERRUPT_EXECUTION_FAILED", message: "Failed." },
    { accepted: false, code: "RUN_NOT_FOUND", message: "Not a member." },
    { accepted: false, code: "TURN_MISMATCH", message: "Other turn." },
    { accepted: false },
  ])("passes every other result on as it is: %o", (result) => {
    expect(userInterruptOutcome(result)).toBe(result);
  });
});
