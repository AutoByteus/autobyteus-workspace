import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";

const event = (
  eventType: AgentRunEventType,
  payload: Record<string, unknown>,
): AgentRunEvent => ({
  runId: "run-1",
  eventType,
  payload,
  statusHint: eventType === AgentRunEventType.AGENT_STATUS && payload.status === "error"
    ? "ERROR"
    : null,
});

describe("AgentRunService lifecycle observation", () => {
  it("ignores diagnostic content and fails only when canonical error status follows terminal evidence", async () => {
    let runtimeListener: ((event: unknown) => void) | null = null;
    const activeRun = {
      runId: "run-1",
      subscribeToEvents: vi.fn((listener) => {
        runtimeListener = listener;
        return vi.fn();
      }),
      isActive: vi.fn(() => true),
    };
    const service = new AgentRunService("/tmp/agent-run-lifecycle-observation", {
      agentRunManager: { getActiveRun: vi.fn(() => activeRun) } as any,
      metadataService: {} as any,
      historyCatalogService: {} as any,
      workspaceManager: {} as any,
    });
    const observed: Array<{ phase: string; errorMessage?: string | null }> = [];
    const unsubscribe = await service.observeAgentRunLifecycle("run-1", (item) => observed.push(item));

    runtimeListener!(event(AgentRunEventType.ERROR, {
      message: "recoverable",
      error_scope: "turn",
      error_effect: "diagnostic",
      turn_id: "turn-b",
    }));
    runtimeListener!(event(AgentRunEventType.AGENT_STATUS, { status: "running" }));
    expect(observed.map((item) => item.phase)).toEqual(["ATTACHED"]);

    runtimeListener!(event(AgentRunEventType.ERROR, {
      message: "terminal failure",
      error_scope: "turn",
      error_effect: "terminal",
      turn_id: "turn-b",
    }));
    runtimeListener!(event(AgentRunEventType.AGENT_STATUS, { status: "error" }));

    expect(observed).toEqual([
      expect.objectContaining({ phase: "ATTACHED" }),
      expect.objectContaining({ phase: "FAILED", errorMessage: "terminal failure" }),
    ]);
    unsubscribe?.();
  });
});
