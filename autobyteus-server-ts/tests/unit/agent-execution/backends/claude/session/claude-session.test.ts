import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
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
import { CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID } from "../../../../../../src/agent-execution/domain/system-task-notification-senders.js";
import type { ClaudeSdkStreamingSessionOptions } from "../../../../../../src/runtime-management/claude/client/claude-sdk-client.js";
import type { SystemInstructionCaptureService } from "../../../../../../src/agent-memory/services/system-instruction-capture-service.js";
import {
  createFakeClaudeSdkClient,
  flushClaudeSession,
  type FakeClaudeStreamingSession,
} from "../../../../../helpers/fake-claude-streaming-sdk.js";

const RESERVED_SESSION_ID = "11111111-1111-4111-8111-111111111111";
const RESTORED_SESSION_ID = "22222222-2222-4222-8222-222222222222";
const CONFLICTING_SESSION_ID = "33333333-3333-4333-8333-333333333333";

type RecordedEvent = { method: string; params?: Record<string, unknown> };

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const createSession = (input: {
  sessionId?: string | null;
  autoExecuteTools?: boolean;
  llmConfig?: Record<string, unknown> | null;
  memoryDir?: string | null;
  systemInstructionCaptureService?: SystemInstructionCaptureService;
  openStreamingSession?: (
    options: ClaudeSdkStreamingSessionOptions,
    open: (options: ClaudeSdkStreamingSessionOptions) => Promise<FakeClaudeStreamingSession>,
  ) => Promise<FakeClaudeStreamingSession>;
} = {}) => {
  const providerSessionId = input.sessionId ?? RESERVED_SESSION_ID;
  const sdkClient = createFakeClaudeSdkClient({ providerSessionId });
  const defaultOpen = sdkClient.openStreamingSession.getMockImplementation()!;
  if (input.openStreamingSession) {
    const custom = input.openStreamingSession;
    sdkClient.openStreamingSession.mockImplementation((options: ClaudeSdkStreamingSessionOptions) =>
      custom(options, defaultOpen as never));
  }
  const sessionMessageCache = new ClaudeSessionMessageCache();
  const terminateRunSession = vi.fn(async () => undefined);
  let sessionRef: ClaudeSession | null = null;
  const toolingCoordinator = new ClaudeSessionToolUseCoordinator(
    new Map(),
    new Map(),
    (_runContext, event) => sessionRef?.emitRuntimeEvent(event),
  );
  const clearPendingToolApprovals = vi.spyOn(toolingCoordinator, "clearPendingToolApprovals");

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
    }),
  });

  const session = new ClaudeSession({
    runContext,
    providerSessionLifecycle: input.sessionId
      ? ClaudeProviderSessionLifecycle.restore(input.sessionId, runContext.runId)
      : ClaudeProviderSessionLifecycle.reserveNew(() => RESERVED_SESSION_ID),
    dependencies: {
      sessionMessageCache,
      sdkClient: sdkClient as never,
      toolingCoordinator,
      agentToolMcpRunSessions: {
        activateForRun: vi.fn(() => {
          throw new Error("Non-MCP ClaudeSession coverage must not issue Agent Tools.");
        }),
      } as never,
      systemInstructionCaptureService: input.systemInstructionCaptureService,
      isRunSessionActive: () => true,
      terminateRunSession,
    },
  });
  sessionRef = session;
  const events: RecordedEvent[] = [];
  session.subscribeRuntimeEvents((event) => events.push(event));
  const methods = () => events.map((event) => event.method);
  const start = async (text: string | AgentInputUserMessage) => {
    const result = await session.submitInput(
      typeof text === "string" ? new AgentInputUserMessage(text) : text,
      { kind: "start_turn" },
    );
    await flushClaudeSession();
    return result;
  };
  return {
    session,
    sdkClient,
    sessionMessageCache,
    terminateRunSession,
    clearPendingToolApprovals,
    events,
    methods,
    start,
  };
};

/** Replays recorded frames as one CLI turn that answers `uuid`. */
const emitCliTurn = (fake: FakeClaudeStreamingSession, frames: unknown[], uuid: string) => {
  fake.init();
  fake.emit(...frames.map((frame) => {
    const payload = frame as Record<string, unknown>;
    return payload.type === "result"
      ? { subtype: "success", user_message_uuids: [uuid], ...payload }
      : frame;
  }));
};

