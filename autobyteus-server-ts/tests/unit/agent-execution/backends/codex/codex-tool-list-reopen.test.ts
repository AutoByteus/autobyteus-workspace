import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../src/agent-execution/domain/agent-run-context.js";
import type { AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { CodexAgentRunContext } from "../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-context.js";
import { CodexAgentRunBackend } from "../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-backend.js";
import { CodexThreadManager } from "../../../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import { CodexApprovalPolicy } from "../../../../../src/agent-execution/backends/codex/thread/codex-thread-config.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { buildRuntimeAgentToolExposure } from "../../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import type { CodexAppServerClient } from "../../../../../src/runtime-management/codex/client/codex-app-server-client.js";
import type { CodexAppServerClientManager } from "../../../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import type { CodexClientThreadRouter } from "../../../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import type { CodexThreadCleanup } from "../../../../../src/agent-execution/backends/codex/backend/codex-thread-cleanup.js";
import type { SystemInstructionCaptureService } from "../../../../../src/agent-memory/services/system-instruction-capture-service.js";
import { activatedAgentToolMcpRunSessionsStub } from "../../../../helpers/agent-tool-mcp-run-sessions-stub.js";

// The Codex reopen sequence (design: "Codex reopen sequence"), measured in evidence/probe/drive-codex-reopen.mjs.

const createRunContext = (
  runId: string, threadId: string | null, toolNames: string[] = ["alpha"], extraAppServerConfig: Record<string, unknown> = {},
) => new AgentRunContext({
  runId,
  config: new AgentRunConfig({
    runtimeKind: RuntimeKind.CODEX_APP_SERVER, agentDefinitionId: "def", llmModelIdentifier: "gpt",
    autoExecuteTools: false, workspaceId: null, memoryDir: null, llmConfig: null,
  }),
  runtimeContext: new CodexAgentRunContext({
    codexThreadConfig: {
      model: null, workingDirectory: "/tmp/codex-reopen", reasoningEffort: null, serviceTier: null,
      approvalPolicy: CodexApprovalPolicy.ON_REQUEST, sandbox: "workspace-write", baseInstructions: null,
      developerInstructions: null,
      appServerConfig: { ...extraAppServerConfig, mcp_servers: { autobyteus_agent_tools: { enabled_tools: toolNames } } } as never,
      dynamicTools: [],
    },
    runtimeToolExposure: buildRuntimeAgentToolExposure(toolNames),
    threadId,
  }),
});

const createManager = (respond: (method: string, params: Record<string, unknown>) => unknown) => {
  const calls: Array<{ method: string; params: Record<string, unknown> }> = [];
  const client = {
    request: vi.fn(async (method: string, params: Record<string, unknown>) => {
      calls.push({ method, params });
      return respond(method, params);
    }),
  } as unknown as CodexAppServerClient;
  const manager = new CodexThreadManager(
    { beginAcquire: vi.fn(() => ({ acquire: vi.fn(async () => client), release: vi.fn(async () => undefined) })) } as unknown as CodexAppServerClientManager,
    { cleanupPreparedWorkspaceSkills: vi.fn(async () => undefined) } as unknown as CodexThreadCleanup,
    { registerThread: vi.fn(() => () => {}) } as unknown as CodexClientThreadRouter,
    { capture: vi.fn(() => ({ created: false })) } as unknown as SystemInstructionCaptureService,
  );
  return { manager, calls };
};

const newConfig = { mcp_servers: { autobyteus_agent_tools: { url: "http://x", enabled_tools: ["alpha", "beta"], startup_timeout_sec: 5 } } };

describe("CodexThreadManager.reopenThread", () => {
  it("unsubscribes and resumes the same thread with the new config when it has a conversation", async () => {
    const { manager, calls } = createManager((method, params) =>
      method === "thread/unsubscribe" ? { status: "unsubscribed" } : { thread: { id: params.threadId ?? "thread-1" } });
    const context = createRunContext("run-restored", "thread-1");
    await manager.restoreThread(context, () => undefined);
    calls.length = 0;

    await manager.reopenThread(context, newConfig);

    expect(calls.map((call) => call.method)).toEqual(["thread/unsubscribe", "thread/resume"]);
    expect(calls[0]!.params).toEqual({ threadId: "thread-1" });
    expect(calls[1]!.params).toMatchObject({ threadId: "thread-1", config: newConfig });
    expect(context.runtimeContext.threadId).toBe("thread-1");
    expect(context.runtimeContext.codexThreadConfig.appServerConfig).toEqual(newConfig);
  });

  it("starts a new thread when it has no conversation yet (no rollout to resume)", async () => {
    let started = 0;
    const { manager, calls } = createManager((method) =>
      method === "thread/unsubscribe" ? { status: "unsubscribed" } : { thread: { id: `thread-new-${++started}` } });
    const context = createRunContext("run-new", null);
    await manager.createThread(context, () => undefined);
    expect(context.runtimeContext.threadId).toBe("thread-new-1");
    expect(context.runtimeContext.hasConversationHistory).toBe(false);
    calls.length = 0;

    await manager.reopenThread(context, newConfig);

    expect(calls.map((call) => call.method)).toEqual(["thread/unsubscribe", "thread/start"]);
    expect(calls[1]!.params).toMatchObject({ config: newConfig });
    expect(context.runtimeContext.threadId).toBe("thread-new-2");
    expect(manager.getThread("run-new")?.threadId).toBe("thread-new-2");
  });

  it("refuses to reopen during a turn or for a run it does not hold", async () => {
    const { manager, calls } = createManager(() => ({ thread: { id: "thread-1" } }));
    const context = createRunContext("run-busy", "thread-1");
    await manager.restoreThread(context, () => undefined);
    calls.length = 0;
    context.runtimeContext.activeTurnId = "turn-1";
    await expect(manager.reopenThread(context, newConfig)).rejects.toThrow("during a turn");
    await expect(manager.reopenThread(createRunContext("run-other", "thread-9"), newConfig)).rejects.toThrow("not open");
    expect(calls).toEqual([]);
  });
});

const createBackend = (input: { toolNames?: string[]; extraAppServerConfig?: Record<string, unknown> } = {}) => {
  const context = createRunContext("run-codex", "thread-1", input.toolNames ?? ["alpha"], input.extraAppServerConfig);
  const runSessions = activatedAgentToolMcpRunSessionsStub("run-codex", input.toolNames ?? ["alpha"]);
  let turns = 0;
  const thread = {
    workingDirectory: "/tmp/codex-reopen",
    takePendingSystemInstructionCapture: () => null,
    subscribeAppServerMessages: () => () => undefined,
    getPlatformAgentRunId: () => context.runtimeContext.threadId,
    getStatusSnapshotSource: () => ({ currentStatus: "IDLE", activeTurnId: null, isInterrupting: false }),
    startInput: vi.fn(async () => ({ turnId: `turn-${++turns}` })),
    appendInput: vi.fn(async (_message: unknown, turnId: string) => ({ turnId })),
  };
  const threadManager = {
    getThread: () => thread,
    reopenThread: vi.fn(async () => undefined),
  };
  const backend = new CodexAgentRunBackend(context as never, thread as never, threadManager as never, runSessions);
  const events: AgentRunEvent[] = [];
  backend.subscribeToSourceEventBatches((batch) => { events.push(...batch); });
  const definition = (toolNames: string[]) => ({ toolNames }) as never;
  const start = (text = "go") => backend.dispatchUserInput({ kind: "start_turn", message: new AgentInputUserMessage(text) });
  return { backend, context, runSessions, thread, threadManager, events, definition, start };
};

describe("CodexAgentRunBackend tool list changes", () => {
  it("enforces at once on the server, and reopens at the next turn start with the new list", async () => {
    const { backend, runSessions, threadManager, thread, definition, start } = createBackend();

    const applied = await backend.applyDefinitionTools(definition(["alpha", "beta"]));
    expect(applied).toEqual({ kind: "on_next_turn", toolNames: ["alpha", "beta"] });
    expect(runSessions.replaceForRun).toHaveBeenCalledOnce();
    expect(backend.getToolNames()).toEqual(["alpha"]);

    expect(await start()).toMatchObject({ forwarded: true, turnId: "turn-1" });
    expect(threadManager.reopenThread).toHaveBeenCalledOnce();
    expect(threadManager.reopenThread.mock.calls[0]![1]).toMatchObject({
      mcp_servers: { autobyteus_agent_tools: { enabled_tools: ["alpha", "beta"] } },
    });
    expect(threadManager.reopenThread.mock.invocationCallOrder[0]).toBeLessThan(thread.startInput.mock.invocationCallOrder[0]!);
    expect(backend.getToolNames()).toEqual(["alpha", "beta"]);

    await start("again");
    expect(threadManager.reopenThread).toHaveBeenCalledOnce();
  });

  it("keeps the run's integration variables and sandbox network access in the reopened thread's config (DS-002)", async () => {
    const integration = {
      shell_environment_policy: { set: { AUTOBYTEUS_GITHUB_API_URL: "http://127.0.0.1:5555/r/rp_test-dummy/github/api" } },
      sandbox_workspace_write: { network_access: true },
    };
    const { backend, threadManager, definition, start } = createBackend({ extraAppServerConfig: integration });
    await backend.applyDefinitionTools(definition(["alpha", "beta"]));
    await start();
    expect(threadManager.reopenThread.mock.calls[0]![1]).toMatchObject({
      ...integration,
      mcp_servers: { autobyteus_agent_tools: { enabled_tools: ["alpha", "beta"] } },
    });
  });

  it("sends an append to the current thread unchanged while a reopen is pending", async () => {
    const { backend, threadManager, thread, definition } = createBackend();
    await backend.applyDefinitionTools(definition(["alpha", "beta"]));
    const result = await backend.dispatchUserInput({
      kind: "append_to_active_turn", turnId: "turn-0", message: new AgentInputUserMessage("steer"),
    });
    expect(result).toMatchObject({ forwarded: true, turnId: "turn-0" });
    expect(thread.appendInput).toHaveBeenCalledOnce();
    expect(threadManager.reopenThread).not.toHaveBeenCalled();
  });

  it("fails the turn start with a plain message when the reopen fails: no input sent, no notice, and retried next time", async () => {
    const { backend, threadManager, thread, events, definition, start } = createBackend();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await backend.applyDefinitionTools(definition(["alpha", "beta"]));
    threadManager.reopenThread.mockRejectedValueOnce(new Error("resume refused"));

    const failed = await start();
    expect(failed).toEqual({
      forwarded: false,
      code: "RUNTIME_SESSION_REOPEN_FAILED",
      message: "Couldn't give this run its new tools (resume refused). Send your message again to retry, or stop and resume the run.",
      turnId: null,
    });
    expect(thread.startInput).not.toHaveBeenCalled();
    expect(events).toEqual([]);
    expect(backend.getToolNames()).toEqual(["alpha"]);

    expect(await start()).toMatchObject({ forwarded: true });
    expect(threadManager.reopenThread).toHaveBeenCalledTimes(2);
    expect(backend.getToolNames()).toEqual(["alpha", "beta"]);
  });

  it("needs no reopen for a change reverted before the next turn start", async () => {
    const { backend, threadManager, definition, start } = createBackend();
    expect((await backend.applyDefinitionTools(definition(["alpha", "beta"]))).kind).toBe("on_next_turn");
    expect(await backend.applyDefinitionTools(definition(["alpha"]))).toEqual({ kind: "unchanged", toolNames: ["alpha"] });
    expect(await backend.applyDefinitionTools(definition(["alpha"]))).toEqual({ kind: "unchanged", toolNames: ["alpha"] });
    await start();
    expect(threadManager.reopenThread).not.toHaveBeenCalled();
  });

  it("keeps the reopen pending when the list changes again during a reopen", async () => {
    const { backend, threadManager, definition, start } = createBackend();
    await backend.applyDefinitionTools(definition(["alpha", "beta"]));
    threadManager.reopenThread.mockImplementationOnce(async () => {
      await backend.applyDefinitionTools(definition(["alpha", "beta", "gamma"]));
    });
    await start();
    expect(backend.getToolNames()).toEqual(["alpha", "beta"]);
    await start("again");
    expect(threadManager.reopenThread).toHaveBeenCalledTimes(2);
    expect(backend.getToolNames()).toEqual(["alpha", "beta", "gamma"]);
  });
});
