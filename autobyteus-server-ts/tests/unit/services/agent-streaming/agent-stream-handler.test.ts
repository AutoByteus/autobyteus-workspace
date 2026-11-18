import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunEventType, isAgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentStreamSequence } from "../../../../src/services/agent-streaming/agent-stream-sequence.js";
import { buildRunProjectionBundle } from "../../../../src/run-history/projection/run-projection-utils.js";
import { AgentRun } from "../../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../src/agent-execution/domain/agent-run-context.js";
import { AgentStreamHandler } from "../../../../src/services/agent-streaming/agent-stream-handler.js";
import { getAgentRunEventMessageMapper } from "../../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { AgentStreamBroadcaster } from "../../../../src/services/agent-streaming/agent-stream-broadcaster.js";
import { AgentSessionManager } from "../../../../src/services/agent-streaming/agent-session-manager.js";
import {
  ClientMessageType,
  ServerMessage,
  ServerMessageType,
} from "../../../../src/services/agent-streaming/models.js";

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const buildProjection = (overrides: Record<string, unknown> = {}) => ({
  status: "running",
  isActive: true,
  shouldConnectStream: true,
  lastKnownStatus: "ACTIVE",
  statusSource: "ACTIVE_RUNTIME",
  statusPayload: { status: "running", agent_id: "agent-123" },
  ...overrides,
});

const createStatusProjectionService = (projection = buildProjection()) => ({
  getRunStatusProjection: vi.fn().mockResolvedValue(projection),
});

/**
 * Each active run's own stream sequence (SR-087), attached to the run's events when the handler first asks for it (the
 * run's resources attach it at activation), and the run's stored read for the snapshot (empty here).
 */
type StreamedRun = { runId: string; subscribeToEvents(listener: (event: unknown) => void): () => void };
const runsById = new Map<string, StreamedRun>();
const sequenceByRun = new Map<string, AgentStreamSequence>();
const sequences = {
  of: (runId: string): AgentStreamSequence | null => {
    const run = runsById.get(runId);
    if (!run) return null;
    let sequence = sequenceByRun.get(runId);
    if (!sequence) {
      const mapper = getAgentRunEventMessageMapper();
      sequence = new AgentStreamSequence(runId, { storedTurnIds: () => new Set(), whenPersisted: async () => undefined, map: (event) => mapper.map(event) });
      sequence.recordPredating();
      const attached = sequence;
      run.subscribeToEvents((event) => { if (isAgentRunEvent(event)) attached.accept(event); });
      sequenceByRun.set(runId, sequence);
    }
    return sequence;
  },
  /** A run's sequence as it is now; in these tests it never ends while a session follows it. */
  follow: (runId: string, listener: (sequence: AgentStreamSequence | null) => void): (() => void) => {
    listener(sequences.of(runId));
    return () => undefined;
  },
};
const readStored = vi.fn(async (runId: string) => buildRunProjectionBundle(runId, [], []));
const streamed = <T extends StreamedRun>(run: T): T => { runsById.set(run.runId, run); return run; };
const snapshotsOf = (connection: { send: { mock: { calls: unknown[][] } } }) => connection.send.mock.calls
  .map(([raw]) => JSON.parse(raw as string)).filter((message) => message.type === ServerMessageType.AGENT_STREAM_SNAPSHOT);

