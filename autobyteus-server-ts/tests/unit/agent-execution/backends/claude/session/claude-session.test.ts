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
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";

const createSession = (input: {
  activeTurnId?: string | null;
  sessionId?: string;
  autoExecuteTools?: boolean;
} = {}) => {
  const sessionMessageCache = new ClaudeSessionMessageCache();
  const interruptQuery = vi.fn(async () => undefined);
  const terminateRunSession = vi.fn(async () => undefined);
  const clearPendingToolApprovals = vi.fn();
  const toolingCoordinator = new ClaudeSessionToolUseCoordinator(new Map(), new Map(), () => {});
  toolingCoordinator.clearPendingToolApprovals = clearPendingToolApprovals;

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
      sessionId: input.sessionId ?? "run-1",
      activeTurnId: input.activeTurnId ?? null,
    }),
  });

  const session = new ClaudeSession({
    runContext,
    dependencies: {
      sessionMessageCache,
      sdkClient: {
        interruptQuery,
      } as never,
      activeQueriesByRunId: new Map(),
      toolingCoordinator,
      isRunSessionActive: () => true,
      terminateRunSession,
    },
  });

  return {
    session,
    sessionMessageCache,
    interruptQuery,
    terminateRunSession,
    clearPendingToolApprovals,
  };
};

describe("ClaudeSession", () => {
  it("rejects sending a new turn while another turn is already active", async () => {
    const { session } = createSession({ activeTurnId: "run-1:turn:active" });

    await expect(session.sendTurn(new AgentInputUserMessage("hello"))).rejects.toThrow(
      "Claude runtime turn is already active for run 'run-1'.",
    );
  });

  it("interrupts the active turn, clears pending approvals, and emits TURN_INTERRUPTED", async () => {
    const { session, interruptQuery, clearPendingToolApprovals } = createSession({
      activeTurnId: "run-1:turn:active",
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
    expect(interruptQuery).toHaveBeenCalledWith(null);
    expect(events).toContain(ClaudeSessionEventName.TURN_INTERRUPTED);
    expect(session.activeAbortController).toBe(null);
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