const acceptedTurnId = (result: Awaited<ReturnType<ClaudeSession["submitInput"]>>): string => {
  if (!result.accepted) throw new Error(`input rejected: ${result.code}`);
  return result.turnId;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ClaudeSession streaming lifecycle", () => {
  it("opens one streaming process lazily with the reserved create binding and reuses it for later turns", async () => {
    const { session, sdkClient, start, events } = createSession({
      llmConfig: { thinking_enabled: true, reasoning_effort: "high" },
    });
    expect(sdkClient.openStreamingSession).not.toHaveBeenCalled();
    expect(session.sessionId).toBe(RESERVED_SESSION_ID);

    for (const text of ["one", "two", "three"]) {
      await start(text);
      sdkClient.current.completeTurn(`reply ${text}`, [sdkClient.current.sent.at(-1)!.uuid]);
      await flushClaudeSession();
    }

    expect(sdkClient.openStreamingSession).toHaveBeenCalledTimes(1);
    expect(sdkClient.openStreamingSession).toHaveBeenCalledWith(expect.objectContaining({
      sessionBinding: { kind: "create", sessionId: RESERVED_SESSION_ID },
      systemPrompt: "## Agent Identity\n\n- Name: Test agent",
      model: "haiku",
      permissionMode: "default",
      thinking: { type: "adaptive" },
      effort: "high",
      canUseTool: expect.any(Function),
    }));
    expect(sdkClient.openStreamingSession.mock.calls[0]?.[0]).not.toHaveProperty("prompt");
    expect(sdkClient.current.sent.map((message) => message.message.content)).toEqual([
      [{ type: "text", text: "one" }],
      [{ type: "text", text: "two" }],
      [{ type: "text", text: "three" }],
    ]);
    expect(events.filter((event) => event.method === ClaudeSessionEventName.TURN_COMPLETED)).toHaveLength(3);
    expect(sdkClient.current.isEnded).toBe(false);
    expect(session.processState).toBe("OPEN");
  });

  it("resumes a restored run on its first open and allocates UUID-based canonical turn ids", async () => {
    const { sdkClient, start } = createSession({ sessionId: RESTORED_SESSION_ID });

    const result = await start("continue");

    expect(sdkClient.openStreamingSession).toHaveBeenCalledWith(expect.objectContaining({
      sessionBinding: { kind: "resume", sessionId: RESTORED_SESSION_ID },
    }));
    expect(acceptedTurnId(result)).toMatch(/^run-1:turn:[0-9a-f-]{36}$/);
  });

  it("captures and publishes the exact SDK systemPrompt once per process open", async () => {
    const captureService = {
      capture: vi.fn((input) => ({
        created: true,
        trace: {
          id: "raw-claude-system", ts: input.suppliedAt, trace_type: "system_instruction" as const,
          content: input.content, source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED" as const,
        },
      })),
    } as SystemInstructionCaptureService;
    const { sdkClient, start, events } = createSession({
      memoryDir: "/tmp/memory/run-1",
      systemInstructionCaptureService: captureService,
    });

    await start("hello");
    sdkClient.current.completeTurn("hi");
    await flushClaudeSession();
    await start("again");

    expect(captureService.capture).toHaveBeenCalledTimes(1);
    expect(captureService.capture).toHaveBeenCalledWith(expect.objectContaining({
      memoryDir: "/tmp/memory/run-1",
      content: "## Agent Identity\n\n- Name: Test agent",
    }));
    expect(events).toContainEqual({
      method: ClaudeSessionEventName.SYSTEM_INSTRUCTIONS_SUPPLIED,
      params: { trace_id: "raw-claude-system", content: "## Agent Identity\n\n- Name: Test agent", ts: expect.any(Number) },
    });
  });

  it("closes the opened process and fails the turn when system-instruction persistence fails", async () => {
    const captureService = {
      capture: vi.fn(() => { throw new Error("persist failed"); }),
    } as unknown as SystemInstructionCaptureService;
    const { session, sdkClient, start, events, methods } = createSession({
      memoryDir: "/tmp/memory/run-1",
      systemInstructionCaptureService: captureService,
    });

    const result = await start("hello");

    expect(result.accepted).toBe(true);
    expect(sdkClient.current.close).toHaveBeenCalledTimes(1);
    expect(sdkClient.current.sent).toEqual([]);
    expect(methods()).not.toContain(ClaudeSessionEventName.SYSTEM_INSTRUCTIONS_SUPPLIED);
    const error = events.find((event) => event.method === ClaudeSessionEventName.ERROR);
    expect(error?.params).toMatchObject({ turn_id: acceptedTurnId(result), error_scope: "turn", error_effect: "terminal" });
    expect(String(error?.params?.message)).toContain("persist failed");
    expect(session.processState).toBe("NOT_OPEN");
  });

  it("rejects empty input before opening a canonical turn", async () => {
    const { session, sdkClient, methods } = createSession();

    const result = await session.submitInput(new AgentInputUserMessage("   "), { kind: "start_turn" });

    expect(result).toEqual({ accepted: false, code: "CLAUDE_INPUT_EMPTY", message: "Claude runtime message content is required." });
    expect(methods()).toEqual([]);
    expect(sdkClient.openStreamingSession).not.toHaveBeenCalled();
  });

  it("applies idle status before emitting normal turn completion and caches both sides", async () => {
    const { session, sdkClient, sessionMessageCache } = createSession();
    const statusAtCompletion: Array<ReturnType<ClaudeSession["getStatusSnapshotSource"]>> = [];
    session.subscribeRuntimeEvents((event) => {
      if (event.method === ClaudeSessionEventName.TURN_COMPLETED) {
        statusAtCompletion.push(session.getStatusSnapshotSource());
      }
    });

    await session.submitInput(new AgentInputUserMessage("complete normally"), { kind: "start_turn" });
    await flushClaudeSession();
    expect(session.getStatusSnapshotSource().currentStatus).toBe("RUNNING");
    sdkClient.current.completeTurn("done");
    await flushClaudeSession();

    expect(statusAtCompletion).toEqual([{ currentStatus: "IDLE", activeTurnId: null, isInterrupting: false }]);
    expect(projectClaudeAgentLifecycleSnapshot({ ...statusAtCompletion[0], isActive: true })).toEqual({
      availability: "active",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    });
    expect(session.hasCompletedTurn).toBe(true);
    expect(sessionMessageCache.getCachedMessages(RESERVED_SESSION_ID)).toEqual([
      expect.objectContaining({ role: "user", content: "complete normally" }),
      expect.objectContaining({ role: "assistant", content: "done" }),
    ]);
  });

  it("classifies terminal auth result frames as turn errors instead of completed turns", async () => {
    const { session, sdkClient, sessionMessageCache, start, events, methods } = createSession();

    await start("hello unauthenticated claude");
    sdkClient.current.init();
    sdkClient.current.emit({
      type: "result",
      session_id: RESERVED_SESSION_ID,
      is_error: true,
      error: "authentication_failed",
      result: "Not logged in · Please run /login",
      user_message_uuids: [sdkClient.current.sent[0]!.uuid],
    });
    await flushClaudeSession();

    expect(methods()).not.toContain(ClaudeSessionEventName.TURN_COMPLETED);
    expect(methods()).not.toContain(ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA);
    const errorEvent = events.find((event) => event.method === ClaudeSessionEventName.ERROR);
    expect(String(errorEvent?.params?.message)).toContain("CLAUDE_RUNTIME_AUTHENTICATION_FAILED: Not logged in · Please run /login");
    expect(session.hasCompletedTurn).toBe(false);
    expect(session.getStatusSnapshotSource().currentStatus).toBe("ERROR");
    expect(sessionMessageCache.getCachedMessages(RESERVED_SESSION_ID).some((message) => message.role === "assistant")).toBe(false);
    expect(session.processState).toBe("OPEN");
  });

  it("enriches a failed process open with bounded redacted stderr diagnostics", async () => {
    const { start, events } = createSession({
      openStreamingSession: async (options) => {
        options.stderr?.("Authorization: Bearer ");
        options.stderr?.("abc.def_SECRET-token\nANTHROPIC_API");
        options.stderr?.(
          "_KEY=sk-ant-super-secret\n--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons",
        );
        throw new Error("Claude Code process exited with code 1");
      },
    });

    await start("start claude");

    const errorEvent = events.find((event) => event.method === ClaudeSessionEventName.ERROR);
    expect(errorEvent?.params).toMatchObject({ error_scope: "turn", error_effect: "terminal", turn_id: expect.any(String) });
    const message = String(errorEvent?.params?.message);
    expect(message).toContain("Claude Code process exited with code 1");
    expect(message).toContain("--dangerously-skip-permissions cannot be used with root/sudo privileges");
    expect(message).toContain("Bearer [redacted]");
    expect(message).toContain("ANTHROPIC_API_KEY=[redacted]");
    expect(message).not.toContain("abc.def_SECRET-token");
    expect(message).not.toContain("sk-ant-super-secret");
  });
});

