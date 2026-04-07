import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { CodexAgentRunBackend } from "../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-backend.js";

const createBackend = (overrides: Record<string, unknown> = {}) => {
  const codexThread = {
    subscribeAppServerMessages: vi.fn().mockImplementation((_listener) => () => {}),
    sendTurn: vi.fn().mockResolvedValue({
      turnId: "turn-1",
    }),
    getPlatformAgentRunId: vi.fn().mockReturnValue("thread-1"),
    getStatus: vi.fn().mockReturnValue("IDLE"),
    approveTool: vi.fn().mockResolvedValue(undefined),
    interrupt: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  const threadManager = {
    hasThread: vi.fn().mockReturnValue(true),
    terminateThread: vi.fn().mockResolvedValue(undefined),
  };

  const runContext = {
    runId: "run-codex-1",
    config: {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    },
  };

  return {
    codexThread,
    threadManager,
    backend: new CodexAgentRunBackend(
      runContext as any,
      codexThread as any,
      threadManager as any,
    ),
  };
};

describe("CodexAgentRunBackend", () => {
  it("returns the accepted platform run id from the codex thread", async () => {
    const { backend, codexThread } = createBackend();

    const result = await backend.postUserMessage(
      new AgentInputUserMessage("hello codex"),
    );

    expect(codexThread.sendTurn).toHaveBeenCalledWith(
      expect.objectContaining({ content: "hello codex" }),
    );
    expect(result).toEqual({
      accepted: true,
      platformAgentRunId: "thread-1",
    });
  });

  it("returns a runtime command failure when the codex thread sendTurn throws", async () => {
    const { backend } = createBackend({
      sendTurn: vi.fn().mockRejectedValue(new Error("boom")),
    });

    const result = await backend.postUserMessage(
      new AgentInputUserMessage("hello failing codex"),
    );

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("RUNTIME_COMMAND_FAILED");
    expect(result.message).toContain("Failed to send user input");
  });
});