describe("AgentStreamHandler", () => {
  afterEach(() => { vi.useRealTimers(); runsById.clear(); sequenceByRun.clear(); });
  const createActiveRun = (overrides: Record<string, unknown> = {}) => streamed({
    runId: "agent-123",
    runtimeKind: "autobyteus",
    isActive: vi.fn().mockReturnValue(true),
    getStatusSnapshot: vi.fn().mockReturnValue({ status: "running" }),
    subscribeToEvents: vi.fn((_listener: (event: unknown) => void) => () => {}),
    postUserMessage: vi.fn().mockResolvedValue({ accepted: true, runtimeKind: "autobyteus" }),
    approveToolInvocation: vi
      .fn()
      .mockResolvedValue({ accepted: true, runtimeKind: "autobyteus" }),
    interrupt: vi.fn().mockResolvedValue({ accepted: false, runtimeKind: "autobyteus" }),
    ...overrides,
  });

  const createAgentRunService = (
    activeRun: ReturnType<typeof createActiveRun> | AgentRun | null,
  ) => ({
    getAgentRun: vi.fn().mockReturnValue(activeRun),
    restoreAgentRun: vi.fn(),
    activatePreparedRun: vi.fn(),
    recordRunActivity: vi.fn().mockResolvedValue(undefined),
  });

  const createCommandCoordinator = (
    options: {
      activeRun?: ReturnType<typeof createActiveRun> | AgentRun | null;
      onPost?: (input: any) => Promise<any> | any;
    } = {},
  ) => ({
    postUserMessage: vi.fn(async (input: any) => {
      if (options.onPost) {
        return options.onPost(input);
      }
      if (options.activeRun) {
        input.onActiveRunReady?.(options.activeRun);
      }
      return {
        ack: {
          command_type: "SEND_MESSAGE",
          run_id: input.runId,
          message_id: input.messageId,
          dedupe_key: input.dedupeKey,
          state: "accepted",
          accepted: true,
          duplicate: false,
          status: { status: "running", agent_id: input.runId },
        },
        turnId: "turn-1",
      };
    }),
  });

  it("parses valid messages", () => {
    const parsed = AgentStreamHandler.parseMessage(
      JSON.stringify({ type: ClientMessageType.SEND_MESSAGE, payload: { content: "Hello" } }),
    );

    expect(parsed.type).toBe(ClientMessageType.SEND_MESSAGE);
    expect(parsed.payload?.content).toBe("Hello");
  });

  it("rejects invalid JSON", () => {
    expect(() => AgentStreamHandler.parseMessage("not-json")).toThrow("Invalid JSON");
  });

  it("rejects messages missing a type", () => {
    expect(() => AgentStreamHandler.parseMessage(JSON.stringify({ payload: {} }))).toThrow(
      "Message missing 'type' field",
    );
  });

  it("connects to a run identity and sends CONNECTED plus projected status without restoring runtime", async () => {
    const sessionManager = new AgentSessionManager();
    const agentRunService = createAgentRunService(null);
    const statusProjectionService = createStatusProjectionService(buildProjection({
      status: "offline",
      isActive: false,
      shouldConnectStream: false,
      lastKnownStatus: "IDLE",
      statusSource: "HISTORICAL_METADATA",
      statusPayload: { status: "offline", agent_id: "agent-123" },
    }));
    const handler = new AgentStreamHandler(
      sessionManager,
      agentRunService as any,
      undefined,
      createCommandCoordinator() as any,
      statusProjectionService as any,
      null, sequences, readStored,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "agent-123");

    expect(sessionId).toBeTruthy();
    expect(sessionManager.getSession(sessionId as string)).toBeDefined();
    expect(statusProjectionService.getRunStatusProjection).toHaveBeenCalledWith("agent-123");
    expect(agentRunService.getAgentRun).toHaveBeenCalledWith("agent-123");
    expect(agentRunService.restoreAgentRun).not.toHaveBeenCalled();
    expect(agentRunService.activatePreparedRun).not.toHaveBeenCalled();

    const messages = connection.send.mock.calls.map(([raw]) => JSON.parse(raw));
    expect(messages).toEqual([
      expect.objectContaining({
        type: ServerMessageType.CONNECTED,
        payload: expect.objectContaining({ agent_id: "agent-123", session_id: sessionId }),
      }),
      {
        type: ServerMessageType.AGENT_STATUS,
        payload: { status: "offline", agent_id: "agent-123" },
      },
    ]);
  });

  it("closes with 4004 when agent identity is missing", async () => {
    const agentRunService = createAgentRunService(null);
    const statusProjectionService = createStatusProjectionService(buildProjection({
      statusSource: "MISSING",
      statusPayload: { status: "offline", agent_id: "missing-agent" },
    }));
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as any,
      undefined,
      createCommandCoordinator() as any,
      statusProjectionService as any,
      null, sequences, readStored,
    );

    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "missing-agent");

    expect(sessionId).toBeNull();
    expect(statusProjectionService.getRunStatusProjection).toHaveBeenCalledWith("missing-agent");
    expect(agentRunService.getAgentRun).not.toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalledWith(4004);

    const payload = JSON.parse(connection.send.mock.calls[0][0]);
    expect(payload.type).toBe(ServerMessageType.ERROR);
    expect(payload.payload.code).toBe("AGENT_NOT_FOUND");
  });

  it("connects to run events through the AgentRun subject for active runtime-managed runs", async () => {
    const unsubscribe = vi.fn();
    const activeRun = createActiveRun({
      runtimeKind: "codex_app_server",
      subscribeToEvents: vi.fn().mockReturnValue(unsubscribe),
    });
    const agentRunService = createAgentRunService(activeRun);

    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as any,
      undefined,
      createCommandCoordinator({ activeRun }) as any,
      createStatusProjectionService() as any,
      null, sequences, readStored,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "runtime-run-1");

    expect(sessionId).toBeTruthy();
    expect(activeRun.subscribeToEvents).toHaveBeenCalledWith(expect.any(Function));
    expect(connection.close).not.toHaveBeenCalled();
  });

  it("numbers a run's events as frames after its snapshot (SR-087)", async () => {
    vi.useFakeTimers();
    const activeRun = createActiveRun({ runtimeKind: "codex_app_server" });
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      createAgentRunService(activeRun) as any,
      undefined,
      createCommandCoordinator({ activeRun }) as any,
      createStatusProjectionService() as any,
      null, sequences, readStored,
    );
    const connection = { send: vi.fn(), close: vi.fn() };

    await handler.connect(connection, "agent-123");
    await vi.waitFor(() => expect(snapshotsOf(connection)).toHaveLength(1));
    const emit = activeRun.subscribeToEvents.mock.calls[0][0];
    emit({ runId: "agent-123", eventType: AgentRunEventType.SEGMENT_START,
      payload: { id: "item-1", turn_id: "turn-1", segment_type: "text" }, statusHint: null });
    emit({ runId: "agent-123", eventType: AgentRunEventType.SEGMENT_CONTENT,
      payload: { id: "item-1", turn_id: "turn-1", delta: "hello", segment_type: "text" }, statusHint: null });
    vi.advanceTimersByTime(500);

    const messages = connection.send.mock.calls.map(([raw]) => JSON.parse(raw));
    expect(snapshotsOf(connection)[0].payload).toMatchObject({ base_sequence: 0, turn_frames: [] });
    expect(messages).toContainEqual(expect.objectContaining({ type: ServerMessageType.SEGMENT_START, sequence: 1 }));
    // Coalesced content keeps the range of frames it covers.
    expect(messages).toContainEqual({ type: ServerMessageType.SEGMENT_CONTENT_BATCH, sequence: 2, sequence_through: 2,
      payload: { items: [{ id: "item-1", turn_id: "turn-1", segment_type: "text", delta: "hello" }] } });
  });

  it("gives a turn not yet confirmed at the base from its frames, in the snapshot (SR-087)", async () => {
    const activeRun = createActiveRun({ runtimeKind: "codex_app_server" });
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      createAgentRunService(activeRun) as any,
      undefined,
      createCommandCoordinator({ activeRun }) as any,
      createStatusProjectionService() as any,
      null, sequences, readStored,
    );
    const first = { send: vi.fn(), close: vi.fn() };
    await handler.connect(first, "agent-123");
    await vi.waitFor(() => expect(snapshotsOf(first)).toHaveLength(1));
    const emit = activeRun.subscribeToEvents.mock.calls[0][0];
    emit({ runId: "agent-123", eventType: AgentRunEventType.TURN_STARTED, payload: { turnId: "turn-3" }, statusHint: "ACTIVE" });

    const second = { send: vi.fn(), close: vi.fn() };
    await handler.connect(second, "agent-123");
    await vi.waitFor(() => expect(snapshotsOf(second)).toHaveLength(1));
    expect(snapshotsOf(second)[0].payload).toMatchObject({ base_sequence: 1,
      turn_frames: [expect.objectContaining({ type: ServerMessageType.TURN_STARTED, sequence: 1, payload: expect.objectContaining({ turn_id: "turn-3" }) })] });
  });

  it("registers the websocket connection for run-scoped live message broadcasts", async () => {
    const sessionManager = new AgentSessionManager();
    const broadcaster = new AgentStreamBroadcaster();
    const activeRun = createActiveRun();
    const agentRunService = createAgentRunService(activeRun);

    const handler = new AgentStreamHandler(
      sessionManager,
      agentRunService as any,
      broadcaster,
      createCommandCoordinator({ activeRun }) as any,
      createStatusProjectionService() as any,
      null, sequences, readStored,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "agent-123");

    expect(sessionId).toBeTruthy();
    expect(
      broadcaster.publishToRun(
        "agent-123",
        new ServerMessage(ServerMessageType.BACKGROUND_TASK_UPDATED, { task_id: "task-1", kind: "shell", description: "sleep 20", command: "sleep 20", status: "running", summary: null, end_reason: null, exit_code: null, started_at: "2026-09-29T16:48:20.000Z" }),
      ),
    ).toBe(1);

    expect(connection.send).toHaveBeenCalledTimes(3);
    const payload = JSON.parse(connection.send.mock.calls[2][0]);
    expect(payload).toMatchObject({
      type: ServerMessageType.BACKGROUND_TASK_UPDATED,
      payload: { task_id: "task-1", status: "running" },
    });
  });

  it("publishes terminal offline status to an already-connected websocket when a run terminates", async () => {
    const sessionManager = new AgentSessionManager();
    const runId = "run-terminate-1";
    const config = new AgentRunConfig({
      runtimeKind: "codex_app_server",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "gpt-5.3-codex",
      autoExecuteTools: false,
      workspaceId: "workspace-1",
      llmConfig: null,
    });
    const context = new AgentRunContext({
      runId,
      config,
      runtimeContext: null,
    });
    let isActive = true;
    const backend = {
      inputCapabilities: { activeTurnAppend: "unsupported" as const },
      compactionRecovery: { kind: "unsupported" as const },
      backgroundTaskInspection: { kind: "unsupported" as const },
      runId,
      runtimeKind: "codex_app_server",
      getContext: () => context,
      isActive: () => isActive,
      getPlatformAgentRunId: () => null,
      getLifecycleSnapshot: () => ({
        availability: isActive ? "active" as const : "offline" as const,
        phase: "idle" as const,
        currentTurn: { kind: "NONE" as const },
      }),
      subscribeToSourceEventBatches: vi.fn().mockReturnValue(() => undefined),
      postUserMessage: vi.fn().mockResolvedValue({ accepted: true }),
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
      interrupt: vi.fn().mockResolvedValue({ accepted: true }),
      terminate: vi.fn(async () => {
        isActive = false;
        return { accepted: true };
      }),
    };
    const activeRun = streamed(new AgentRun({ providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
      context,
      backend: backend as any,
    }));
    const agentRunService = createAgentRunService(activeRun);
    const handler = new AgentStreamHandler(
      sessionManager,
      agentRunService as any,
      undefined,
      createCommandCoordinator({ activeRun }) as any,
      createStatusProjectionService(buildProjection({
        status: "idle",
        statusPayload: { status: "idle", background_tasks_running: 0, agent_id: runId },
      })) as any,
      null, sequences, readStored,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, runId);
    expect(sessionId).toBeTruthy();

    await activeRun.terminate();
    await flush();

    const messages = connection.send.mock.calls.map(([raw]) => JSON.parse(raw));
    expect(messages).toContainEqual(expect.objectContaining({
      type: ServerMessageType.AGENT_STATUS,
      payload: {
        status: "offline",
        background_tasks_running: 0,
        agent_id: runId,
        recoverableBlock: null,
      },
    }));
    expect(connection.close).not.toHaveBeenCalled();
  });

  it("handles SEND_MESSAGE through the command coordinator and returns an ACK", async () => {
    const activeRun = createActiveRun();
    const agentRunService = createAgentRunService(activeRun);
    const commandCoordinator = createCommandCoordinator({ activeRun });

    const sessionManager = new AgentSessionManager();
    const handler = new AgentStreamHandler(
      sessionManager,
      agentRunService as any,
      undefined,
      commandCoordinator as any,
      createStatusProjectionService() as any,
      null, sequences, readStored,
    );

    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "agent-123");

    await handler.handleMessage(
      sessionId as string,
      JSON.stringify({
        type: ClientMessageType.SEND_MESSAGE,
        payload: {
          content: "Hello world",
          context_file_paths: ["/a.py"],
          image_urls: ["https://example.com/img.png"],
          message_id: "client-msg-1",
          dedupe_key: "agent_run_input:agent-123:client-msg-1",
        },
      }),
    );

    expect(commandCoordinator.postUserMessage).toHaveBeenCalledTimes(1);
    const input = commandCoordinator.postUserMessage.mock.calls[0][0];
    expect(input).toMatchObject({
      runId: "agent-123",
      messageId: "client-msg-1",
      dedupeKey: "agent_run_input:agent-123:client-msg-1",
      summary: "Hello world",
    });
    expect(input.message.content).toBe("Hello world");
    expect(input.message.contextFiles.map((file: any) => file.toDict())).toEqual([
      expect.objectContaining({ uri: "/a.py" }),
      expect.objectContaining({ uri: "https://example.com/img.png", file_type: "image" }),
    ]);

    const messages = connection.send.mock.calls.map(([raw]) => JSON.parse(raw));
    expect(messages).toContainEqual(expect.objectContaining({
      type: ServerMessageType.AGENT_COMMAND_ACK,
      payload: expect.objectContaining({
        accepted: true,
        message_id: "client-msg-1",
        dedupe_key: "agent_run_input:agent-123:client-msg-1",
      }),
    }));
  });

  it("defers runtime binding on identity-only connect until SEND_MESSAGE activates through the coordinator", async () => {
    const restoredRun = createActiveRun({
      subscribeToEvents: vi.fn().mockReturnValue(vi.fn()),
    });
    const agentRunService = createAgentRunService(null);
    const commandCoordinator = createCommandCoordinator({ activeRun: restoredRun });
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as any,
      undefined,
      commandCoordinator as any,
      createStatusProjectionService(buildProjection({
        status: "offline",
        isActive: false,
        shouldConnectStream: false,
        lastKnownStatus: "IDLE",
        statusSource: "PREPARED_IDENTITY",
        statusPayload: { status: "offline", agent_id: "agent-123" },
      })) as any,
      null, sequences, readStored,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "agent-123");
    expect(sessionId).toBeTruthy();
    expect(restoredRun.subscribeToEvents).not.toHaveBeenCalled();

    await handler.handleMessage(
      sessionId as string,
      JSON.stringify({
        type: ClientMessageType.SEND_MESSAGE,
        payload: {
          content: "resume agent",
          message_id: "client-msg-1",
          dedupe_key: "agent_run_input:agent-123:client-msg-1",
        },
      }),
    );

    expect(commandCoordinator.postUserMessage).toHaveBeenCalledTimes(1);
    expect(restoredRun.subscribeToEvents).toHaveBeenCalledWith(expect.any(Function));
    expect(agentRunService.restoreAgentRun).not.toHaveBeenCalled();
    expect(agentRunService.activatePreparedRun).not.toHaveBeenCalled();
  });

  it("answers a Stop to a stopped agent run as nothing to stop, without activating it (autobyteus-533 AC-003)", async () => {
    const activeRun = createActiveRun();
    const agentRunService = createAgentRunService(activeRun);
    const commandCoordinator = createCommandCoordinator();
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as any,
      undefined,
      commandCoordinator as any,
      createStatusProjectionService() as any,
      null, sequences, readStored,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "agent-123");
    agentRunService.getAgentRun.mockReturnValue(null);

    await handler.handleMessage(
      sessionId as string,
      JSON.stringify({
        type: ClientMessageType.INTERRUPT_GENERATION,
        payload: { command_id: "client_interrupt_missing" },
      }),
    );

    expect(commandCoordinator.postUserMessage).not.toHaveBeenCalled();
    expect(activeRun.interrupt).not.toHaveBeenCalled();
    expect(agentRunService.restoreAgentRun).not.toHaveBeenCalled();
    expect(agentRunService.activatePreparedRun).not.toHaveBeenCalled();
    expect(connection.send.mock.calls.map(([raw]) => JSON.parse(raw as string)).at(-1)).toEqual({
      type: ServerMessageType.AGENT_COMMAND_ACK,
      payload: {
        command_type: "INTERRUPT_GENERATION",
        command_id: "client_interrupt_missing",
        state: "accepted",
        target: { target_kind: "standalone_run", run_id: "agent-123" },
      },
    });
  });

  it("keeps tool approval active-only: an offline host is not started (AR-002)", async () => {
    const activeRun = createActiveRun();
    const agentRunService = createAgentRunService(activeRun);
    const commandCoordinator = createCommandCoordinator();
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as any,
      undefined,
      commandCoordinator as any,
      createStatusProjectionService() as any,
      null, sequences, readStored,
    );
    const sessionId = await handler.connect({ send: vi.fn(), close: vi.fn() }, "agent-123");
    agentRunService.getAgentRun.mockReturnValue(null);

    for (const type of [ClientMessageType.APPROVE_TOOL, ClientMessageType.DENY_TOOL]) {
      await handler.handleMessage(sessionId as string, JSON.stringify({ type, payload: { invocation_id: "inv-1" } }));
    }

    expect(activeRun.approveToolInvocation).not.toHaveBeenCalled();
    expect(commandCoordinator.postUserMessage).not.toHaveBeenCalled();
    expect(agentRunService.restoreAgentRun).not.toHaveBeenCalled();
    expect(agentRunService.activatePreparedRun).not.toHaveBeenCalled();
  });

  it("returns exactly one same-socket acknowledgement for an accepted interrupt", async () => {
    const activeRun = createActiveRun({
      interrupt: vi.fn().mockResolvedValue({ accepted: true }),
    });
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      createAgentRunService(activeRun) as any,
      undefined,
      createCommandCoordinator() as any,
      createStatusProjectionService() as any,
      null, sequences, readStored,
    );
    const connection = { send: vi.fn(), close: vi.fn() };
    const sessionId = await handler.connect(connection, "agent-123");
    // The run's snapshot connection sends its snapshot first (SR-087).
    await vi.waitFor(() => expect(snapshotsOf(connection)).toHaveLength(1));
    connection.send.mockClear();

    await handler.handleMessage(sessionId!, JSON.stringify({
      type: ClientMessageType.INTERRUPT_GENERATION,
      payload: { command_id: " client_interrupt_accept " },
    }));

    expect(activeRun.interrupt).toHaveBeenCalledWith(null);
    expect(connection.send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(connection.send.mock.calls[0][0])).toEqual({
      type: ServerMessageType.AGENT_COMMAND_ACK,
      payload: {
        command_type: "INTERRUPT_GENERATION",
        command_id: "client_interrupt_accept",
        state: "accepted",
        target: { target_kind: "standalone_run", run_id: "agent-123" },
      },
    });
  });

  it("rejects an empty interrupt command id before runtime execution", async () => {
    const activeRun = createActiveRun({ interrupt: vi.fn().mockResolvedValue({ accepted: true }) });
    const handler = new AgentStreamHandler(
      new AgentSessionManager(), createAgentRunService(activeRun) as any, undefined, createCommandCoordinator() as any,
      createStatusProjectionService() as any,
      null, sequences, readStored,
    );
    const connection = { send: vi.fn(), close: vi.fn() };
    const sessionId = await handler.connect(connection, "agent-123");
    // The run's snapshot connection sends its snapshot first (SR-087).
    await vi.waitFor(() => expect(snapshotsOf(connection)).toHaveLength(1));
    connection.send.mockClear();

    await handler.handleMessage(sessionId!, JSON.stringify({
      type: ClientMessageType.INTERRUPT_GENERATION,
      payload: { command_id: "   " },
    }));

    expect(activeRun.interrupt).not.toHaveBeenCalled();
    expect(JSON.parse(connection.send.mock.calls[0][0])).toMatchObject({
      type: ServerMessageType.AGENT_COMMAND_ACK,
      payload: { command_id: "", state: "rejected", code: "INVALID_COMMAND_ID" },
    });
  });

  it.each([
    ["NO_ACTIVE_TURN", "AgentRun 'agent-123' has no canonical active turn to interrupt."],
    ["RUN_NOT_ACTIVE", "AgentRun 'agent-123' is not running."],
  ])("answers a Stop whose run has nothing to stop (%s) as accepted (autobyteus-533 AC-001)", async (code, message) => {
    const activeRun = createActiveRun({ interrupt: vi.fn().mockResolvedValue({ accepted: false, code, message }) });
    const handler = new AgentStreamHandler(
      new AgentSessionManager(), createAgentRunService(activeRun) as any, undefined, createCommandCoordinator() as any,
      createStatusProjectionService() as any,
      null, sequences, readStored,
    );
    const connection = { send: vi.fn(), close: vi.fn() };
    const sessionId = await handler.connect(connection, "agent-123");
    await vi.waitFor(() => expect(snapshotsOf(connection)).toHaveLength(1));
    connection.send.mockClear();

    await handler.handleMessage(sessionId!, JSON.stringify({
      type: ClientMessageType.INTERRUPT_GENERATION,
      payload: { command_id: "client_interrupt_nothing" },
    }));

    expect(connection.send.mock.calls.map(([raw]) => JSON.parse(raw as string))).toEqual([{
      type: ServerMessageType.AGENT_COMMAND_ACK,
      payload: {
        command_type: "INTERRUPT_GENERATION",
        command_id: "client_interrupt_nothing",
        state: "accepted",
        target: { target_kind: "standalone_run", run_id: "agent-123" },
      },
    }]);
  });

  it("maps interrupt provider failures without emitting lifecycle status", async () => {
    const activeRun = createActiveRun({
      interrupt: vi.fn().mockResolvedValue({
        accepted: false, code: "PROVIDER_REJECTED", message: "Cannot interrupt now.",
      }),
    });
    const handler = new AgentStreamHandler(
      new AgentSessionManager(), createAgentRunService(activeRun) as any, undefined, createCommandCoordinator() as any,
      createStatusProjectionService() as any,
      null, sequences, readStored,
    );
    const connection = { send: vi.fn(), close: vi.fn() };
    const sessionId = await handler.connect(connection, "agent-123");
    // The run's snapshot connection sends its snapshot first (SR-087).
    await vi.waitFor(() => expect(snapshotsOf(connection)).toHaveLength(1));
    connection.send.mockClear();

    await handler.handleMessage(sessionId!, JSON.stringify({
      type: ClientMessageType.INTERRUPT_GENERATION,
      payload: { command_id: "client_interrupt_failed" },
    }));

    expect(connection.send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(connection.send.mock.calls[0][0])).toMatchObject({
      type: ServerMessageType.AGENT_COMMAND_ACK,
      payload: { state: "failed", code: "PROVIDER_REJECTED" },
    });
  });

  it("handles tool approvals for active sessions", async () => {
    const activeRun = createActiveRun();
    const agentRunService = createAgentRunService(activeRun);

    const sessionManager = new AgentSessionManager();
    const handler = new AgentStreamHandler(
      sessionManager,
      agentRunService as any,
      undefined,
      createCommandCoordinator({ activeRun }) as any,
      createStatusProjectionService() as any,
      null, sequences, readStored,
    );

    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "agent-123");

    await handler.handleMessage(
      sessionId as string,
      JSON.stringify({
        type: ClientMessageType.APPROVE_TOOL,
        payload: { invocation_id: "inv-1", reason: "ok" },
      }),
    );

    expect(activeRun.approveToolInvocation).toHaveBeenCalledWith("inv-1", true, "ok");
  });

  it("ignores messages for unknown sessions", async () => {
    const agentRunService = createAgentRunService(null);
    const commandCoordinator = createCommandCoordinator();
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as any,
      undefined,
      commandCoordinator as any,
      createStatusProjectionService() as any,
      null, sequences, readStored,
    );

    await handler.handleMessage("missing", JSON.stringify({ type: ClientMessageType.SEND_MESSAGE }));
    expect(commandCoordinator.postUserMessage).not.toHaveBeenCalled();
  });
});
