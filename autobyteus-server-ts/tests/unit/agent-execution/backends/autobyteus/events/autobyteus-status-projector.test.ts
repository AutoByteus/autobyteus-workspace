import { describe, expect, it } from "vitest";
import { projectAutoByteusAgentLifecycleSnapshot } from "../../../../../../src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.js";

describe("projectAutoByteusAgentLifecycleSnapshot", () => {
  it.each([
    ["bootstrapping", "initializing"],
    ["uninitialized", "initializing"],
    ["processing_user_input", "initializing"],
    ["awaiting_llm_response", "initializing"],
    ["interrupting", "initializing"],
    ["idle", "idle"],
    ["shutdown_complete", "idle"],
    ["error", "error"],
  ])("maps native status %s to internal phase %s without current-turn evidence", (nativeStatus, expectedPhase) => {
    expect(projectAutoByteusAgentLifecycleSnapshot({
      currentStatus: nativeStatus,
      isActive: true,
    })).toMatchObject({
      availability: "active",
      phase: expectedPhase,
      currentTurn: { kind: "NONE" },
    });
  });

  it("lets current anonymous work establish running", () => {
    expect(projectAutoByteusAgentLifecycleSnapshot({
      currentStatus: "awaiting_tool_approval",
      isActive: true,
      context: { state: { activeTurn: {} } },
    })).toEqual({
      availability: "active",
      phase: "running",
      currentTurn: { kind: "ANONYMOUS" },
    });
  });

  it("uses inactive backend state as authoritative offline cleanup", () => {
    expect(projectAutoByteusAgentLifecycleSnapshot({
      currentStatus: "awaiting_tool_approval",
      isActive: false,
      context: { state: { activeTurn: {} } },
    })).toEqual({
      availability: "offline",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    });
  });
});