describe("ClaudeSession input delivery", () => {
  it("delivers appended input into the running turn and settles once every uuid is answered (AC-003)", async () => {
    const { session, sdkClient, start, methods } = createSession();
    const turnId = acceptedTurnId(await start("run a 20s command"));
    const fake = sdkClient.current;
    fake.init();
    fake.assistantText("running");
    await flushClaudeSession();

    const appended = await session.submitInput(new AgentInputUserMessage("also say BANANA"), {
      kind: "append_to_active_turn",
      turnId,
    });
    await flushClaudeSession();

    expect(appended).toEqual({ accepted: true, turnId });
    expect(fake.sent).toHaveLength(2);
    fake.result([fake.sent[0]!.uuid, fake.sent[1]!.uuid]);
    await flushClaudeSession();
    expect(methods().filter((method) => method === ClaudeSessionEventName.TURN_STARTED)).toHaveLength(1);
    expect(methods().filter((method) => method === ClaudeSessionEventName.TURN_COMPLETED)).toHaveLength(1);
  });

  it("keeps one canonical turn open across consecutive CLI turns until every written uuid is answered (probe M)", async () => {
    const { session, sdkClient, start, methods } = createSession();
    const turnId = acceptedTurnId(await start("ONE"));
    await session.submitInput(new AgentInputUserMessage("TWO"), { kind: "append_to_active_turn", turnId });
    await flushClaudeSession();
    const fake = sdkClient.current;

    fake.completeTurn("1", [fake.sent[0]!.uuid]);
    await flushClaudeSession();
    expect(methods()).not.toContain(ClaudeSessionEventName.TURN_COMPLETED);
    expect(session.activeTurnId).toBe(turnId);

    fake.completeTurn("2", [fake.sent[1]!.uuid]);
    await flushClaudeSession();
    expect(methods().filter((method) => method === ClaudeSessionEventName.TURN_COMPLETED)).toHaveLength(1);
    expect(session.activeTurnId).toBeNull();
  });

  it("rejects an append for a turn that is not active without opening a turn", async () => {
    const { session, methods } = createSession();

    const result = await session.submitInput(new AgentInputUserMessage("late"), {
      kind: "append_to_active_turn",
      turnId: "run-1:turn:gone",
    });

    expect(result).toMatchObject({ accepted: false, code: "CLAUDE_APPEND_TURN_MISMATCH" });
    expect(methods()).toEqual([]);
  });

  it("joins a start_turn that raced a provider-initiated turn instead of opening a second turn", async () => {
    const { session, sdkClient, start, events } = createSession();
    await start("warm up");
    const fake = sdkClient.current;
    fake.completeTurn("ready");
    fake.init();
    await flushClaudeSession();
    const providerTurnId = session.activeTurnId;

    const joined = await start("status?");

    expect(providerTurnId).toBeTruthy();
    expect(joined).toEqual({ accepted: true, turnId: providerTurnId });
    expect(events.filter((event) => event.method === ClaudeSessionEventName.TURN_STARTED)).toHaveLength(2);
    fake.assistantText("noted");
    fake.result([]);
    await flushClaudeSession();
    expect(session.activeTurnId).toBe(providerTurnId);
    fake.completeTurn("status", [fake.sent[1]!.uuid]);
    await flushClaudeSession();
    expect(session.activeTurnId).toBeNull();
  });

  it("sends image context files inline and keeps non-image files as path references (AC-012)", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "claude-inline-image-"));
    try {
      const imagePath = path.join(directory, "screenshot.png");
      await fs.writeFile(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      const { sdkClient, sessionMessageCache, start } = createSession();

      await start(new AgentInputUserMessage("what is in this?", undefined, [
        new ContextFile(imagePath, ContextFileType.IMAGE),
        new ContextFile("/abs/notes.md", ContextFileType.MARKDOWN),
      ]));

      expect(sdkClient.current.sent[0]!.message.content).toEqual([
        { type: "text", text: "what is in this?\n\nReference files:\n- /abs/notes.md" },
        { type: "image", source: { type: "base64", media_type: "image/png", data: "iVBORw==" } },
      ]);
      expect(sessionMessageCache.getCachedMessages(RESERVED_SESSION_ID)).toEqual([
        expect.objectContaining({ role: "user", content: "what is in this?\n\nReference files:\n- /abs/notes.md" }),
      ]);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it("still delivers the message with a visible note when an attached image is unreadable (AC-013)", async () => {
    const { sdkClient, start, methods } = createSession();

    await start(new AgentInputUserMessage("look", undefined, [
      new ContextFile("/definitely/missing/shot.png", ContextFileType.IMAGE),
    ]));

    expect(sdkClient.current.sent[0]!.message.content).toEqual([
      { type: "text", text: "look" },
      { type: "text", text: "[Attached image could not be attached: /definitely/missing/shot.png (file not found).]" },
    ]);
    expect(methods()).not.toContain(ClaudeSessionEventName.ERROR);
  });
});

describe("ClaudeSession interrupt", () => {
  it("cancels still-queued input with cancelQueued and keeps the same process for the next message (probe P cq, AC-005)", async () => {
    const { session, sdkClient, start, clearPendingToolApprovals, methods } = createSession();
    const turnId = acceptedTurnId(await start("long foreground command"));
    const fake = sdkClient.current;
    fake.init();
    fake.emit({ type: "assistant", session_id: RESERVED_SESSION_ID, message: { id: "m1", role: "assistant", content: [{ type: "tool_use", id: "toolu-1", name: "Bash", input: { command: "sleep 25" } }] } });
    await session.submitInput(new AgentInputUserMessage("B-SHOULD-NOT-RUN"), { kind: "append_to_active_turn", turnId });
    await flushClaudeSession();
    const [a, b] = fake.sent.map((message) => message.uuid);
    fake.interruptOutcomes.push((current) => {
      queueMicrotask(() => {
        current.emit(
          { type: "user", session_id: RESERVED_SESSION_ID, message: { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu-1", content: "The user doesn't want to proceed with this tool use." }] } },
          { type: "result", subtype: "error_during_execution", session_id: RESERVED_SESSION_ID, user_message_uuids: [a], terminal_reason: "aborted_tools", is_error: true },
        );
      });
      return { stillQueued: [], cancelled: [b!] };
    });

    await session.interrupt(turnId);

    expect(fake.interruptAndCancelQueued).toHaveBeenCalledTimes(1);
    expect(clearPendingToolApprovals).toHaveBeenCalledWith("run-1", "Tool approval interrupted.");
    expect(methods()).toContain(ClaudeSessionEventName.TURN_INTERRUPTED);
    expect(methods()).not.toContain(ClaudeSessionEventName.ERROR);
    expect(session.activeTurnId).toBeNull();

    await start("AFTER");
    fake.completeTurn("AFTER.", [fake.sent[2]!.uuid]);
    await flushClaudeSession();
    expect(sdkClient.openStreamingSession).toHaveBeenCalledTimes(1);
    expect(fake.close).not.toHaveBeenCalled();
    expect(methods().filter((method) => method === ClaudeSessionEventName.TURN_COMPLETED)).toHaveLength(1);
  });

  it("settles TURN_COMPLETED when the Stop arrived before the CLI read the input (probe P-prewait)", async () => {
    const { session, sdkClient, start, methods } = createSession();
    const turnId = acceptedTurnId(await start("Reply only A."));
    const fake = sdkClient.current;
    fake.interruptOutcomes.push((current) => {
      queueMicrotask(() => current.completeTurn("A.", [current.sent[0]!.uuid]));
      return { stillQueued: [], cancelled: [] };
    });

    await session.interrupt(turnId);

    expect(fake.interruptAndCancelQueued).toHaveBeenCalledTimes(1);
    expect(methods()).toContain(ClaudeSessionEventName.TURN_COMPLETED);
    expect(methods()).not.toContain(ClaudeSessionEventName.TURN_INTERRUPTED);
  });

  it("interrupts a provider-initiated turn through the SDK even though none of its input is ours (IC-1)", async () => {
    const { session, sdkClient, start, events } = createSession();
    await start("warm up");
    const fake = sdkClient.current;
    fake.completeTurn("ready");
    fake.init();
    await flushClaudeSession();
    const providerTurnId = session.activeTurnId!;
    fake.interruptOutcomes.push((current) => {
      queueMicrotask(() => current.emit({
        type: "result", subtype: "error_during_execution", session_id: RESERVED_SESSION_ID,
        user_message_uuids: [], terminal_reason: "aborted_streaming", is_error: true,
      }));
      return { stillQueued: [], cancelled: [] };
    });

    await session.interrupt(providerTurnId);

    expect(fake.interruptAndCancelQueued).toHaveBeenCalledTimes(1);
    expect(events).toContainEqual({
      method: ClaudeSessionEventName.TURN_INTERRUPTED,
      params: { turnId: providerTurnId, sessionId: RESERVED_SESSION_ID },
    });
  });

  it("interrupts through the SDK when a start_turn raced into a provider turn and its input is still unsent (IC-1)", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "claude-race-image-"));
    try {
      const imagePath = path.join(directory, "slow.png");
      await fs.writeFile(imagePath, "png");
      const { session, sdkClient, start, methods } = createSession();
      await start("warm up");
      const fake = sdkClient.current;
      fake.completeTurn("ready");
      fake.init();
      await flushClaudeSession();
      const providerTurnId = session.activeTurnId!;
      let releaseRead!: () => void;
      const readGate = new Promise<void>((resolve) => { releaseRead = resolve; });
      const originalStat = fs.stat;
      vi.spyOn(fs, "stat").mockImplementation(async (...args: Parameters<typeof fs.stat>) => {
        await readGate;
        return originalStat(...args);
      });
      const raced = session.submitInput(new AgentInputUserMessage("with image", undefined, [
        new ContextFile(imagePath, ContextFileType.IMAGE),
      ]), { kind: "start_turn" });
      await flushClaudeSession();
      fake.interruptOutcomes.push((current) => {
        queueMicrotask(() => current.emit({
          type: "result", subtype: "error_during_execution", session_id: RESERVED_SESSION_ID,
          user_message_uuids: [], terminal_reason: "aborted_streaming", is_error: true,
        }));
        return { stillQueued: [], cancelled: [] };
      });

      await session.interrupt(providerTurnId);
      releaseRead();
      expect(await raced).toEqual({ accepted: true, turnId: providerTurnId });
      await flushClaudeSession();

      expect(fake.interruptAndCancelQueued).toHaveBeenCalledTimes(1);
      expect(fake.sent).toHaveLength(1);
      expect(methods()).toContain(ClaudeSessionEventName.TURN_INTERRUPTED);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it("cancels input still waiting for the first process open locally, without an SDK call (ARCH-F-008)", async () => {
    let releaseOpen!: () => void;
    const openGate = new Promise<void>((resolve) => { releaseOpen = resolve; });
    const { session, sdkClient, events } = createSession({
      openStreamingSession: async (options, open) => {
        await openGate;
        return open(options);
      },
    });
    const submitted = session.submitInput(new AgentInputUserMessage("hello"), { kind: "start_turn" });
    await flushClaudeSession();
    const turnId = session.activeTurnId!;

    await session.interrupt(turnId);
    expect(events.map((event) => event.method)).toEqual([
      ClaudeSessionEventName.TURN_STARTED,
      ClaudeSessionEventName.STATUS_CHANGED,
      ClaudeSessionEventName.TURN_INTERRUPTED,
    ]);
    releaseOpen();
    expect(await submitted).toEqual({ accepted: true, turnId });
    await flushClaudeSession();

    expect(sdkClient.current.sent).toEqual([]);
    expect(sdkClient.current.interruptAndCancelQueued).not.toHaveBeenCalled();
    expect(session.processState).toBe("OPEN");
  });

  it("rejects a foreign interrupt turn without touching the active turn", async () => {
    const { session, sdkClient, start } = createSession();
    const turnId = acceptedTurnId(await start("working"));

    await expect(session.interrupt("run-1:turn:other")).rejects.toThrow(
      `Claude active turn is '${turnId}', not 'run-1:turn:other'.`,
    );
    await expect(createSession().session.interrupt("run-1:turn:none")).rejects.toThrow(
      "Claude run 'run-1' has no active turn 'run-1:turn:none' to interrupt.",
    );
    expect(session.activeTurnId).toBe(turnId);
    expect(sdkClient.current.interruptAndCancelQueued).not.toHaveBeenCalled();
  });
});

describe("ClaudeSession background tasks and provider-initiated turns", () => {
  it("announces a background completion with SYSTEM_TASK_NOTIFICATION before the CLI-started turn (AC-002)", async () => {
    const { sdkClient, start, events } = createSession();
    await start("build in the background");
    const fake = sdkClient.current;
    fake.init();
    fake.emit(
      { type: "system", subtype: "background_tasks_changed", session_id: RESERVED_SESSION_ID, tasks: [{ task_id: "bg-1", task_type: "local_bash", description: "Build macOS Electron app" }] },
      { type: "system", subtype: "task_started", session_id: RESERVED_SESSION_ID, task_id: "bg-1", description: "Build macOS Electron app", task_type: "local_bash" },
    );
    fake.assistantText("started the build");
    fake.result([fake.sent[0]!.uuid]);
    await flushClaudeSession();

    fake.emit(
      { type: "system", subtype: "background_tasks_changed", session_id: RESERVED_SESSION_ID, tasks: [] },
      { type: "system", subtype: "task_notification", session_id: RESERVED_SESSION_ID, task_id: "bg-1", status: "completed", output_file: "/tmp/bg-1.out", summary: "done" },
    );
    fake.init();
    fake.assistantText("Build finished");
    fake.result([], { origin: { kind: "task-notification" } });
    await flushClaudeSession();

    const lifecycle = events
      .filter((event) => [
        ClaudeSessionEventName.TURN_STARTED,
        ClaudeSessionEventName.SYSTEM_TASK_NOTIFICATION,
        ClaudeSessionEventName.TURN_COMPLETED,
      ].includes(event.method as ClaudeSessionEventName))
      .map((event) => [event.method, event.params?.origin ?? event.params?.content ?? null]);
    expect(lifecycle).toEqual([
      [ClaudeSessionEventName.TURN_STARTED, "input"],
      [ClaudeSessionEventName.TURN_COMPLETED, null],
      [ClaudeSessionEventName.TURN_STARTED, "provider"],
      [ClaudeSessionEventName.SYSTEM_TASK_NOTIFICATION, "Background task completed: Build macOS Electron app (completed)"],
      [ClaudeSessionEventName.TURN_COMPLETED, null],
    ]);
    const notice = events.find((event) => event.method === ClaudeSessionEventName.SYSTEM_TASK_NOTIFICATION);
    expect(notice?.params?.sender_id).toBe(CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID);
    expect(events.filter((event) => event.method === ClaudeSessionEventName.TOKEN_USAGE_UPDATED)).toHaveLength(2);
  });

  it("carries a completion the Stop dequeued into the next input as a system note (J+O shape)", async () => {
    const { session, sdkClient, start, events } = createSession();
    const turnId = acceptedTurnId(await start("background then foreground"));
    const fake = sdkClient.current;
    fake.init();
    fake.emit(
      { type: "system", subtype: "background_tasks_changed", session_id: RESERVED_SESSION_ID, tasks: [{ task_id: "bg-9", task_type: "local_bash", description: "Nightly tests" }] },
      { type: "system", subtype: "task_notification", session_id: RESERVED_SESSION_ID, task_id: "bg-9", status: "completed", output_file: "/tmp/bg-9.out" },
    );
    await flushClaudeSession();
    fake.interruptOutcomes.push((current) => {
      queueMicrotask(() => current.emit(
        { type: "user", session_id: RESERVED_SESSION_ID, message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t", content: "The user doesn't want to proceed with this tool use." }] } },
        { type: "user", session_id: RESERVED_SESSION_ID, message: { role: "user", content: [{ type: "text", text: "[Request interrupted by user for tool use]" }] } },
        { type: "result", subtype: "error_during_execution", session_id: RESERVED_SESSION_ID, user_message_uuids: [current.sent[0]!.uuid], terminal_reason: "aborted_tools", is_error: true },
      ));
      return { stillQueued: [], cancelled: [] };
    });

    await session.interrupt(turnId);
    await start("what happened?");

    const notices = events.filter((event) => event.method === ClaudeSessionEventName.SYSTEM_TASK_NOTIFICATION);
    expect(notices.map((event) => event.params?.content)).toEqual([
      "Background task completed: Nightly tests (completed) — Claude was stopped before reporting it",
    ]);
    const interruptedIndex = events.findIndex((event) => event.method === ClaudeSessionEventName.TURN_INTERRUPTED);
    expect(events.indexOf(notices[0]!)).toBeLessThan(interruptedIndex);
    expect(fake.sent[1]!.message.content).toEqual([
      { type: "text", text: "[System note: background task bg-9 (Nightly tests) finished with status completed while you were stopped; its output is at /tmp/bg-9.out.]" },
      { type: "text", text: "what happened?" },
    ]);
    await start("again");
    expect(fake.sent[2]!.message.content).toEqual([{ type: "text", text: "again" }]);
  });

  it("does not announce foreground task notifications (probe J)", async () => {
    const { sdkClient, start, methods } = createSession();
    await start("foreground");
    const fake = sdkClient.current;
    fake.init();
    fake.emit({ type: "system", subtype: "task_notification", session_id: RESERVED_SESSION_ID, task_id: "fg-1", status: "completed", output_file: "/tmp/fg" });
    fake.assistantText("done");
    fake.result([fake.sent[0]!.uuid]);
    await flushClaudeSession();

    expect(methods()).not.toContain(ClaudeSessionEventName.SYSTEM_TASK_NOTIFICATION);
  });
});

describe("ClaudeSession process lifetime", () => {
  it("fails the active turn visibly on an unexpected exit and reopens with resume on the next input (AC-009)", async () => {
    const { session, sdkClient, start, events, clearPendingToolApprovals } = createSession();
    const turnId = acceptedTurnId(await start("remember PAPAYA"));
    const first = sdkClient.current;
    first.init();
    await flushClaudeSession();
    first.fail(new Error("Claude Code process terminated by signal SIGKILL"));
    await flushClaudeSession();

    const errorEvent = events.find((event) => event.method === ClaudeSessionEventName.ERROR);
    expect(errorEvent?.params).toMatchObject({ turn_id: turnId, error_effect: "terminal" });
    expect(String(errorEvent?.params?.message)).toContain("SIGKILL");
    expect(clearPendingToolApprovals).toHaveBeenCalledWith("run-1", "Tool approval cancelled because the Claude process exited.");
    expect(session.processState).toBe("EXITED");

    await start("what codeword?");
    expect(sdkClient.openStreamingSession).toHaveBeenCalledTimes(2);
    expect(sdkClient.openStreamingSession.mock.calls[1]?.[0]).toMatchObject({
      sessionBinding: { kind: "resume", sessionId: RESERVED_SESSION_ID },
    });
    sdkClient.current.completeTurn("PAPAYA", [sdkClient.current.sent[0]!.uuid]);
    await flushClaudeSession();
    expect(events.filter((event) => event.method === ClaudeSessionEventName.TURN_COMPLETED)).toHaveLength(1);
  });

  it("treats a conflicting provider UUID as fatal for the process and fails the active turn", async () => {
    const { session, sdkClient, start, events } = createSession();
    await start("hello");
    const fake = sdkClient.current;
    fake.emit({ type: "system", subtype: "init", session_id: CONFLICTING_SESSION_ID });
    await flushClaudeSession();

    const errorEvent = events.find((event) => event.method === ClaudeSessionEventName.ERROR);
    expect(String(errorEvent?.params?.message)).toContain("CLAUDE_PROVIDER_SESSION_ID_CONFLICT");
    expect(fake.close).toHaveBeenCalled();
    expect(session.processState).toBe("EXITED");
  });

  it("closes the process on terminate cleanup, settling an active turn as interrupted, idempotently (AC-008)", async () => {
    const { session, sdkClient, start, events } = createSession();
    const turnId = acceptedTurnId(await start("long work"));

    await session.closeProcess("Tool approval cancelled because run was closed.");
    await session.closeProcess("Tool approval cancelled because run was closed.");

    expect(events.filter((event) => event.method === ClaudeSessionEventName.TURN_INTERRUPTED)).toEqual([
      { method: ClaudeSessionEventName.TURN_INTERRUPTED, params: { turnId, sessionId: RESERVED_SESSION_ID } },
    ]);
    expect(sdkClient.current.close).toHaveBeenCalledTimes(1);
    expect(session.processState).toBe("CLOSED");
    expect(await session.submitInput(new AgentInputUserMessage("after close"), { kind: "start_turn" })).toMatchObject({
      accepted: false,
      code: "CLAUDE_SESSION_CLOSED",
    });
  });

  it("closes an idle open process without emitting turn events", async () => {
    const { session, sdkClient, start, methods } = createSession();
    await start("hi");
    sdkClient.current.completeTurn("hi");
    await flushClaudeSession();
    const before = methods().length;

    await session.closeProcess("closed");

    expect(methods().slice(before)).toEqual([]);
    expect(sdkClient.current.close).toHaveBeenCalledTimes(1);
  });

  it("delegates terminate to the session manager dependency", async () => {
    const { session, terminateRunSession, methods } = createSession();

    await session.terminate();

    expect(terminateRunSession).toHaveBeenCalledTimes(1);
    expect(methods()).toEqual([ClaudeSessionEventName.SESSION_TERMINATED]);
    expect(session.getStatusSnapshotSource().currentStatus).toBe("OFFLINE");
  });
});

describe("ClaudeSession token usage", () => {
  it("emits usage per result for the canonical turn with the process query kind", async () => {
    const { sdkClient, start, events } = createSession();
    const turnId = acceptedTurnId(await start("count"));
    const fake = sdkClient.current;
    fake.init();
    fake.result([fake.sent[0]!.uuid], {
      uuid: "result-1",
      usage: { input_tokens: 3, output_tokens: 4, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      modelUsage: { "claude-haiku-4-5": { inputTokens: 3, outputTokens: 4, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 } },
    });
    await flushClaudeSession();

    const usage = events.filter((event) => event.method === ClaudeSessionEventName.TOKEN_USAGE_UPDATED);
    expect(usage).toHaveLength(1);
    expect(usage[0]?.params).toMatchObject({
      turn_id: turnId,
      claude_sdk_query_kind: "create",
      idempotency_key: "claude_sdk_result:result-1",
    });
  });

  const usageFrame = (answers: string[], extra: Record<string, unknown> = {}) => ({
    type: "result", subtype: "success", session_id: RESTORED_SESSION_ID, user_message_uuids: answers,
    usage: { input_tokens: 3, output_tokens: 4, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    modelUsage: { "claude-haiku-4-5": { inputTokens: 3, outputTokens: 4, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 } },
    ...extra,
  });
  const usageEvents = (events: RecordedEvent[]) =>
    events.filter((event) => event.method === ClaudeSessionEventName.TOKEN_USAGE_UPDATED);

  it("marks only the first usage observation of a resume-opened process as a series restart (SR-012)", async () => {
    const { sdkClient, start, events } = createSession({ sessionId: RESTORED_SESSION_ID });
    await start("first after restore");
    const fake = sdkClient.current;
    fake.init();
    fake.emit(usageFrame([fake.sent[0]!.uuid], { uuid: "res-1" }));
    await flushClaudeSession();
    await start("second");
    fake.init();
    fake.emit(usageFrame([fake.sent[1]!.uuid], { uuid: "res-2" }));
    await flushClaudeSession();

    expect(usageEvents(events).map((event) => event.params?.claude_sdk_series_restart)).toEqual([true, undefined]);
  });

  it("carries the series-restart mark past a dropped zeroed first result to the next emitted observation (IC-5)", async () => {
    const { sdkClient, start, events } = createSession({ sessionId: RESTORED_SESSION_ID });
    await start("first after restore");
    const fake = sdkClient.current;
    fake.init();
    fake.emit({
      type: "result", subtype: "error_during_execution", session_id: RESTORED_SESSION_ID, is_error: true,
      user_message_uuids: [fake.sent[0]!.uuid],
      modelUsage: { "claude-haiku-4-5": { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 } },
    });
    await flushClaudeSession();
    expect(usageEvents(events)).toHaveLength(0);

    await start("retry");
    fake.init();
    fake.emit(usageFrame([fake.sent[1]!.uuid], { uuid: "res-2" }));
    await flushClaudeSession();
    await start("third");
    fake.init();
    fake.emit(usageFrame([fake.sent[2]!.uuid], { uuid: "res-3" }));
    await flushClaudeSession();

    expect(usageEvents(events).map((event) => event.params?.claude_sdk_series_restart)).toEqual([true, undefined]);
  });

  it("marks the first observation after a reopen following an unexpected exit, but never a create generation", async () => {
    const { sdkClient, start, events } = createSession();
    await start("create generation");
    const first = sdkClient.current;
    first.init();
    first.emit({ ...usageFrame([first.sent[0]!.uuid], { uuid: "c-1" }), session_id: RESERVED_SESSION_ID });
    await flushClaudeSession();
    first.fail(new Error("Claude Code process terminated by signal SIGKILL"));
    await flushClaudeSession();

    await start("after crash");
    const second = sdkClient.current;
    second.init();
    second.emit({ ...usageFrame([second.sent[0]!.uuid], { uuid: "r-1" }), session_id: RESERVED_SESSION_ID });
    await flushClaudeSession();

    expect(usageEvents(events).map((event) => [event.params?.claude_sdk_query_kind, event.params?.claude_sdk_series_restart]))
      .toEqual([["create", undefined], ["resume", true]]);
  });

  it("does not forward zeroed crash-result usage that would reset the cumulative baseline (RSK-007)", async () => {
    const { sdkClient, start, events } = createSession();
    await start("crash");
    const fake = sdkClient.current;
    fake.init();
    fake.emit({
      type: "result", subtype: "error_during_execution", session_id: RESERVED_SESSION_ID, is_error: true,
      user_message_uuids: [fake.sent[0]!.uuid],
      modelUsage: { "claude-haiku-4-5": { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 } },
    });
    await flushClaudeSession();

    expect(events.some((event) => event.method === ClaudeSessionEventName.TOKEN_USAGE_UPDATED)).toBe(false);
    expect(events.some((event) => event.method === ClaudeSessionEventName.ERROR)).toBe(true);
  });
});

describe("ClaudeSession tool approvals", () => {
  const runPermissionRequests = async (
    options: ClaudeSdkStreamingSessionOptions,
    requests: Array<{ id: string; toolName: string; input: Record<string, unknown>; onAllow: () => Promise<void> }>,
  ) => {
    for (const request of requests) {
      const decision = await options.canUseTool!(request.toolName, request.input, { toolUseID: request.id });
      if (decision.behavior === "allow") await request.onAllow();
    }
  };

  it("auto-approves workspace and safe outside-scratch write/delete/shell requests under default permission mode", async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-claude-workspace-"));
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-claude-outside-"));
    try {
      const workspaceWrite = path.join(workspaceRoot, "write.txt");
      const workspaceDelete = path.join(workspaceRoot, "delete.txt");
      const outsideWrite = path.join(outsideRoot, "write.txt");
      const outsideShell = path.join(outsideRoot, "shell.txt");
      await fs.writeFile(workspaceDelete, "delete me", "utf8");
      const requests = [
        { id: "toolu-workspace-write", toolName: "Write", input: { file_path: workspaceWrite, content: "workspace write" }, onAllow: () => fs.writeFile(workspaceWrite, "workspace write", "utf8") },
        { id: "toolu-workspace-delete", toolName: "Bash", input: { command: `rm ${workspaceDelete}` }, onAllow: () => fs.rm(workspaceDelete, { force: true }) },
        { id: "toolu-outside-write", toolName: "Write", input: { file_path: outsideWrite, content: "outside write" }, onAllow: () => fs.writeFile(outsideWrite, "outside write", "utf8") },
        { id: "toolu-outside-shell", toolName: "Bash", input: { command: `printf outside-shell > ${outsideShell}` }, onAllow: () => fs.writeFile(outsideShell, "outside shell", "utf8") },
      ];
      const { sdkClient, start, methods } = createSession({ autoExecuteTools: true });
      await start("exercise permission harness");
      const options = sdkClient.sessions[0]!.options;
      expect(options.permissionMode).toBe("default");
      expect(Object.prototype.hasOwnProperty.call(options, "autoExecuteTools")).toBe(false);

      await runPermissionRequests(options, requests);

      expect(methods()).not.toContain(ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL);
      expect(methods().filter((method) => method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_APPROVED)).toHaveLength(requests.length);
      await expect(fs.readFile(workspaceWrite, "utf8")).resolves.toBe("workspace write");
      await expect(pathExists(workspaceDelete)).resolves.toBe(false);
      await expect(fs.readFile(outsideWrite, "utf8")).resolves.toBe("outside write");
      await expect(fs.readFile(outsideShell, "utf8")).resolves.toBe("outside shell");
    } finally {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
      await fs.rm(outsideRoot, { recursive: true, force: true });
    }
  });

  it("keeps manual mode gated for a permission request until approval resolves", async () => {
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-claude-manual-outside-"));
    try {
      const outsideTarget = path.join(outsideRoot, "manual-shell.txt");
      let sideEffectCount = 0;
      const { session, sdkClient, start, methods } = createSession({ autoExecuteTools: false });
      await start("manual outside scratch request");
      const decision = runPermissionRequests(sdkClient.sessions[0]!.options, [{
        id: "toolu-manual-outside-shell",
        toolName: "Bash",
        input: { command: `printf manual-shell > ${outsideTarget}` },
        onAllow: async () => {
          sideEffectCount += 1;
          await fs.writeFile(outsideTarget, "manual shell", "utf8");
        },
      }]);
      await flushClaudeSession();

      expect(methods()).toContain(ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL);
      expect(sideEffectCount).toBe(0);
      await session.approveTool("toolu-manual-outside-shell", false, "Denied by test");
      await decision;
      expect(sideEffectCount).toBe(0);
      await expect(pathExists(outsideTarget)).resolves.toBe(false);
    } finally {
      await fs.rm(outsideRoot, { recursive: true, force: true });
    }
  });
});

describe("ClaudeSession text projection", () => {
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
    const { sdkClient, sessionMessageCache, start, events } = createSession();
    const activeTurnId = acceptedTurnId(await start("where am I?"));
    emitCliTurn(sdkClient.current, chunks, sdkClient.current.sent[0]!.uuid);
    await flushClaudeSession();

    expect(events.some((event) => event.method === ClaudeSessionEventName.TURN_COMPLETED)).toBe(true);
    const textDeltas = events.filter((event) => event.method === ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA);
    const textCompletions = events.filter((event) => event.method === ClaudeSessionEventName.ITEM_OUTPUT_TEXT_COMPLETED);
    const preTextId = `${activeTurnId}:claude-text:msg-pre:0`;
    const postTextId = `${activeTurnId}:claude-text:msg-post:0`;
    expect(textDeltas.map((event) => event.params?.id)).toEqual([preTextId, postTextId]);
    expect(textDeltas.map((event) => event.params?.delta)).toEqual([
      "I will inspect the workspace first.",
      "The workspace is /tmp/project.",
    ]);
    expect(textCompletions.map((event) => event.params?.id)).toEqual([preTextId, postTextId]);
    const indexOf = (method: string, id: string) =>
      events.findIndex((event) => event.method === method && event.params?.id === id);
    const preTextIndex = indexOf(ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA, preTextId);
    const toolStartIndex = indexOf(ClaudeSessionEventName.ITEM_ADDED, "tool-bash-1");
    const toolEndIndex = indexOf(ClaudeSessionEventName.ITEM_COMPLETED, "tool-bash-1");
    const postTextIndex = indexOf(ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA, postTextId);
    expect(preTextIndex).toBeGreaterThanOrEqual(0);
    expect(toolStartIndex).toBeGreaterThan(preTextIndex);
    expect(toolEndIndex).toBeGreaterThan(toolStartIndex);
    expect(postTextIndex).toBeGreaterThan(toolEndIndex);
    expect(sessionMessageCache.getCachedMessages(RESERVED_SESSION_ID)).toEqual([
      expect.objectContaining({ role: "user", content: "where am I?" }),
      expect.objectContaining({ role: "assistant", content: "I will inspect the workspace first.The workspace is /tmp/project." }),
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
    const { sdkClient, start, events } = createSession();
    const activeTurnId = acceptedTurnId(await start("stream please"));
    emitCliTurn(sdkClient.current, chunks, sdkClient.current.sent[0]!.uuid);
    await flushClaudeSession();

    const expectedTextId = `${activeTurnId}:claude-text:msg-partial:0`;
    const textDeltas = events.filter((event) => event.method === ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA);
    const textCompletions = events.filter((event) => event.method === ClaudeSessionEventName.ITEM_OUTPUT_TEXT_COMPLETED);
    expect(textDeltas.map((event) => event.params?.id)).toEqual([expectedTextId, expectedTextId]);
    expect(textDeltas.map((event) => event.params?.delta)).toEqual(["Hel", "lo"]);
    expect(textCompletions).toHaveLength(1);
    expect(textCompletions[0]?.params).toMatchObject({ id: expectedTextId, text: "Hello" });
    expect(events.some((event) => event.params?.id === activeTurnId)).toBe(false);
  });
});
