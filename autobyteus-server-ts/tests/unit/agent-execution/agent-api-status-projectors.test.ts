import { describe, expect, it } from "vitest";
import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
} from "../../../src/agent-execution/domain/agent-status-payload.js";
import { projectAutoByteusAgentStatus } from "../../../src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.js";
import { projectCodexAgentStatus } from "../../../src/agent-execution/backends/codex/events/codex-status-projector.js";
import { projectClaudeAgentStatus } from "../../../src/agent-execution/backends/claude/events/claude-status-projector.js";

describe("agent API status projectors", () => {
  it("normalizes the public four-state vocabulary with offline as the no-runtime fallback", () => {
    expect(normalizeAgentApiStatus(undefined)).toBe("offline");
    expect(normalizeAgentApiStatus("shutdown_complete")).toBe("offline");
    expect(normalizeAgentApiStatus("idle")).toBe("idle");
    expect(normalizeAgentApiStatus("awaiting_llm_response")).toBe("running");
    expect(normalizeAgentApiStatus("failed")).toBe("error");
  });

  it("never allows can_interrupt outside running status", () => {
    expect(buildAgentStatusPayload({
      status: "offline",
      canInterrupt: true,
    })).toMatchObject({
      status: "offline",
      can_interrupt: false,
    });
  });

  it("maps inactive runtime snapshots to offline", () => {
    expect(projectAutoByteusAgentStatus({
      currentStatus: "processing_user_input",
      context: { state: { activeTurn: {} } },
      isActive: false,
    })).toMatchObject({
      status: "offline",
      can_interrupt: false,
    });

    expect(projectCodexAgentStatus({
      currentStatus: "RUNNING",
      activeTurnId: "turn-1",
      isActive: false,
    })).toMatchObject({
      status: "offline",
      can_interrupt: false,
    });

    expect(projectClaudeAgentStatus({
      currentStatus: "RUNNING",
      activeTurnId: "turn-1",
      isActive: false,
    })).toMatchObject({
      status: "offline",
      can_interrupt: false,
    });
  });

  it("keeps active-runtime idle distinct from inactive offline", () => {
    expect(projectCodexAgentStatus({
      currentStatus: "IDLE",
      activeTurnId: null,
      isActive: true,
    })).toMatchObject({
      status: "idle",
      can_interrupt: false,
    });

    expect(projectClaudeAgentStatus({
      currentStatus: "IDLE",
      activeTurnId: null,
      isActive: true,
    })).toMatchObject({
      status: "idle",
      can_interrupt: false,
    });
  });
});
