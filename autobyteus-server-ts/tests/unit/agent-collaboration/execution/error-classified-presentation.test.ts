import { describe, expect, it } from "vitest";
import { AgentRunPresentationAdapter } from "../../../../src/agent-collaboration/execution/events/collaboration-agent-presentation-adapter.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TeamAgentEventAdapter } from "../../../../src/agent-team-execution/services/team-agent-event-adapter.js";

/** autobyteus-646 AR-012: a late error classification is read only by the detector; no presentation shows or rejects it. */
describe("ERROR_CLASSIFIED in the presentation adapters", () => {
  const event = { eventType: AgentRunEventType.ERROR_CLASSIFIED, runId: "run-1", statusHint: null, occurredAt: 1795452909697,
    payload: { turn_id: "t-1", error_kind: "usage_limit" } };

  it("is not presented, never rejected as an admission failure", () => {
    expect(new AgentRunPresentationAdapter(() => null).adapt(event)).toEqual({ kind: "not_presented" });
    expect(new TeamAgentEventAdapter(() => null as never).adapt(event)).toEqual({ kind: "not_presented" });
  });
});
