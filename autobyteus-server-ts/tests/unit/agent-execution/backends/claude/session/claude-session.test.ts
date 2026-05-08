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

const createResultQuery = (sessionId = "claude-session-1"): ClaudeSdkQueryLike => ({
  async *[Symbol.asyncIterator]() {
    yield {
      type: "result",
      session_id: sessionId,
      result: "done",
    };
  },
  interrupt: vi.fn(async () => undefined),
  close: vi.fn(() => undefined),
});

const createQueryFromChunks = (chunks: unknown[]): ClaudeSdkQueryLike => ({
  async *[Symbol.asyncIterator]() {
    for (const chunk of chunks) {
      yield chunk;
    }
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

const createProviderSessionThenPendingQuery = (
  providerSessionId: string,
): {
  query: ClaudeSdkQueryLike;
  release: () => void;
} => {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const query = {
    async *[Symbol.asyncIterator]() {
      yield {
        type: "assistant",
        session_id: providerSessionId,
        message: {
          id: "msg-provider-session",
          role: "assistant",
          content: [],
        },
      };
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
  hasCompletedTurn?: boolean;
  autoExecuteTools?: boolean;
  query?: ClaudeSdkQueryLike;
  queries?: ClaudeSdkQueryLike[];
} = {}) => {
  const sessionMessageCache = new ClaudeSessionMessageCache();
  const interruptQuery = vi.fn(async () => undefined);
  const queryQueue = [...(input.queries ?? (input.query ? [input.query] : []))];
  const startQueryTurn = vi.fn(async () => queryQueue.shift() ?? createResultQuery());
  const closeQuery = vi.fn((query: ClaudeSdkQueryLike | null) => {
    query?.close();
  });
  const terminateRunSession = vi.fn(async () => undefined);
  const clearPendingToolApprovals = vi.fn();
  let sessionRef: ClaudeSession | null = null;
  const toolingCoordinator = new ClaudeSessionToolUseCoordinator(
    new Map(),
    new Map(),
    (_runContext, event) => sessionRef?.emitRuntimeEvent(event),
  );
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
      hasCompletedTurn: input.hasCompletedTurn ?? false,
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
  sessionRef = session;

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

  it("resumes an interrupted incomplete turn using its adopted Claude provider session id", async () => {
    const providerSessionId = "claude-session-interrupted";
    const firstQuery = createProviderSessionThenPendingQuery(providerSessionId);
    const { session, startQueryTurn, closeQuery } = createSession({
      queries: [firstQuery.query, createResultQuery(providerSessionId)],
    });

    await session.sendTurn(new AgentInputUserMessage("start long work"));
    await waitFor(() => session.sessionId === providerSessionId, "provider session adoption");

    const firstOptions = startQueryTurn.mock.calls[0]?.[0] as { sessionId?: string | null };
    expect(firstOptions.sessionId).toBeNull();
    expect(session.hasCompletedTurn).toBe(false);

    const interruptPromise = session.interrupt();
    await waitFor(() => closeQuery.mock.calls.length === 1, "interrupt query close");
    firstQuery.release();
    await interruptPromise;

    expect(session.hasCompletedTurn).toBe(false);

    await session.sendTurn(new AgentInputUserMessage("continue with that context"));
    await waitFor(() => startQueryTurn.mock.calls.length === 2, "follow-up query start");

    const secondOptions = startQueryTurn.mock.calls[1]?.[0] as { sessionId?: string | null };
    expect(secondOptions.sessionId).toBe(providerSessionId);
    await waitFor(() => session.hasCompletedTurn, "follow-up turn completion");
  });

  it("does not pass the local run id placeholder as a Claude resume id after interrupt", async () => {
    const firstQuery = createManuallySettledQuery();
    const { session, startQueryTurn, closeQuery } = createSession({
      queries: [firstQuery.query, createResultQuery("claude-session-after-placeholder")],
    });

    await session.sendTurn(new AgentInputUserMessage("start before provider id"));
    await waitFor(() => startQueryTurn.mock.calls.length === 1, "initial query start");

    const interruptPromise = session.interrupt();
    await waitFor(() => closeQuery.mock.calls.length === 1, "placeholder interrupt query close");
    firstQuery.release();
    await interruptPromise;

    expect(session.sessionId).toBe("run-1");
    expect(session.hasCompletedTurn).toBe(false);

    await session.sendTurn(new AgentInputUserMessage("follow up without provider id"));
    await waitFor(() => startQueryTurn.mock.calls.length === 2, "placeholder follow-up query start");

    const secondOptions = startQueryTurn.mock.calls[1]?.[0] as { sessionId?: string | null };
    expect(secondOptions.sessionId).toBeNull();
    await waitFor(() => session.hasCompletedTurn, "placeholder follow-up completion");
  });

  it("continues to resume completed Claude turns with the adopted provider session id", async () => {
    const providerSessionId = "claude-session-completed";
    const { session, startQueryTurn } = createSession({
      queries: [createResultQuery(providerSessionId), createResultQuery(providerSessionId)],
    });

    await session.sendTurn(new AgentInputUserMessage("first turn"));
    await waitFor(() => session.hasCompletedTurn, "first turn completion");

    const firstOptions = startQueryTurn.mock.calls[0]?.[0] as { sessionId?: string | null };
    expect(firstOptions.sessionId).toBeNull();

    await session.sendTurn(new AgentInputUserMessage("second turn"));
    await waitFor(() => startQueryTurn.mock.calls.length === 2, "completed follow-up query start");

    const secondOptions = startQueryTurn.mock.calls[1]?.[0] as { sessionId?: string | null };
    expect(secondOptions.sessionId).toBe(providerSessionId);
  });

  it("continues to resume restored Claude runs with the restored provider session id", async () => {
    const restoredSessionId = "claude-session-restored";
    const { session, startQueryTurn } = createSession({
      sessionId: restoredSessionId,
      hasCompletedTurn: true,
      queries: [createResultQuery(restoredSessionId)],
    });

    await session.sendTurn(new AgentInputUserMessage("restored follow up"));
    await waitFor(() => startQueryTurn.mock.calls.length === 1, "restored query start");

    const options = startQueryTurn.mock.calls[0]?.[0] as { sessionId?: string | null };
    expect(options.sessionId).toBe(restoredSessionId);
  });

  it("emits provider-derived text segment ids and preserves text-tool-text order", async () => {
    const chunks = [
      {
        type: "assistant",
        session_id: "claude-session-1",
        uuid: "assistant-wrapper-pre",
        message: {
          id: "msg-pre",
          role: "assistant",
          content: [
            {
              type: "text",
              text: "I will inspect the workspace first.",
            },
            {
              type: "tool_use",
              id: "tool-bash-1",
              name: "Bash",
              input: { command: "pwd" },
            },
          ],
        },
      },
      {
        type: "user",
        session_id: "claude-session-1",
        uuid: "user-wrapper-tool-result",
        message: {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tool-bash-1",
              content: "/tmp/project",
              is_error: false,
            },
          ],
        },
      },
      {
        type: "assistant",
        session_id: "claude-session-1",
        uuid: "assistant-wrapper-post",
        message: {
          id: "msg-post",
          role: "assistant",
          content: [
            {
              type: "text",
              text: "The workspace is /tmp/project.",
            },
          ],
        },
      },
      {
        type: "result",
        session_id: "claude-session-1",
        uuid: "result-wrapper",
        result: "The workspace is /tmp/project.",
      },
    ];
    const { session, sessionMessageCache } = createSession({
      query: createQueryFromChunks(chunks),
    });
    const events: Array<{ method: string; params?: Record<string, unknown> }> = [];
    session.subscribeRuntimeEvents((event) => {
      events.push(event);
    });

    const { turnId } = await session.sendTurn(new AgentInputUserMessage("where am I?"));
    const activeTurnId = turnId ?? "";
    await waitFor(
      () => events.some((event) => event.method === ClaudeSessionEventName.TURN_COMPLETED),
      "Claude turn completion",
    );

    const textDeltas = events.filter(
      (event) => event.method === ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA,
    );
    const textCompletions = events.filter(
      (event) => event.method === ClaudeSessionEventName.ITEM_OUTPUT_TEXT_COMPLETED,
    );
    const preTextId = `${activeTurnId}:claude-text:msg-pre:0`;
    const postTextId = `${activeTurnId}:claude-text:msg-post:0`;

    expect(textDeltas.map((event) => event.params?.id)).toEqual([preTextId, postTextId]);
    expect(textDeltas.every((event) => event.params?.id !== activeTurnId)).toBe(true);
    expect(textDeltas.map((event) => event.params?.delta)).toEqual([
      "I will inspect the workspace first.",
      "The workspace is /tmp/project.",
    ]);
    expect(textCompletions.map((event) => event.params?.id)).toEqual([preTextId, postTextId]);
    expect(textCompletions.map((event) => event.params?.text)).toEqual([
      "I will inspect the workspace first.",
      "The workspace is /tmp/project.",
    ]);

    const preTextIndex = events.findIndex(
      (event) =>
        event.method === ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA &&
        event.params?.id === preTextId,
    );
    const toolStartIndex = events.findIndex(
      (event) =>
        event.method === ClaudeSessionEventName.ITEM_ADDED &&
        event.params?.id === "tool-bash-1",
    );
    const toolEndIndex = events.findIndex(
      (event) =>
        event.method === ClaudeSessionEventName.ITEM_COMPLETED &&
        event.params?.id === "tool-bash-1",
    );
    const postTextIndex = events.findIndex(
      (event) =>
        event.method === ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA &&
        event.params?.id === postTextId,
    );
    expect(preTextIndex).toBeGreaterThanOrEqual(0);
    expect(toolStartIndex).toBeGreaterThan(preTextIndex);
    expect(toolEndIndex).toBeGreaterThan(toolStartIndex);
    expect(postTextIndex).toBeGreaterThan(toolEndIndex);

    expect(sessionMessageCache.getCachedMessages("claude-session-1")).toEqual([
      expect.objectContaining({
        role: "user",
        content: "where am I?",
      }),
      expect.objectContaining({
        role: "assistant",
        content: "I will inspect the workspace first.The workspace is /tmp/project.",
      }),
    ]);
  });

  it("coalesces partial stream_event text deltas by message and content block", async () => {
    const chunks = [
      {
        type: "stream_event",
        session_id: "claude-session-1",
        uuid: "partial-wrapper-start",
        event: {
          type: "message_start",
          message: {
            id: "msg-partial",
            role: "assistant",
            content: [],
          },
        },
      },
      {
        type: "stream_event",
        session_id: "claude-session-1",
        uuid: "partial-wrapper-block-start",
        event: {
          type: "content_block_start",
          index: 0,
          content_block: {
            type: "text",
            text: "",
          },
        },
      },
      {
        type: "stream_event",
        session_id: "claude-session-1",
        uuid: "partial-wrapper-delta-1",
        event: {
          type: "content_block_delta",
          index: 0,
          delta: {
            type: "text_delta",
            text: "Hel",
          },
        },
      },
      {
        type: "stream_event",
        session_id: "claude-session-1",
        uuid: "partial-wrapper-delta-2",
        event: {
          type: "content_block_delta",
          index: 0,
          delta: {
            type: "text_delta",
            text: "lo",
          },
        },
      },
      {
        type: "stream_event",
        session_id: "claude-session-1",
        uuid: "partial-wrapper-block-stop",
        event: {
          type: "content_block_stop",
          index: 0,
        },
      },
      {
        type: "stream_event",
        session_id: "claude-session-1",
        uuid: "partial-wrapper-message-stop",
        event: {
          type: "message_stop",
        },
      },
      {
        type: "result",
        session_id: "claude-session-1",
        uuid: "partial-result-wrapper",
        result: "Hello",
      },
    ];
    const { session } = createSession({
      query: createQueryFromChunks(chunks),
    });
    const events: Array<{ method: string; params?: Record<string, unknown> }> = [];
    session.subscribeRuntimeEvents((event) => {
      events.push(event);
    });

    const { turnId } = await session.sendTurn(new AgentInputUserMessage("stream please"));
    const activeTurnId = turnId ?? "";
    await waitFor(
      () => events.some((event) => event.method === ClaudeSessionEventName.TURN_COMPLETED),
      "Claude partial turn completion",
    );

    const expectedTextId = `${activeTurnId}:claude-text:msg-partial:0`;
    const textDeltas = events.filter(
      (event) => event.method === ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA,
    );
    const textCompletions = events.filter(
      (event) => event.method === ClaudeSessionEventName.ITEM_OUTPUT_TEXT_COMPLETED,
    );

    expect(textDeltas.map((event) => event.params?.id)).toEqual([
      expectedTextId,
      expectedTextId,
    ]);
    expect(textDeltas.map((event) => event.params?.delta)).toEqual(["Hel", "lo"]);
    expect(textCompletions).toHaveLength(1);
    expect(textCompletions[0]?.params).toMatchObject({
      id: expectedTextId,
      text: "Hello",
    });
    expect(events.some((event) => event.params?.id === activeTurnId)).toBe(false);
  });
});
