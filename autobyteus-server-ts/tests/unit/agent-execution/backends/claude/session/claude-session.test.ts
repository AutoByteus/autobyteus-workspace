import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { ClaudeAgentRunContext } from "../../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { buildClaudeSessionConfig } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { ClaudeSession } from "../../../../../../src/agent-execution/backends/claude/session/claude-session.js";
import { ClaudeProviderSessionLifecycle } from "../../../../../../src/agent-execution/backends/claude/session/claude-provider-session-lifecycle.js";
import { ClaudeSessionMessageCache } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-message-cache.js";
import { ClaudeSessionToolUseCoordinator } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.js";
import { ClaudeSessionEventName } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { projectClaudeAgentLifecycleSnapshot } from "../../../../../../src/agent-execution/backends/claude/events/claude-status-projector.js";
import { buildRuntimeAgentToolExposure } from "../../../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import type {
  ClaudeSdkQueryLike,
  ClaudeSdkStartQueryTurnOptions,
} from "../../../../../../src/runtime-management/claude/client/claude-sdk-client.js";
import type { SystemInstructionCaptureService } from "../../../../../../src/agent-memory/services/system-instruction-capture-service.js";

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

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const RESERVED_SESSION_ID = "11111111-1111-4111-8111-111111111111";
const RESTORED_SESSION_ID = "22222222-2222-4222-8222-222222222222";
const CONFLICTING_SESSION_ID = "33333333-3333-4333-8333-333333333333";

