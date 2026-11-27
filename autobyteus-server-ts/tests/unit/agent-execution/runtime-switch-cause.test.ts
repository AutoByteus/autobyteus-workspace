/**
 * autobyteus-646 R-7: an automatic switch's cause is stored with its pending switch (exact fields, a malformed one makes
 * the record unreadable), kept by the selection rule (a person's save leaves none), and the hand-over marker is
 * rendered from it; without it the marker is today's.
 */
import { describe, expect, it } from "vitest";
import { buildRuntimeSwitchBetween } from "../../../src/agent-execution/domain/runtime-switch.js";
import { applyRuntimeSelection } from "../../../src/run-history/domain/runtime-selection-rule.js";
import { parsePendingRuntimeSwitch } from "../../../src/run-history/store/agent-run-pending-runtime-switch.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const FROM = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-6.1-terra", llmConfig: null, platformAgentRunId: "thread-1" };
const TO = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" };
const ROUTER = { kind: "usage_limit" as const, resetAt: "2026-11-27T09:00:00.000Z", chosenBy: "model_router" as const, reason: "Claude handled this agent's browser tasks well." };

describe("the hand-over marker of an automatic switch", () => {
  it("is rendered from the cause: the reset time, the new runtime and who chose it", () => {
    expect(buildRuntimeSwitchBetween({ runId: "r", to: TO, pending: { switchId: "s", from: FROM, cause: ROUTER } }).markerText)
      .toBe("Codex App Server usage limit reached (resets Nov 27, 09:00 UTC) — switched to Claude Agent SDK (opus). Chosen by the Model Router: Claude handled this agent's browser tasks well.");
    expect(buildRuntimeSwitchBetween({ runId: "r", to: TO, pending: { switchId: "s", from: FROM,
      cause: { kind: "usage_limit", resetAt: null, chosenBy: "agent_history", reason: null } } }).markerText)
      .toBe("Codex App Server usage limit reached — switched to Claude Agent SDK (opus). Chosen from this agent's history.");
  });

  it("without a cause stays today's text", () => {
    expect(buildRuntimeSwitchBetween({ runId: "r", to: TO, pending: { switchId: "s", from: FROM } }).markerText)
      .toBe("Agent runtime changed from Codex App Server (gpt-6.1-terra) to Claude Agent SDK (opus).");
  });
});

describe("the stored cause", () => {
  it("is read back with its exact fields, and a record without one reads as before", () => {
    expect(parsePendingRuntimeSwitch({ switchId: "s", from: FROM, cause: ROUTER })).toEqual({ switchId: "s", from: FROM, cause: ROUTER });
    expect(parsePendingRuntimeSwitch({ switchId: "s", from: FROM })).toEqual({ switchId: "s", from: FROM });
  });

  it.each([
    [{ ...ROUTER, kind: "cost_budget" }, "kind must be usage_limit"],
    [{ ...ROUTER, chosenBy: "person" }, "chosenBy must be model_router or agent_history"],
    [{ kind: "usage_limit", resetAt: null, chosenBy: "agent_history" }, "missing required field(s): reason"],
  ])("a malformed cause makes the record unreadable (%j)", (cause, message) => {
    expect(() => parsePendingRuntimeSwitch({ switchId: "s", from: FROM, cause })).toThrow(message);
  });

  it("the selection rule puts an automatic switch's cause on the pending switch; a person's later save leaves none", () => {
    const state = { binding: FROM };
    const switched = applyRuntimeSelection(state, { ...TO, llmConfig: null, continuation: "hand_over", cause: ROUTER }, "s-1");
    expect(switched.pendingRuntimeSwitch).toEqual({ switchId: "s-1", from: FROM, cause: ROUTER });
    const edited = applyRuntimeSelection(switched, { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: null, continuation: "hand_over" }, "s-2");
    expect(edited.pendingRuntimeSwitch).toEqual({ switchId: "s-1", from: FROM });
  });
});
