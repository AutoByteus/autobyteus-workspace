import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { ClaudeAgentRunContext } from "../../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { ClaudeSessionEventName } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { buildClaudeSessionConfig } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { ClaudeSessionManager } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-manager.js";
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

const createRunContext = (input: { runId: string; sessionId?: string }) =>
  new AgentRunContext({
    runId: input.runId,
    config: new AgentRunConfig({
      agentDefinitionId: "agent-1",
      llmModelIdentifier: "haiku",
      autoExecuteTools: false,
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
      sessionId: input.sessionId,
    }),
  });

describe("ClaudeSessionManager", () => {
  it("creates a run session and initializes runtime context to a fresh local placeholder session id", async () => {
    const manager = new ClaudeSessionManager({} as never, {
      getSessionMessages: vi.fn(async () => []),
      listModels: vi.fn(async () => []),
    } as never);
    const runContext = createRunContext({ runId: "run-create" });

    const session = await manager.createRunSession(runContext as never);

    expect(manager.hasRunSession("run-create")).toBe(true);
    expect(session.runContext.runtimeContext.sessionId).toBe("run-create");
    expect(session.runContext.runtimeContext.hasCompletedTurn).toBe(false);
    expect(session.runContext.runtimeContext.activeTurnId).toBe(null);
  });

  it("restores a run session and marks it as having completed a prior turn", async () => {
    const manager = new ClaudeSessionManager({} as never, {
      getSessionMessages: vi.fn(async () => []),
      listModels: vi.fn(async () => []),
    } as never);
    const runContext = createRunContext({ runId: "run-restore" });

    const session = await manager.restoreRunSession(runContext as never, "claude-session-7");

    expect(manager.hasRunSession("run-restore")).toBe(true);
    expect(session.runContext.runtimeContext.sessionId).toBe("claude-session-7");
    expect(session.runContext.runtimeContext.hasCompletedTurn).toBe(true);
    expect(session.runContext.runtimeContext.activeTurnId).toBe(null);
  });

  it("uses the provided session id directly when fetching session messages", async () => {
    const sdkClient = {
      getSessionMessages: vi.fn(async () => []),
      listModels: vi.fn(async () => []),
    } as const;
    const manager = new ClaudeSessionManager({} as never, sdkClient as never);

    await manager.getSessionMessages("session-123");

    expect(sdkClient.getSessionMessages).toHaveBeenCalledWith("session-123");
  });

  it("falls back to cached messages when the SDK returns no history", async () => {
    const sdkClient = {
      getSessionMessages: vi.fn(async () => []),
      listModels: vi.fn(async () => []),
    } as const;
    const manager = new ClaudeSessionManager({} as never, sdkClient as never);
    const cache = (manager as any).sessionMessageCache;
    cache.appendMessage("claude-session-1", {
      role: "user",
      content: "cached message",
      createdAt: 1,
    });

    const messages = await manager.getSessionMessages("claude-session-1");

    expect(messages).toEqual([
      {
        role: "user",
        content: "cached message",
        createdAt: 1,
      },
    ]);
  });

  it("merges normalized SDK history with cached messages when both are available", async () => {
    const sdkClient = {
      getSessionMessages: vi.fn(async () => [
        {
          role: "assistant",
          content: "sdk message",
          createdAt: 2,
        },
      ]),
      listModels: vi.fn(async () => []),
    } as const;
    const manager = new ClaudeSessionManager({} as never, sdkClient as never);
    const cache = (manager as any).sessionMessageCache;
    cache.appendMessage("claude-session-2", {
      role: "user",
      content: "cached message",
      createdAt: 1,
    });

    const messages = await manager.getSessionMessages("claude-session-2");

    expect(messages).toEqual([
      {
        role: "assistant",
        content: "sdk message",
        createdAt: 2,
      },
      {
        role: "user",
        content: "cached message",
        createdAt: 1,
      },
    ]);
  });

  it("terminates a run session, emits SESSION_TERMINATED, and removes the run session", async () => {
    const manager = new ClaudeSessionManager({} as never, {
      getSessionMessages: vi.fn(async () => []),
      listModels: vi.fn(async () => []),
    } as never);
    const session = await manager.createRunSession(
      createRunContext({ runId: "run-terminate" }) as never,
    );
    const events: string[] = [];
    session.subscribeRuntimeEvents((event) => {
      events.push(event.method);
    });

    await manager.terminateRun("run-terminate");

    expect(events).toContain(ClaudeSessionEventName.SESSION_TERMINATED);
    expect(manager.hasRunSession("run-terminate")).toBe(false);
  });

  it("settles an active turn through the session-owned interrupt sequence before termination cleanup", async () => {
    const controlledQuery = createManuallySettledQuery();
    const closeQuery = vi.fn((query: ClaudeSdkQueryLike | null) => {
      query?.close();
    });
    const sdkClient = {
      getSessionMessages: vi.fn(async () => []),
      listModels: vi.fn(async () => []),
      startQueryTurn: vi.fn(async () => controlledQuery.query),
      closeQuery,
    };
    const manager = new ClaudeSessionManager({} as never, sdkClient as never);
    const session = await manager.createRunSession(
      createRunContext({ runId: "run-active-terminate" }) as never,
    );
    const events: Array<{ method: string; activeTurnId: string | null }> = [];
    session.subscribeRuntimeEvents((event) => {
      events.push({
        method: event.method,
        activeTurnId: session.activeTurnId,
      });
    });

    const clearPendingToolApprovals = vi.fn();
    (manager as any).toolingCoordinator.clearPendingToolApprovals =
      clearPendingToolApprovals;

    const { turnId } = await session.sendTurn(new AgentInputUserMessage("hello"));
    await waitFor(
      () =>
        (manager as any).activeQueriesByRunId.get("run-active-terminate") ===
        controlledQuery.query,
      "active Claude query registration",
    );
    const startQueryOptions = sdkClient.startQueryTurn.mock.calls[0]?.[0] as {
      abortController?: AbortController;
    };
    expect(startQueryOptions.abortController).toBeInstanceOf(AbortController);
    clearPendingToolApprovals.mockImplementationOnce(() => {
      expect(startQueryOptions.abortController?.signal.aborted).toBe(false);
    });
    closeQuery.mockImplementationOnce((query: ClaudeSdkQueryLike | null) => {
      expect(startQueryOptions.abortController?.signal.aborted).toBe(true);
      query?.close();
    });

    const terminatePromise = manager.terminateRun("run-active-terminate");
    await waitFor(() => closeQuery.mock.calls.length === 1, "active terminate query close");

    expect(startQueryOptions.abortController?.signal.aborted).toBe(true);
    expect(clearPendingToolApprovals).toHaveBeenCalledWith(
      "run-active-terminate",
      "Tool approval cancelled because run was closed.",
    );
    expect(events.map((event) => event.method)).not.toContain(
      ClaudeSessionEventName.SESSION_TERMINATED,
    );
    expect(session.activeTurnId).toBe(turnId);

    controlledQuery.release();
    await terminatePromise;

    const eventMethods = events.map((event) => event.method);
    const interruptedIndex = eventMethods.indexOf(ClaudeSessionEventName.TURN_INTERRUPTED);
    const terminatedIndex = eventMethods.indexOf(ClaudeSessionEventName.SESSION_TERMINATED);
    expect(interruptedIndex).toBeGreaterThanOrEqual(0);
    expect(terminatedIndex).toBeGreaterThan(interruptedIndex);
    expect(
      events.find((event) => event.method === ClaudeSessionEventName.TURN_INTERRUPTED)
        ?.activeTurnId,
    ).toBeNull();
    expect(manager.hasRunSession("run-active-terminate")).toBe(false);
    expect(closeQuery).toHaveBeenCalledTimes(1);
  });
});
