import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { CodexAgentRunBackend } from "../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-backend.js";
import { CodexThread } from "../../../../../src/agent-execution/backends/codex/thread/codex-thread.js";
import { CodexThreadEventName } from "../../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";

const createBackend = (overrides: Record<string, unknown> = {}) => {
  const threadManager = {
    hasThread: vi.fn().mockReturnValue(true),
    terminateThread: vi.fn().mockResolvedValue(undefined),
  };

  const runContext = {
    runId: "run-codex-1",
    config: {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    },
    runtimeContext: {
      threadId: "thread-1",
      activeTurnId: null,
      codexThreadConfig: {
        model: null,
        workingDirectory: "/tmp/codex-backend-test-workspace",
        reasoningEffort: null,
        approvalPolicy: null,
        sandbox: null,
      },
    },
  };

  const startup = {
    status: "ready",
    waitForReady: Promise.resolve(),
    resolveReady: vi.fn(),
    rejectReady: vi.fn(),
  };

  const client = {
    request: vi.fn().mockResolvedValue({
      turn: {
        id: "turn-1",
      },
    }),
    respondSuccess: vi.fn(),
    respondError: vi.fn(),
  };

  const codexThread = new CodexThread({
    runContext: runContext as any,
    client: client as any,
    startup: startup as any,
  });

  Object.assign(codexThread, overrides);

  return {
    codexThread,
    threadManager,
    emitThreadEvent: (event: Record<string, unknown>) => {
      codexThread.handleAppServerNotification(
        String(event.method),
        (event.params ?? {}) as Record<string, unknown>,
      );
    },
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

    expect((codexThread.client as any).request).toHaveBeenCalledWith(
      "turn/start",
      expect.objectContaining({
        input: expect.arrayContaining([
          expect.objectContaining({
            type: "text",
            text: "hello codex",
          }),
        ]),
      }),
    );
    expect(result).toEqual({
      accepted: true,
      turnId: "turn-1",
      platformAgentRunId: "thread-1",
    });
  });

  it("returns a runtime command failure when the codex thread sendTurn throws", async () => {
    const { backend } = createBackend({
      client: {
        request: vi.fn().mockRejectedValue(new Error("boom")),
        respondSuccess: vi.fn(),
        respondError: vi.fn(),
      },
    });

    const result = await backend.postUserMessage(
      new AgentInputUserMessage("hello failing codex"),
    );

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("RUNTIME_COMMAND_FAILED");
    expect(result.message).toContain("Failed to send user input");
  });

  it("dispatches idle lifecycle events even when token usage updates were observed earlier", () => {
    const { backend, codexThread, emitThreadEvent } = createBackend();
    codexThread.runContext.runtimeContext.activeTurnId = "turn-usage-1";
    codexThread.runContext.runtimeContext.codexThreadConfig.model = "gpt-5.4-mini";
    codexThread.setCurrentStatus("RUNNING");

    const emittedEvents: Array<Record<string, unknown>> = [];
    backend.subscribeToEvents((event) => {
      emittedEvents.push(event as unknown as Record<string, unknown>);
    });

    emitThreadEvent({
      method: CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED,
      params: {
        threadId: "thread-1",
        turnId: "turn-usage-1",
        tokenUsage: {
          last: {
            totalTokens: 15,
            inputTokens: 10,
            outputTokens: 5,
          },
        },
      },
    });

    emitThreadEvent({
      method: CodexThreadEventName.THREAD_STATUS_CHANGED,
      params: {
        threadId: "thread-1",
        status: {
          type: "idle",
        },
      },
    });

    emitThreadEvent({
      method: CodexThreadEventName.TURN_COMPLETED,
      params: {
        threadId: "thread-1",
        turn: {
          id: "turn-usage-1",
        },
      },
    });

    expect(emittedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: AgentRunEventType.AGENT_STATUS,
          payload: expect.objectContaining({
            new_status: "IDLE",
          }),
        }),
        expect.objectContaining({
          eventType: AgentRunEventType.TURN_COMPLETED,
          payload: expect.objectContaining({
            turnId: "turn-usage-1",
          }),
        }),
      ]),
    );
  });

  it("does not emit runtime events for late token usage updates after idle", () => {
    const { backend, codexThread, emitThreadEvent } = createBackend();
    codexThread.runContext.runtimeContext.activeTurnId = "turn-late-usage-1";
    codexThread.runContext.runtimeContext.codexThreadConfig.model = "gpt-5.4-mini";
    codexThread.setCurrentStatus("IDLE");

    const emittedEvents: Array<Record<string, unknown>> = [];
    backend.subscribeToEvents((event) => {
      emittedEvents.push(event as unknown as Record<string, unknown>);
    });

    emitThreadEvent({
      method: CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED,
      params: {
        threadId: "thread-1",
        turnId: "turn-late-usage-1",
        tokenUsage: {
          last: {
            totalTokens: 18,
            inputTokens: 11,
            outputTokens: 7,
          },
        },
      },
    });

    expect(emittedEvents).toHaveLength(0);
  });
});
