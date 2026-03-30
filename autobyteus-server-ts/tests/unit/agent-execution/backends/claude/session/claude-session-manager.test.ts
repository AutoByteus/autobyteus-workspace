import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { ClaudeAgentRunContext } from "../../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { ClaudeSessionEventName } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { buildClaudeSessionConfig } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { ClaudeSessionManager } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-manager.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";

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
});
