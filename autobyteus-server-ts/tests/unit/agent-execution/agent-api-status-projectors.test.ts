import { describe, expect, it } from "vitest";
import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
} from "../../../src/agent-execution/domain/agent-status-payload.js";
import { projectAutoByteusAgentLifecycleSnapshot } from "../../../src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.js";
import { projectCodexAgentLifecycleSnapshot } from "../../../src/agent-execution/backends/codex/events/codex-status-projector.js";
import { projectClaudeAgentLifecycleSnapshot } from "../../../src/agent-execution/backends/claude/events/claude-status-projector.js";

describe("agent API status and runtime lifecycle projectors", () => {
  it("normalizes only canonical and supported persisted API status tokens", () => {
    expect(normalizeAgentApiStatus(undefined)).toBe("offline");
    expect(normalizeAgentApiStatus("offline")).toBe("offline");
    expect(normalizeAgentApiStatus("initializing")).toBe("initializing");
    expect(normalizeAgentApiStatus("idle")).toBe("idle");
    expect(normalizeAgentApiStatus("running")).toBe("running");
    expect(normalizeAgentApiStatus("error")).toBe("error");
    expect(normalizeAgentApiStatus("ACTIVE")).toBe("running");
    expect(normalizeAgentApiStatus("TERMINATED")).toBe("offline");

    for (const removedStatus of [
      "uninitialized",
      "bootstrapping",
      "processing_user_input",
      "awaiting_llm_response",
      "interrupting",
      "shutdown_complete",
      "failed",
    ]) {
      expect(normalizeAgentApiStatus(removedStatus, "idle")).toBe("idle");
    }
  });

  it("serializes status without the removed interrupt capability", () => {
    const payload = buildAgentStatusPayload({
      status: "running",
      agentId: "run-1",
    });

    expect(payload).toEqual({ status: "running", agent_id: "run-1" });
    expect(payload).not.toHaveProperty("can_interrupt");
  });

  it("projects identified and anonymous Autobyteus turns as current running work", () => {
    expect(projectAutoByteusAgentLifecycleSnapshot({
      currentStatus: "initializing",
      context: { state: { activeTurn: { turnId: "turn-1" } } },
      isActive: true,
    })).toEqual({
      availability: "active",
      phase: "running",
      currentTurn: { kind: "IDENTIFIED", turnId: "turn-1" },
    });

    expect(projectAutoByteusAgentLifecycleSnapshot({
      currentStatus: "awaiting_llm_response",
      context: { state: { activeTurn: {} } },
      isActive: true,
    })).toEqual({
      availability: "active",
      phase: "running",
      currentTurn: { kind: "ANONYMOUS" },
    });
  });

  it("projects provider running phase without turn identity as initializing", () => {
    expect(projectAutoByteusAgentLifecycleSnapshot({
      currentStatus: "processing_user_input",
      context: null,
      isActive: true,
    })).toMatchObject({ phase: "initializing", currentTurn: { kind: "NONE" } });

    expect(projectCodexAgentLifecycleSnapshot({
      currentStatus: "running",
      activeTurnId: null,
      isActive: true,
    })).toMatchObject({ phase: "initializing", currentTurn: { kind: "NONE" } });

    expect(projectClaudeAgentLifecycleSnapshot({
      currentStatus: "running",
      activeTurnId: null,
      isActive: true,
    })).toMatchObject({ phase: "initializing", currentTurn: { kind: "NONE" } });
  });

  it("maps provider startup tokens while letting current turn identity win", () => {
    for (const currentStatus of ["uninitialized", "bootstrapping", "starting", "startup"]) {
      expect(projectAutoByteusAgentLifecycleSnapshot({
        currentStatus,
        context: null,
        isActive: true,
      }).phase).toBe("initializing");
    }

    expect(projectCodexAgentLifecycleSnapshot({
      currentStatus: "starting",
      activeTurnId: "turn-1",
      isActive: true,
    })).toEqual({
      availability: "active",
      phase: "running",
      currentTurn: { kind: "IDENTIFIED", turnId: "turn-1" },
    });

    expect(projectClaudeAgentLifecycleSnapshot({
      currentStatus: "startup",
      activeTurnId: "turn-1",
      isActive: true,
    })).toEqual({
      availability: "active",
      phase: "running",
      currentTurn: { kind: "IDENTIFIED", turnId: "turn-1" },
    });
  });

  it("maps inactive runtime snapshots to offline and active empty snapshots to idle", () => {
    for (const snapshot of [
      projectAutoByteusAgentLifecycleSnapshot({
        currentStatus: "running",
        context: { state: { activeTurn: {} } },
        isActive: false,
      }),
      projectCodexAgentLifecycleSnapshot({
        currentStatus: "running",
        activeTurnId: "turn-1",
        isActive: false,
      }),
      projectClaudeAgentLifecycleSnapshot({
        currentStatus: "running",
        activeTurnId: "turn-1",
        isActive: false,
      }),
    ]) {
      expect(snapshot).toEqual({
        availability: "offline",
        phase: "idle",
        currentTurn: { kind: "NONE" },
      });
    }

    expect(projectCodexAgentLifecycleSnapshot({
      currentStatus: "idle",
      activeTurnId: null,
      isActive: true,
    })).toEqual({
      availability: "active",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    });
  });
});
