import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { ClaudeAgentRunContext } from "../../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { buildClaudeSessionConfig } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { ClaudeSession } from "../../../../../../src/agent-execution/backends/claude/session/claude-session.js";
import { ClaudeSessionMessageCache } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-message-cache.js";
import { ClaudeSessionToolUseCoordinator } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.js";
import { ClaudeSessionEventName } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { buildConfiguredAgentToolExposure } from "../../../../../../src/agent-execution/shared/configured-agent-tool-exposure.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import type { ClaudeSdkQueryLike } from "../../../../../../src/runtime-management/claude/client/claude-sdk-client.js";

const waitFor = async (predicate: () => boolean, label: string): Promise<void> => {
  const deadline = Date.now() + 1_000;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const createResultQuery = (): ClaudeSdkQueryLike => ({
  async *[Symbol.asyncIterator]() {
    yield {
      type: "result",
      session_id: "claude-session-1",
      result: "done",
    };
  },
  interrupt: vi.fn(async () => undefined),
  close: vi.fn(() => undefined),
});

const createManuallySettledQuery = (): {
  query: ClaudeSdkQueryLike;
  release: () => void;
} => {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const query = {
    async *[Symbol.asyncIterator]() {
      await released;
    },
    interrupt: vi.fn(async () => undefined),
    close: vi.fn(() => undefined),
  };
  return { query, release };
};

const createSession = (input: {
  activeTurnId?: string | null;
  sessionId?: string;
  autoExecuteTools?: boolean;
  query?: ClaudeSdkQueryLike;
} = {}) => {
  const sessionMessageCache = new ClaudeSessionMessageCache();
  const interruptQuery = vi.fn(async () => undefined);
  const startQueryTurn = vi.fn(async () => input.query ?? createResultQuery());
  const closeQuery = vi.fn((query: ClaudeSdkQueryLike | null) => {
    query?.close();
  });
  const terminateRunSession = vi.fn(async () => undefined);
  const clearPendingToolApprovals = vi.fn();
  const toolingCoordinator = new ClaudeSessionToolUseCoordinator(new Map(), new Map(), () => {});
  toolingCoordinator.clearPendingToolApprovals = clearPendingToolApprovals;
  const activeQueriesByRunId = new Map<string, ClaudeSdkQueryLike>();

  const runContext = new AgentRunContext({
    runId: "run-1",
    config: new AgentRunConfig({
      agentDefinitionId: "agent-1",
      llmModelIdentifier: "haiku",
      autoExecuteTools: input.autoExecuteTools ?? false,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    }),
    runtimeContext: new ClaudeAgentRunContext({
      sessionConfig: buildClaudeSessionConfig({
        model: "haiku",
        workingDirectory: "/tmp",
        permissionMode: "default",
      }),
      configuredToolExposure: buildConfiguredAgentToolExposure([]),
      sessionId: input.sessionId ?? "run-1",
      activeTurnId: input.activeTurnId ?? null,
    }),
  });

  const session = new ClaudeSession({
    runContext,
    dependencies: {
      sessionMessageCache,
      sdkClient: {
        startQueryTurn,
        interruptQuery,
        closeQuery,
      } as never,
      activeQueriesByRunId,
      toolingCoordinator,
      isRunSessionActive: () => true,
      terminateRunSession,
    },
  });

  return {
    session,
    sessionMessageCache,
    startQueryTurn,
    interruptQuery,
    closeQuery,
    terminateRunSession,
    clearPendingToolApprovals,
    activeQueriesByRunId,
  };
};

describe("ClaudeSession", () => {
  it("rejects sending a new turn while another turn is already active", async () => {
    const { session } = createSession({ activeTurnId: "run-1:turn:active" });

    await expect(session.sendTurn(new AgentInputUserMessage("hello"))).rejects.toThrow(
      "Claude runtime turn is already active for run 'run-1'.",
    );
  });

  it("settles an interrupted active turn before emitting TURN_INTERRUPTED", async () => {
    const controlledQuery = createManuallySettledQuery();
    const {
      session,
      sessionMessageCache,
      startQueryTurn,
      interruptQuery,
      closeQuery,
      clearPendingToolApprovals,
      activeQueriesByRunId,
    } = createSession({
      query: controlledQuery.query,
    });

    const events: Array<{ method: string; activeTurnId: string | null }> = [];
    session.subscribeRuntimeEvents((event) => {
      events.push({
        method: event.method,
        activeTurnId: session.activeTurnId,
      });
    });

    const { turnId } = await session.sendTurn(new AgentInputUserMessage("hello"));
    await waitFor(
      () => activeQueriesByRunId.get("run-1") === controlledQuery.query,
      "active Claude query registration",
    );

    const startQueryOptions = startQueryTurn.mock.calls[0]?.[0] as {
      abortController?: AbortController;
    };
    expect(startQueryOptions.abortController).toBeInstanceOf(AbortController);
    clearPendingToolApprovals.mockImplementation(() => {
      expect(startQueryOptions.abortController?.signal.aborted).toBe(false);
    });
    closeQuery.mockImplementation((query: ClaudeSdkQueryLike | null) => {
      expect(startQueryOptions.abortController?.signal.aborted).toBe(true);
      query?.close();
    });

    const interruptPromise = session.interrupt();
    await waitFor(() => closeQuery.mock.calls.length === 1, "interrupt query close");

    expect(startQueryOptions.abortController?.signal.aborted).toBe(true);
    expect(clearPendingToolApprovals).toHaveBeenCalledWith(
      "run-1",
      "Tool approval interrupted.",
    );
    expect(interruptQuery).not.toHaveBeenCalled();
    expect(events.some((event) => event.method === ClaudeSessionEventName.TURN_INTERRUPTED)).toBe(
      false,
    );
    expect(session.activeTurnId).toBe(turnId);

    controlledQuery.release();
    await interruptPromise;

    const eventMethods = events.map((event) => event.method);
    expect(eventMethods).toContain(ClaudeSessionEventName.TURN_STARTED);
    expect(eventMethods).toContain(ClaudeSessionEventName.TURN_INTERRUPTED);
    expect(eventMethods).not.toContain(ClaudeSessionEventName.ERROR);
    expect(eventMethods).not.toContain(ClaudeSessionEventName.ITEM_OUTPUT_TEXT_COMPLETED);
    expect(eventMethods).not.toContain(ClaudeSessionEventName.TURN_COMPLETED);
    expect(
      events.find((event) => event.method === ClaudeSessionEventName.TURN_INTERRUPTED)
        ?.activeTurnId,
    ).toBeNull();
    expect(session.activeAbortController).toBe(null);
    expect(session.activeTurnId).toBeNull();
    expect(session.hasCompletedTurn).toBe(false);
    expect(activeQueriesByRunId.has("run-1")).toBe(false);
    expect(closeQuery).toHaveBeenCalledTimes(1);
    expect(sessionMessageCache.getCachedMessages("run-1")).toEqual([
      expect.objectContaining({
        role: "user",
        content: "hello",
      }),
    ]);
  });

  it("treats interrupt without an active turn execution as an idempotent cleanup no-op", async () => {
    const { session, interruptQuery, clearPendingToolApprovals } = createSession({
      activeTurnId: "run-1:turn:stale",
    });
    const abortController = new AbortController();
    session.setActiveAbortController(abortController);

    const events: string[] = [];
    session.subscribeRuntimeEvents((event) => {
      events.push(event.method);
    });

    await session.interrupt();

    expect(abortController.signal.aborted).toBe(true);
    expect(clearPendingToolApprovals).toHaveBeenCalledWith(
      "run-1",
      "Tool approval interrupted.",
    );
    expect(interruptQuery).not.toHaveBeenCalled();
    expect(events).not.toContain(ClaudeSessionEventName.TURN_INTERRUPTED);
    expect(session.activeAbortController).toBe(null);
    expect(session.activeTurnId).toBeNull();
  });

  it("delegates terminate to the session manager dependency", async () => {
    const { session, terminateRunSession } = createSession();

    await session.terminate();

    expect(terminateRunSession).toHaveBeenCalledTimes(1);
  });

  it("adopts a resolved Claude session id and migrates cached messages", () => {
    const { session, sessionMessageCache } = createSession({ sessionId: "placeholder-run-1" });

    sessionMessageCache.appendMessage("placeholder-run-1", {
      role: "user",
      content: "hello",
      createdAt: 1,
    });

    session.adoptResolvedSessionId("claude-session-42", sessionMessageCache);

    expect(session.runContext.runtimeContext.sessionId).toBe("claude-session-42");
    expect(sessionMessageCache.getCachedMessages("placeholder-run-1")).toEqual([]);
    expect(sessionMessageCache.getCachedMessages("claude-session-42")).toEqual([
      {
        role: "user",
        content: "hello",
        createdAt: 1,
      },
    ]);
  });
});
