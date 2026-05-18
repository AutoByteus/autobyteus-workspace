import { describe, expect, it } from "vitest";
import { projectAutoByteusAgentStatus } from "../../../../../../src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.js";

describe("projectAutoByteusAgentStatus", () => {
  it.each([
    ["bootstrapping", "initializing"],
    ["uninitialized", "initializing"],
    ["processing_user_input", "running"],
    ["awaiting_llm_response", "running"],
    ["analyzing_llm_response", "running"],
    ["awaiting_tool_approval", "running"],
    ["executing_tool", "running"],
    ["processing_tool_result", "running"],
    ["interrupting", "running"],
    ["idle", "idle"],
    ["shutdown_complete", "offline"],
    ["error", "error"],
  ])("maps native status %s to app status %s", (nativeStatus, expectedStatus) => {
    expect(projectAutoByteusAgentStatus({
      currentStatus: nativeStatus,
      isActive: true,
      agentId: "agent-1",
    })).toMatchObject({
      status: expectedStatus,
      agent_id: "agent-1",
    });
  });

  it("uses inactive backend state as authoritative offline cleanup", () => {
    expect(projectAutoByteusAgentStatus({
      currentStatus: "awaiting_tool_approval",
      isActive: false,
      context: { state: { activeTurn: {} } },
      agentId: "agent-1",
    })).toMatchObject({
      status: "offline",
      can_interrupt: false,
      agent_id: "agent-1",
    });
  });
});
