import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { ClaudeAgentRunBackend } from "../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-backend.js";

const createBackend = (overrides: Record<string, unknown> = {}) => {
  const session = {
    isActive: vi.fn().mockReturnValue(true),
    sessionId: "claude-session-1",
    subscribeRuntimeEvents: vi.fn().mockImplementation((listener) => {
      listener({ method: "turn/completed", params: {} });
      return () => {};
    }),
    sendTurn: vi.fn().mockResolvedValue({
      turnId: "turn-1",
    }),
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

    const unsubscribe = backend.subscribeToEvents(listener);
    const sendResult = await backend.postUserMessage(new AgentInputUserMessage("hello claude"));
    const approveResult = await backend.approveToolInvocation("invoke-1", true);
    const interruptResult = await backend.interrupt();
    const terminateResult = await backend.terminate();

    expect(typeof unsubscribe).toBe("function");
    expect(listener).toHaveBeenCalled();
    expect(session.sendTurn).toHaveBeenCalledWith(
      expect.objectContaining({ content: "hello claude" }),
    );
    expect(session.approveTool).toHaveBeenCalledWith("invoke-1", true, null);
    expect(session.interrupt).toHaveBeenCalledTimes(1);
    expect(session.terminate).toHaveBeenCalledTimes(1);
    expect(sendResult).toEqual({ accepted: true });
    expect(approveResult).toEqual({ accepted: true });
    expect(interruptResult).toEqual({ accepted: true });
    expect(terminateResult).toEqual({ accepted: true });
    expect(backend.getPlatformAgentRunId()).toBe("claude-session-1");
    expect(backend.getStatus()).toBe("IDLE");
  });

  it("returns a runtime command failure when session sendTurn throws", async () => {
    const { backend } = createBackend({
      sendTurn: vi.fn().mockRejectedValue(new Error("boom")),
    });

    const result = await backend.postUserMessage(
      new AgentInputUserMessage("hello failing claude"),
    );

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("RUNTIME_COMMAND_FAILED");
    expect(result.message).toContain("Failed to send user input");
  });
});