const createResultQuery = (sessionId = RESERVED_SESSION_ID): ClaudeSdkQueryLike => ({
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

type PermissionHarnessRequest = {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  onAllow: () => Promise<void>;
};

const createPermissionHarnessQuery = (
  canUseTool: NonNullable<ClaudeSdkStartQueryTurnOptions["canUseTool"]>,
  requests: PermissionHarnessRequest[],
): ClaudeSdkQueryLike => ({
  async *[Symbol.asyncIterator]() {
    for (const request of requests) {
      const decision = await canUseTool(request.toolName, request.input, {
        toolUseID: request.id,
      });
      if (decision["behavior"] === "allow") {
        await request.onAllow();
      }
    }
    yield {
      type: "result",
      session_id: RESERVED_SESSION_ID,
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
  llmConfig?: Record<string, unknown> | null;
  query?: ClaudeSdkQueryLike;
  queries?: ClaudeSdkQueryLike[];
  startQueryTurnImplementation?: (
    options: ClaudeSdkStartQueryTurnOptions,
  ) => Promise<ClaudeSdkQueryLike>;
  memoryDir?: string | null;
  systemInstructionCaptureService?: SystemInstructionCaptureService;
} = {}) => {
  const sessionMessageCache = new ClaudeSessionMessageCache();
  const queryQueue = [...(input.queries ?? (input.query ? [input.query] : []))];
  const defaultStartQueryTurn = async (_options: ClaudeSdkStartQueryTurnOptions) =>
    queryQueue.shift() ?? createResultQuery();
  const startQueryTurn = vi.fn(
    input.startQueryTurnImplementation ?? defaultStartQueryTurn,
  );
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
  const agentToolMcpRunSessions = {
    activateForRun: vi.fn(() => {
      throw new Error("Non-MCP ClaudeSession coverage must not issue Agent Tools.");
    }),
  };

  const runContext = new AgentRunContext({
    runId: "run-1",
    config: new AgentRunConfig({
      agentDefinitionId: "agent-1",
      llmModelIdentifier: "haiku",
      autoExecuteTools: input.autoExecuteTools ?? false,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      memoryDir: input.memoryDir ?? null,
      llmConfig: input.llmConfig ?? null,
    }),
    runtimeContext: new ClaudeAgentRunContext({
      sessionConfig: buildClaudeSessionConfig({
        model: "haiku",
        workingDirectory: "/tmp",
        permissionMode: "default",
        autoExecuteTools: input.autoExecuteTools ?? false,
        llmConfig: input.llmConfig ?? null,
      }),
      carpenterSystemPrompt: "## Agent Identity\n\n- Name: Test agent",
      runtimeToolExposure: buildRuntimeAgentToolExposure([]),
      sessionId: input.sessionId ?? null,
      hasCompletedTurn: input.hasCompletedTurn ?? false,
      activeTurnId: input.activeTurnId ?? null,
    }),
  });

  const session = new ClaudeSession({
    runContext,
    providerSessionLifecycle: input.sessionId
      ? ClaudeProviderSessionLifecycle.restore(input.sessionId, runContext.runId)
      : ClaudeProviderSessionLifecycle.reserveNew(() => RESERVED_SESSION_ID),
    dependencies: {
      sessionMessageCache,
      sdkClient: {
        startQueryTurn,
        closeQuery,
      } as never,
      activeQueriesByRunId,
      toolingCoordinator,
      agentToolMcpRunSessions,
      systemInstructionCaptureService: input.systemInstructionCaptureService,
      isRunSessionActive: () => true,
      terminateRunSession,
    },
  });
  sessionRef = session;

  return {
    session,
    sessionMessageCache,
    startQueryTurn,
    closeQuery,
    terminateRunSession,
    clearPendingToolApprovals,
    activeQueriesByRunId,
  };
};

describe("ClaudeSession", () => {
  it("forwards persisted thinking and effort on a restored session turn", async () => {
    const { session, startQueryTurn } = createSession({
      sessionId: RESERVED_SESSION_ID,
      query: createResultQuery(RESERVED_SESSION_ID),
      llmConfig: { thinking_enabled: true, reasoning_effort: "high" },
    });

    await session.startTurn(new AgentInputUserMessage("continue"));
    await waitFor(() => startQueryTurn.mock.calls.length === 1, "Claude reasoning options");

    expect(startQueryTurn).toHaveBeenCalledWith(expect.objectContaining({
      sessionBinding: { kind: "resume", sessionId: RESERVED_SESSION_ID },
      thinking: { type: "adaptive" },
      effort: "high",
    }));
  });

  it("captures and publishes the exact SDK systemPrompt after a usable query is returned", async () => {
    const captureService = {
      capture: vi.fn((input) => ({
        created: true,
        trace: {
          id: "raw-claude-system", ts: input.suppliedAt, trace_type: "system_instruction" as const,
          content: input.content, source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED" as const,
        },
      })),
    } as SystemInstructionCaptureService;
    const { session, startQueryTurn } = createSession({
      query: createResultQuery(),
      memoryDir: "/tmp/memory/run-1",
      systemInstructionCaptureService: captureService,
    });
    const events: Array<{ method: string; params: Record<string, unknown> }> = [];
    session.subscribeRuntimeEvents((event) => events.push(event as typeof events[number]));

    await session.startTurn(new AgentInputUserMessage("hello"));
    await waitFor(
      () => events.some((event) => event.method === ClaudeSessionEventName.SYSTEM_INSTRUCTIONS_SUPPLIED),
      "Claude system instruction event",
    );

    expect(startQueryTurn).toHaveBeenCalledWith(expect.objectContaining({
      systemPrompt: "## Agent Identity\n\n- Name: Test agent",
    }));
    expect(captureService.capture).toHaveBeenCalledWith(expect.objectContaining({
      memoryDir: "/tmp/memory/run-1",
      content: "## Agent Identity\n\n- Name: Test agent",
    }));
    expect(events).toContainEqual({
      method: ClaudeSessionEventName.SYSTEM_INSTRUCTIONS_SUPPLIED,
      params: {
        trace_id: "raw-claude-system",
        content: "## Agent Identity\n\n- Name: Test agent",
        ts: expect.any(Number),
      },
    });
  });

  it("closes the usable query without iteration when post-handoff persistence fails", async () => {
    const iteratorStarted = vi.fn();
    const query = {
      async *[Symbol.asyncIterator]() {
        iteratorStarted();
        yield { type: "result", session_id: RESERVED_SESSION_ID, result: "done" };
      },
      interrupt: vi.fn(async () => undefined),
      close: vi.fn(() => undefined),
    } as ClaudeSdkQueryLike;
    const captureService = {
      capture: vi.fn(() => { throw new Error("persist failed"); }),
    } as unknown as SystemInstructionCaptureService;
    const { session, startQueryTurn, closeQuery } = createSession({
      query,
      memoryDir: "/tmp/memory/run-1",
      systemInstructionCaptureService: captureService,
    });
    const events: string[] = [];
    session.subscribeRuntimeEvents((event) => events.push(event.method));

    await session.startTurn(new AgentInputUserMessage("hello"));
    await waitFor(() => closeQuery.mock.calls.length === 1, "Claude failed capture cleanup");

    expect(startQueryTurn).toHaveBeenCalledWith(expect.objectContaining({
      systemPrompt: "## Agent Identity\n\n- Name: Test agent",
    }));
    expect(captureService.capture).toHaveBeenCalledWith(expect.objectContaining({
      memoryDir: "/tmp/memory/run-1",
      content: "## Agent Identity\n\n- Name: Test agent",
    }));
    expect(closeQuery).toHaveBeenCalledWith(query);
    expect(iteratorStarted).not.toHaveBeenCalled();
    expect(events).not.toContain(ClaudeSessionEventName.SYSTEM_INSTRUCTIONS_SUPPLIED);
    expect(events).toContain(ClaudeSessionEventName.ERROR);
  });

  it("defensively rejects an impossible explicit start while another turn is active", async () => {
    const { session } = createSession({ activeTurnId: "run-1:turn:active" });

    await expect(session.startTurn(new AgentInputUserMessage("hello"))).rejects.toThrow(
      "Claude start_turn invariant failed because turn 'run-1:turn:active' is active for run 'run-1'.",
    );
  });

  it("does not clear an identified active turn for missing or mismatched completion identity", () => {
    const { session } = createSession({ activeTurnId: "turn-b" });

    session.markTurnCompleted(null);
    session.markTurnCompleted("turn-a");

    expect(session.activeTurnId).toBe("turn-b");
    expect(session.getStatusSnapshotSource().currentStatus).toBe("RUNNING");
  });

  it("caches and sends local context file reference paths in user content", async () => {
    const { session, sessionMessageCache, startQueryTurn } = createSession({
      query: createResultQuery(),
    });

    await session.startTurn(
      new AgentInputUserMessage("inspect this", undefined, [
        new ContextFile("/abs/proof.png", ContextFileType.IMAGE),
      ]),
    );
    await waitFor(() => startQueryTurn.mock.calls.length === 1, "Claude query start");

    const expectedContent = "inspect this\n\nReference files:\n- /abs/proof.png";
    expect(sessionMessageCache.getCachedMessages(RESERVED_SESSION_ID)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        role: "user",
        content: expectedContent,
      }),
    ]));
    expect(startQueryTurn.mock.calls[0]?.[0]).toMatchObject({
      prompt: expectedContent,
      systemPrompt: "## Agent Identity\n\n- Name: Test agent",
    });
  });

  it("caches and sends an already-normalized finalized context-file path", async () => {
    const { session, sessionMessageCache, startQueryTurn } = createSession({
      query: createResultQuery(),
    });

    await session.startTurn(
      new AgentInputUserMessage("inspect this", undefined, [
        new ContextFile(
          "/resolved/proof.png",
          ContextFileType.IMAGE,
        ),
      ]),
    );
    await waitFor(() => startQueryTurn.mock.calls.length === 1, "Claude query start");

    const expectedContent = "inspect this\n\nReference files:\n- /resolved/proof.png";
    expect(sessionMessageCache.getCachedMessages(RESERVED_SESSION_ID)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        role: "user",
        content: expectedContent,
      }),
    ]));
    expect(startQueryTurn.mock.calls[0]?.[0]).toMatchObject({
      prompt: expectedContent,
    });
  });

  it("applies idle status before emitting normal turn completion", async () => {
    const { session } = createSession({
      query: createResultQuery(),
    });
    const events: Array<{
      method: string;
      statusSource: ReturnType<ClaudeSession["getStatusSnapshotSource"]>;
    }> = [];
    session.subscribeRuntimeEvents((event) => {
      const statusSource = session.getStatusSnapshotSource();
      events.push({
        method: event.method,
        statusSource,
      });
    });

    await session.startTurn(new AgentInputUserMessage("complete normally"));
    await waitFor(
      () => events.some((event) => event.method === ClaudeSessionEventName.TURN_COMPLETED),
      "Claude normal turn completion",
    );

    const completionEvent = events.find(
      (event) => event.method === ClaudeSessionEventName.TURN_COMPLETED,
    );
    expect(completionEvent?.statusSource).toEqual({
      currentStatus: "IDLE",
      activeTurnId: null,
      isInterrupting: false,
    });
    expect(projectClaudeAgentLifecycleSnapshot({
      ...completionEvent?.statusSource,
      isActive: true,
    })).toEqual({
      availability: "active",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    });
    expect(session.hasCompletedTurn).toBe(true);
  });

  it("auto-approves workspace and safe outside-scratch write/delete/shell requests under default permission mode", async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-claude-workspace-"));
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-claude-outside-"));
    try {
      const workspaceWrite = path.join(workspaceRoot, "write.txt");
      const workspaceDelete = path.join(workspaceRoot, "delete.txt");
      const workspaceShell = path.join(workspaceRoot, "shell.txt");
      const outsideWrite = path.join(outsideRoot, "write.txt");
      const outsideDelete = path.join(outsideRoot, "delete.txt");
      const outsideShell = path.join(outsideRoot, "shell.txt");
      await fs.writeFile(workspaceDelete, "delete me", "utf8");
      await fs.writeFile(outsideDelete, "delete me", "utf8");

      const requests: PermissionHarnessRequest[] = [
        {
          id: "toolu-workspace-write",
          toolName: "Write",
          input: { file_path: workspaceWrite, content: "workspace write" },
          onAllow: () => fs.writeFile(workspaceWrite, "workspace write", "utf8"),
        },
        {
          id: "toolu-workspace-delete",
          toolName: "Bash",
          input: { command: `rm ${workspaceDelete}` },
          onAllow: () => fs.rm(workspaceDelete, { force: true }),
        },
        {
          id: "toolu-workspace-shell",
          toolName: "Bash",
          input: { command: `printf workspace-shell > ${workspaceShell}` },
          onAllow: () => fs.writeFile(workspaceShell, "workspace shell", "utf8"),
        },
        {
          id: "toolu-outside-write",
          toolName: "Write",
          input: { file_path: outsideWrite, content: "outside write" },
          onAllow: () => fs.writeFile(outsideWrite, "outside write", "utf8"),
        },
        {
          id: "toolu-outside-delete",
          toolName: "Bash",
          input: { command: `rm ${outsideDelete}` },
          onAllow: () => fs.rm(outsideDelete, { force: true }),
        },
        {
          id: "toolu-outside-shell",
          toolName: "Bash",
          input: { command: `printf outside-shell > ${outsideShell}` },
          onAllow: () => fs.writeFile(outsideShell, "outside shell", "utf8"),
        },
      ];
      const { session, startQueryTurn } = createSession({
        autoExecuteTools: true,
        startQueryTurnImplementation: async (startOptions) => {
          expect(startOptions.permissionMode).toBe("default");
          expect(Object.prototype.hasOwnProperty.call(startOptions, "autoExecuteTools")).toBe(false);
          expect(startOptions.canUseTool).toEqual(expect.any(Function));
          return createPermissionHarnessQuery(startOptions.canUseTool!, requests);
        },
      });
      const events: Array<{ method: string; params?: Record<string, unknown> }> = [];
      session.subscribeRuntimeEvents((event) => events.push(event));

      await session.startTurn(new AgentInputUserMessage("exercise permission harness"));
      await waitFor(
        () => events.some((event) => event.method === ClaudeSessionEventName.TURN_COMPLETED),
        "auto permission harness completion",
      );

      expect(startQueryTurn).toHaveBeenCalledTimes(1);
      expect(
        events.some(
          (event) =>
            event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
        ),
      ).toBe(false);
      expect(
        events.filter(
          (event) => event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_APPROVED,
        ),
      ).toHaveLength(requests.length);
      await expect(fs.readFile(workspaceWrite, "utf8")).resolves.toBe("workspace write");
      await expect(pathExists(workspaceDelete)).resolves.toBe(false);
      await expect(fs.readFile(workspaceShell, "utf8")).resolves.toBe("workspace shell");
      await expect(fs.readFile(outsideWrite, "utf8")).resolves.toBe("outside write");
      await expect(pathExists(outsideDelete)).resolves.toBe(false);
      await expect(fs.readFile(outsideShell, "utf8")).resolves.toBe("outside shell");
    } finally {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
      await fs.rm(outsideRoot, { recursive: true, force: true });
    }
  });

  it("keeps manual mode gated for a safe outside-scratch permission request until approval resolves", async () => {
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-claude-manual-outside-"));
    try {
      const outsideTarget = path.join(outsideRoot, "manual-shell.txt");
      let sideEffectCount = 0;
      const requests: PermissionHarnessRequest[] = [
        {
          id: "toolu-manual-outside-shell",
          toolName: "Bash",
          input: { command: `printf manual-shell > ${outsideTarget}` },
          onAllow: async () => {
            sideEffectCount += 1;
            await fs.writeFile(outsideTarget, "manual shell", "utf8");
          },
        },
      ];
      const { session, startQueryTurn } = createSession({
        autoExecuteTools: false,
        startQueryTurnImplementation: async (startOptions) => {
          expect(startOptions.permissionMode).toBe("default");
          expect(Object.prototype.hasOwnProperty.call(startOptions, "autoExecuteTools")).toBe(false);
          expect(startOptions.canUseTool).toEqual(expect.any(Function));
          return createPermissionHarnessQuery(startOptions.canUseTool!, requests);
        },
      });
      const events: Array<{ method: string; params?: Record<string, unknown> }> = [];
      session.subscribeRuntimeEvents((event) => events.push(event));

      await session.startTurn(new AgentInputUserMessage("manual outside scratch request"));
      await waitFor(
        () =>
          events.some(
            (event) =>
              event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
          ),
        "manual approval request",
      );

      expect(startQueryTurn).toHaveBeenCalledTimes(1);
      expect(sideEffectCount).toBe(0);
      await expect(pathExists(outsideTarget)).resolves.toBe(false);
      expect(events.some((event) => event.method === ClaudeSessionEventName.TURN_COMPLETED)).toBe(false);

      await session.approveTool("toolu-manual-outside-shell", false, "Denied by test");
      await waitFor(
        () => events.some((event) => event.method === ClaudeSessionEventName.TURN_COMPLETED),
        "manual denial turn settlement",
      );
      await expect(pathExists(outsideTarget)).resolves.toBe(false);
    } finally {
      await fs.rm(outsideRoot, { recursive: true, force: true });
    }
  });

  it("enriches generic Claude process exits with bounded redacted stderr diagnostics", async () => {
    const { session } = createSession({
      startQueryTurnImplementation: async (startOptions) => {
        startOptions.stderr?.("Authorization: Bearer ");
        startOptions.stderr?.("abc.def_SECRET-token\nANTHROPIC_API");
        startOptions.stderr?.(
          "_KEY=sk-ant-super-secret\n--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons",
        );
        throw new Error("Claude Code process exited with code 1");
      },
    });
    const events: Array<{ method: string; params?: Record<string, unknown> }> = [];
    session.subscribeRuntimeEvents((event) => events.push(event));

    await session.startTurn(new AgentInputUserMessage("start claude"));
    await waitFor(
      () => events.some((event) => event.method === ClaudeSessionEventName.ERROR),
      "diagnostic error event",
    );

    const errorEvent = events.find((event) => event.method === ClaudeSessionEventName.ERROR);
    expect(errorEvent?.params).toMatchObject({
      error_scope: "turn",
      error_effect: "terminal",
      turn_id: expect.any(String),
    });
    expect(String(errorEvent?.params?.message)).toContain("Claude Code process exited with code 1");
    expect(String(errorEvent?.params?.message)).toContain(
      "--dangerously-skip-permissions cannot be used with root/sudo privileges",
    );
    expect(String(errorEvent?.params?.message)).toContain("Bearer [redacted]");
    expect(String(errorEvent?.params?.message)).toContain("ANTHROPIC_API_KEY=[redacted]");
    expect(String(errorEvent?.params?.message)).not.toContain("abc.def_SECRET-token");
    expect(String(errorEvent?.params?.message)).not.toContain("sk-ant-super-secret");
  });

  it("classifies Claude terminal auth result chunks as runtime errors instead of completed turns", async () => {
    const { session, sessionMessageCache } = createSession({
      query: createQueryFromChunks([
        {
          type: "result",
          session_id: RESERVED_SESSION_ID,
          is_error: true,
          error: "authentication_failed",
          result: "Not logged in · Please run /login",
        },
      ]),
    });
    const events: Array<{ method: string; params?: Record<string, unknown> }> = [];
    session.subscribeRuntimeEvents((event) => events.push(event));

    await session.startTurn(new AgentInputUserMessage("hello unauthenticated claude"));
    await waitFor(
      () => events.some((event) => event.method === ClaudeSessionEventName.ERROR),
      "auth result error event",
    );

    expect(events.some((event) => event.method === ClaudeSessionEventName.TURN_COMPLETED)).toBe(false);
    const errorEvent = events.find((event) => event.method === ClaudeSessionEventName.ERROR);
    expect(String(errorEvent?.params?.message)).toContain("Not logged in · Please run /login");
    expect(session.hasCompletedTurn).toBe(false);
    expect(
      sessionMessageCache
        .getCachedMessages(RESERVED_SESSION_ID)
        .some((message) => message["role"] === "assistant"),
    ).toBe(false);
  });

  it("settles an interrupted active turn before emitting TURN_INTERRUPTED", async () => {
    const controlledQuery = createManuallySettledQuery();
    const {
      session,
      sessionMessageCache,
      startQueryTurn,
      closeQuery,
      clearPendingToolApprovals,
      activeQueriesByRunId,
    } = createSession({
      query: controlledQuery.query,
    });

    const events: Array<{
      method: string;
      activeTurnId: string | null;
      queryRegistered: boolean;
      queryCloseCount: number;
    }> = [];
    session.subscribeRuntimeEvents((event) => {
      events.push({
        method: event.method,
        activeTurnId: session.activeTurnId,
        queryRegistered: activeQueriesByRunId.has("run-1"),
        queryCloseCount: closeQuery.mock.calls.length,
      });
    });

    const { turnId } = await session.startTurn(new AgentInputUserMessage("hello"));
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
    const interruptPromise = session.interrupt(turnId as string);
    await waitFor(
      () => startQueryOptions.abortController?.signal.aborted === true,
      "interrupt abort signal",
    );

    expect(startQueryOptions.abortController?.signal.aborted).toBe(true);
    expect(clearPendingToolApprovals).toHaveBeenCalledWith(
      "run-1",
      "Tool approval interrupted.",
    );
    expect(controlledQuery.query.interrupt).not.toHaveBeenCalled();
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
    expect(
      events.find((event) => event.method === ClaudeSessionEventName.TURN_INTERRUPTED),
    ).toMatchObject({ queryRegistered: false, queryCloseCount: 1 });
    expect(session.activeAbortController).toBe(null);
    expect(session.activeTurnId).toBeNull();
    expect(session.hasCompletedTurn).toBe(false);
    expect(activeQueriesByRunId.has("run-1")).toBe(false);
    expect(closeQuery).toHaveBeenCalledTimes(1);
    expect(closeQuery).toHaveBeenCalledWith(controlledQuery.query);
    expect(sessionMessageCache.getCachedMessages(RESERVED_SESSION_ID)).toEqual([
      expect.objectContaining({
        role: "user",
        content: "hello",
      }),
    ]);
  });

  it("keeps manager-owned closure cleanup idempotent without an active turn execution", async () => {
    const { session, clearPendingToolApprovals } = createSession({
      activeTurnId: "run-1:turn:stale",
    });
    const abortController = new AbortController();
    session.setActiveAbortController(abortController);

    const events: string[] = [];
    session.subscribeRuntimeEvents((event) => {
      events.push(event.method);
    });

    await session.settleActiveTurnForClosure("Tool approval interrupted.");

    expect(abortController.signal.aborted).toBe(true);
    expect(clearPendingToolApprovals).toHaveBeenCalledWith(
      "run-1",
      "Tool approval interrupted.",
    );
    expect(events).not.toContain(ClaudeSessionEventName.TURN_INTERRUPTED);
    expect(session.activeAbortController).toBe(null);
    expect(session.activeTurnId).toBeNull();
  });

  it("rejects a foreign interrupt turn without mutating the active query", async () => {
    const controlledQuery = createManuallySettledQuery();
    const { session, startQueryTurn } = createSession({ queries: [controlledQuery.query] });
    const { turnId } = await session.startTurn(new AgentInputUserMessage("hello"));
    await waitFor(() => startQueryTurn.mock.calls.length === 1, "active query start");
    const abortController = (startQueryTurn.mock.calls[0]?.[0] as {
      abortController?: AbortController;
    }).abortController;

    await expect(session.interrupt("turn-foreign")).rejects.toThrow(
      `Claude active turn is '${turnId}', not 'turn-foreign'.`,
    );
    expect(abortController?.signal.aborted).toBe(false);
    expect(session.activeTurnId).toBe(turnId);

    controlledQuery.release();
    await waitFor(() => session.activeTurnId === null, "active query completion");
  });

  it("delegates terminate to the session manager dependency", async () => {
    const { session, terminateRunSession } = createSession();

    await session.terminate();

    expect(terminateRunSession).toHaveBeenCalledTimes(1);
  });

  it("exposes the caller-reserved provider UUID before the first query", () => {
    const { session } = createSession();

    expect(session.sessionId).toBe(RESERVED_SESSION_ID);
    expect(session.runContext.runtimeContext.sessionId).toBeNull();
  });

  it("resumes an interrupted incomplete turn using its immutable reserved provider UUID", async () => {
    const firstQuery = createProviderSessionThenPendingQuery(RESERVED_SESSION_ID);
    const { session, startQueryTurn, closeQuery } = createSession({
      queries: [firstQuery.query, createResultQuery()],
    });

    const { turnId } = await session.startTurn(new AgentInputUserMessage("start long work"));
    await waitFor(() => startQueryTurn.mock.calls.length === 1, "provider session query");

    const firstOptions = startQueryTurn.mock.calls[0]?.[0] as ClaudeSdkStartQueryTurnOptions;
    expect(firstOptions.sessionBinding).toEqual({ kind: "create", sessionId: RESERVED_SESSION_ID });
    expect(session.hasCompletedTurn).toBe(false);

    const interruptPromise = session.interrupt(turnId as string);
    await waitFor(
      () => (startQueryTurn.mock.calls[0]?.[0] as { abortController?: AbortController }).abortController?.signal.aborted === true,
      "interrupt abort signal",
    );
    firstQuery.release();
    await interruptPromise;

    expect(session.hasCompletedTurn).toBe(false);
    expect(closeQuery).toHaveBeenCalledTimes(1);

    await session.startTurn(new AgentInputUserMessage("continue with that context"));
    await waitFor(() => startQueryTurn.mock.calls.length === 2, "follow-up query start");

    const secondOptions = startQueryTurn.mock.calls[1]?.[0] as ClaudeSdkStartQueryTurnOptions;
    expect(secondOptions.sessionBinding).toEqual({ kind: "resume", sessionId: RESERVED_SESSION_ID });
    await waitFor(() => session.hasCompletedTurn, "follow-up turn completion");
  });

  it("switches an opened but unconfirmed first query to exact resume after interrupt", async () => {
    const firstQuery = createManuallySettledQuery();
    const { session, startQueryTurn, closeQuery } = createSession({
      queries: [firstQuery.query, createResultQuery()],
    });

    const { turnId } = await session.startTurn(new AgentInputUserMessage("start before provider id"));
    await waitFor(() => startQueryTurn.mock.calls.length === 1, "initial query start");

    const interruptPromise = session.interrupt(turnId as string);
    await waitFor(
      () => (startQueryTurn.mock.calls[0]?.[0] as { abortController?: AbortController }).abortController?.signal.aborted === true,
      "placeholder interrupt abort signal",
    );
    expect(closeQuery).not.toHaveBeenCalled();
    firstQuery.release();
    await interruptPromise;

    expect(session.sessionId).toBe(RESERVED_SESSION_ID);
    expect(session.hasCompletedTurn).toBe(false);

    await session.startTurn(new AgentInputUserMessage("follow up without provider id"));
    await waitFor(() => startQueryTurn.mock.calls.length === 2, "placeholder follow-up query start");

    const secondOptions = startQueryTurn.mock.calls[1]?.[0] as ClaudeSdkStartQueryTurnOptions;
    expect(secondOptions.sessionBinding).toEqual({ kind: "resume", sessionId: RESERVED_SESSION_ID });
    await waitFor(() => session.hasCompletedTurn, "placeholder follow-up completion");
  });

  it("uses SDK sessionId for the first turn and resume for every completed follow-up", async () => {
    const { session, startQueryTurn } = createSession({
      queries: [createResultQuery(), createResultQuery()],
    });

    await session.startTurn(new AgentInputUserMessage("first turn"));
    await waitFor(() => session.hasCompletedTurn, "first turn completion");

    const firstOptions = startQueryTurn.mock.calls[0]?.[0] as ClaudeSdkStartQueryTurnOptions;
    expect(firstOptions.sessionBinding).toEqual({ kind: "create", sessionId: RESERVED_SESSION_ID });

    await session.startTurn(new AgentInputUserMessage("second turn"));
    await waitFor(() => startQueryTurn.mock.calls.length === 2, "completed follow-up query start");

    const secondOptions = startQueryTurn.mock.calls[1]?.[0] as ClaudeSdkStartQueryTurnOptions;
    expect(secondOptions.sessionBinding).toEqual({ kind: "resume", sessionId: RESERVED_SESSION_ID });
  });

  it("continues to resume restored Claude runs with the restored provider session id", async () => {
    const { session, startQueryTurn } = createSession({
      sessionId: RESTORED_SESSION_ID,
      hasCompletedTurn: true,
      queries: [createResultQuery(RESTORED_SESSION_ID)],
    });

    await session.startTurn(new AgentInputUserMessage("restored follow up"));
    await waitFor(() => startQueryTurn.mock.calls.length === 1, "restored query start");

    const options = startQueryTurn.mock.calls[0]?.[0] as ClaudeSdkStartQueryTurnOptions;
    expect(options.sessionBinding).toEqual({ kind: "resume", sessionId: RESTORED_SESSION_ID });
  });

  it("fails a turn when Claude reports a conflicting provider UUID", async () => {
    const { session } = createSession({ query: createResultQuery(CONFLICTING_SESSION_ID) });
    const errors: unknown[] = [];
    session.subscribeRuntimeEvents((event) => {
      if (event.method === ClaudeSessionEventName.ERROR) errors.push(event.params);
    });

    await session.startTurn(new AgentInputUserMessage("conflicting identity"));
    await waitFor(() => errors.length === 1, "conflicting identity error");

    expect(JSON.stringify(errors[0])).toContain("CLAUDE_PROVIDER_SESSION_ID_CONFLICT");
    expect(session.hasCompletedTurn).toBe(false);
  });

  it("fails a successful-looking turn that never confirms the provider UUID", async () => {
    const query = createQueryFromChunks([{ type: "result", result: "done" }]);
    const { session } = createSession({ query });
    const errors: unknown[] = [];
    session.subscribeRuntimeEvents((event) => {
      if (event.method === ClaudeSessionEventName.ERROR) errors.push(event.params);
    });

    await session.startTurn(new AgentInputUserMessage("missing identity"));
    await waitFor(() => errors.length === 1, "unconfirmed identity error");

    expect(JSON.stringify(errors[0])).toContain("CLAUDE_PROVIDER_SESSION_ID_UNCONFIRMED");
    expect(session.hasCompletedTurn).toBe(false);
  });

  it("emits provider-derived text segment ids and preserves text-tool-text order", async () => {
    const chunks = [
      {
        type: "assistant",
        session_id: RESERVED_SESSION_ID,
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
        session_id: RESERVED_SESSION_ID,
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
        session_id: RESERVED_SESSION_ID,
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
        session_id: RESERVED_SESSION_ID,
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

    const { turnId } = await session.startTurn(new AgentInputUserMessage("where am I?"));
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

    expect(sessionMessageCache.getCachedMessages(RESERVED_SESSION_ID)).toEqual([
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
        session_id: RESERVED_SESSION_ID,
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
        session_id: RESERVED_SESSION_ID,
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
        session_id: RESERVED_SESSION_ID,
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
        session_id: RESERVED_SESSION_ID,
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
        session_id: RESERVED_SESSION_ID,
        uuid: "partial-wrapper-block-stop",
        event: {
          type: "content_block_stop",
          index: 0,
        },
      },
      {
        type: "stream_event",
        session_id: RESERVED_SESSION_ID,
        uuid: "partial-wrapper-message-stop",
        event: {
          type: "message_stop",
        },
      },
      {
        type: "result",
        session_id: RESERVED_SESSION_ID,
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

    const { turnId } = await session.startTurn(new AgentInputUserMessage("stream please"));
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
