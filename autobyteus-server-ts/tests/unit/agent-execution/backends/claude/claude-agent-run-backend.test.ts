import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { ClaudeAgentRunBackend } from "../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-backend.js";

const createBackend = (overrides: Record<string, unknown> = {}) => {
  const session = {
    isActive: vi.fn().mockReturnValue(true),
    sessionId: "claude-session-1",
    getStatusSnapshotSource: vi.fn().mockReturnValue({
      currentStatus: "IDLE",
      activeTurnId: null,
      isInterrupting: false,
    }),
    subscribeRuntimeEvents: vi.fn().mockImplementation((listener) => {
      listener({ method: "turn/completed", params: {} });
      return () => {};
    }),
    submitInput: vi.fn().mockResolvedValue({ accepted: true, turnId: "turn-1" }),
    approveTool: vi.fn().mockResolvedValue(undefined),
    interrupt: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  const runContext = {
    runId: "run-claude-1",
    config: {
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    },
  };

  return {
    session,
    backend: new ClaudeAgentRunBackend(runContext as any, session as any),
  };
};

describe("ClaudeAgentRunBackend", () => {
  it("delegates to the Claude session and exposes current session state", async () => {
    const { backend, session } = createBackend();
    const listener = vi.fn();

    const unsubscribe = backend.subscribeToSourceEventBatches(listener);
    const sendResult = await backend.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("hello claude"),
    });
    const approveResult = await backend.approveToolInvocation("invoke-1", true);
    const interruptResult = await backend.interrupt("turn-1");
    const terminateResult = await backend.terminate();

    expect(typeof unsubscribe).toBe("function");
    expect(listener).toHaveBeenCalled();
    expect(session.submitInput).toHaveBeenCalledWith(
      expect.objectContaining({ content: "hello claude" }),
      { kind: "start_turn" },
    );
    expect(session.approveTool).toHaveBeenCalledWith("invoke-1", true, null);
    expect(session.interrupt).toHaveBeenCalledWith("turn-1");
    expect(session.terminate).toHaveBeenCalledTimes(1);
    expect(sendResult).toEqual({
      forwarded: true,
      turnId: "turn-1",
      platformAgentRunId: "claude-session-1",
    });
    expect(approveResult).toEqual({ accepted: true });
    expect(interruptResult).toEqual({ accepted: true, turnId: "turn-1" });
    expect(terminateResult).toEqual({ accepted: true });
    expect(backend.getPlatformAgentRunId()).toBe("claude-session-1");
    expect(backend.getLifecycleSnapshot()).toEqual({
      availability: "active",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    });
  });

  it("returns a runtime command failure when the session input throws", async () => {
    const { backend } = createBackend({
      submitInput: vi.fn().mockRejectedValue(new Error("boom")),
    });

    const result = await backend.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("hello failing claude"),
    });

    expect(result.forwarded).toBe(false);
    expect(result.code).toBe("RUNTIME_COMMAND_FAILED");
    expect(result.message).toContain("Failed to send user input");
  });

  it("declares active-turn append support and forwards appends into the session turn", async () => {
    const { backend, session } = createBackend();
    expect(backend.inputCapabilities).toEqual({ activeTurnAppend: "supported" });

    await expect(backend.dispatchUserInput({
      kind: "append_to_active_turn",
      turnId: "turn-active",
      message: new AgentInputUserMessage("steer"),
    })).resolves.toEqual({ forwarded: true, turnId: "turn-1", platformAgentRunId: "claude-session-1" });
    expect(session.submitInput).toHaveBeenCalledWith(
      expect.objectContaining({ content: "steer" }),
      { kind: "append_to_active_turn", turnId: "turn-active" },
    );
  });

  it("maps a session rejection to a non-forwarded dispatch without a turn", async () => {
    const { backend } = createBackend({
      submitInput: vi.fn().mockResolvedValue({
        accepted: false,
        code: "CLAUDE_APPEND_TURN_MISMATCH",
        message: "Claude append expected active turn 'turn-a' but 'none' is current.",
      }),
    });

    await expect(backend.dispatchUserInput({
      kind: "append_to_active_turn",
      turnId: "turn-a",
      message: new AgentInputUserMessage("late"),
    })).resolves.toEqual({
      forwarded: false,
      code: "CLAUDE_APPEND_TURN_MISMATCH",
      message: "Claude append expected active turn 'turn-a' but 'none' is current.",
      turnId: null,
    });
  });
});
