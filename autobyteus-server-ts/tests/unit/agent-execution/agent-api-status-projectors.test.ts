import { describe, expect, it } from "vitest";
import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
} from "../../../src/agent-execution/domain/agent-status-payload.js";
import { projectAutoByteusAgentStatus } from "../../../src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.js";
import { projectCodexAgentStatus } from "../../../src/agent-execution/backends/codex/events/codex-status-projector.js";
import { projectClaudeAgentStatus } from "../../../src/agent-execution/backends/claude/events/claude-status-projector.js";

describe("agent API status projectors", () => {
  it("normalizes only canonical and current persisted API status tokens", () => {
    expect(normalizeAgentApiStatus(undefined)).toBe("offline");
    expect(normalizeAgentApiStatus("offline")).toBe("offline");
    expect(normalizeAgentApiStatus("initializing")).toBe("initializing");
    expect(normalizeAgentApiStatus("idle")).toBe("idle");
    expect(normalizeAgentApiStatus("running")).toBe("running");
    expect(normalizeAgentApiStatus("error")).toBe("error");
    expect(normalizeAgentApiStatus("ACTIVE")).toBe("running");
    expect(normalizeAgentApiStatus("TERMINATED")).toBe("offline");
  });

  it("does not preserve removed lifecycle status tokens", () => {
    for (const removedStatus of [
      "uninitialized",
      "bootstrapping",
      "starting",
      "startup",
      "processing_user_input",
      "awaiting_llm_response",
      "awaiting_tool_approval",
      "executing_tool",
      "tool_denied",
      "interrupting",
      "shutting_down",
      "shutdown_complete",
      "failed",
      "failure",
    ]) {
      expect(normalizeAgentApiStatus(removedStatus, "idle")).toBe("idle");
    }
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

  it("keeps initializing non-interruptible even when a runtime reports an active turn", () => {
    expect(buildAgentStatusPayload({
      status: "initializing",
      canInterrupt: true,
    })).toMatchObject({
      status: "initializing",
      can_interrupt: false,
    });

    expect(projectAutoByteusAgentStatus({
      currentStatus: "initializing",
      context: { state: { activeTurn: {} } },
      isActive: true,
    })).toMatchObject({
      status: "initializing",
      can_interrupt: false,
    });
  });

  it("does not map removed lifecycle tokens through provider status projectors", () => {
    for (const currentStatus of ["uninitialized", "interrupting", "shutting_down"]) {
      expect(projectAutoByteusAgentStatus({
        currentStatus,
        context: { state: { activeTurn: {} } },
        isActive: true,
      })).toMatchObject({
        status: "idle",
        can_interrupt: false,
      });
    }

    expect(projectCodexAgentStatus({
      currentStatus: "awaiting_llm_response",
      activeTurnId: "turn-1",
      isActive: true,
    })).toMatchObject({
      status: "idle",
      can_interrupt: false,
    });

    expect(projectClaudeAgentStatus({
      currentStatus: "failed",
      activeTurnId: "turn-1",
      isActive: true,
    })).toMatchObject({
      status: "idle",
      can_interrupt: false,
    });
  });

  it("maps inactive runtime snapshots to offline", () => {
    expect(projectAutoByteusAgentStatus({
      currentStatus: "running",
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
