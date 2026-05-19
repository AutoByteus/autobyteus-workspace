import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRun } from "../../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../src/agent-execution/domain/agent-run-context.js";
import { AgentStreamHandler } from "../../../../src/services/agent-streaming/agent-stream-handler.js";
import {
  getAgentRunEventMessageMapper,
} from "../../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
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
  canInterrupt: true,
  isActive: true,
  shouldConnectStream: true,
  lastKnownStatus: "ACTIVE",
  statusSource: "ACTIVE_RUNTIME",
  statusPayload: { status: "running", can_interrupt: true, agent_id: "agent-123" },
  ...overrides,
});

const createStatusProjectionService = (projection = buildProjection()) => ({
  getRunStatusProjection: vi.fn().mockResolvedValue(projection),
});

describe("AgentStreamHandler", () => {
  const createActiveRun = (overrides: Record<string, unknown> = {}) => ({
    runId: "agent-123",
    runtimeKind: "autobyteus",
    isActive: vi.fn().mockReturnValue(true),
    getStatusSnapshot: vi.fn().mockReturnValue({ status: "running", can_interrupt: true }),
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
          status: { status: "running", can_interrupt: true, agent_id: input.runId },
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
      canInterrupt: false,
      isActive: false,
      shouldConnectStream: false,
      lastKnownStatus: "IDLE",
      statusSource: "HISTORICAL_METADATA",
      statusPayload: { status: "offline", can_interrupt: false, agent_id: "agent-123" },
    }));
    const handler = new AgentStreamHandler(
      sessionManager,
      agentRunService as any,
      getAgentRunEventMessageMapper(),
      undefined,
      createCommandCoordinator() as any,
      statusProjectionService as any,
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
        payload: { status: "offline", can_interrupt: false, agent_id: "agent-123" },
      },
    ]);
  });

  it("closes with 4004 when agent identity is missing", async () => {
    const agentRunService = createAgentRunService(null);
    const statusProjectionService = createStatusProjectionService(buildProjection({
      statusSource: "MISSING",
      statusPayload: { status: "offline", can_interrupt: false, agent_id: "missing-agent" },
    }));
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as any,
      undefined,
      undefined,
      createCommandCoordinator() as any,
      statusProjectionService as any,
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
      getAgentRunEventMessageMapper(),
      undefined,
      createCommandCoordinator({ activeRun }) as any,
      createStatusProjectionService() as any,
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

  it("maps Codex AgentRunEvents directly to websocket messages for single-agent runs", async () => {
    const unsubscribe = vi.fn();
    const activeRun = createActiveRun({
      runtimeKind: "codex_app_server",
      subscribeToEvents: vi.fn((listener: (event: unknown) => void) => {
        listener({
          runId: "runtime-run-2",
          eventType: AgentRunEventType.SEGMENT_CONTENT,
          payload: {
            id: "item-1",
            delta: "hello",
            segment_type: "text",
          },
          statusHint: null,
        });
        return unsubscribe;
      }),
    });
    const agentRunService = createAgentRunService(activeRun);

    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as any,
      getAgentRunEventMessageMapper(),
      undefined,
      createCommandCoordinator({ activeRun }) as any,
      createStatusProjectionService() as any,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    await handler.connect(connection, "runtime-run-2");
    await flush();

    const messages = connection.send.mock.calls.map(([raw]) => JSON.parse(raw));
    expect(messages).toContainEqual(expect.objectContaining({
      type: ServerMessageType.SEGMENT_CONTENT,
      payload: expect.objectContaining({
        id: "item-1",
        delta: "hello",
        segment_type: "text",
      }),
    }));
    expect(messages).toContainEqual(expect.objectContaining({ type: ServerMessageType.CONNECTED }));
    expect(messages).toContainEqual(expect.objectContaining({ type: ServerMessageType.AGENT_STATUS }));
  });

  it("maps turn lifecycle AgentRunEvents directly to websocket messages", async () => {
    const unsubscribe = vi.fn();
    const activeRun = createActiveRun({
      runtimeKind: "codex_app_server",
      subscribeToEvents: vi.fn((listener: (event: unknown) => void) => {
        listener({
          runId: "runtime-run-3",
          eventType: AgentRunEventType.TURN_COMPLETED,
          payload: {
            turnId: "turn-3",
          },
          statusHint: "IDLE",
        });
        return unsubscribe;
      }),
    });
    const agentRunService = createAgentRunService(activeRun);

    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as any,
      getAgentRunEventMessageMapper(),
      undefined,
      createCommandCoordinator({ activeRun }) as any,
      createStatusProjectionService() as any,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    await handler.connect(connection, "runtime-run-3");
    await flush();

    const messages = connection.send.mock.calls.map(([raw]) => JSON.parse(raw));
    expect(messages).toContainEqual(expect.objectContaining({
      type: ServerMessageType.TURN_COMPLETED,
      payload: expect.objectContaining({
        turn_id: "turn-3",
      }),
    }));
  });

  it("registers the websocket connection for run-scoped live message broadcasts", async () => {
    const sessionManager = new AgentSessionManager();
    const broadcaster = new AgentStreamBroadcaster();
    const activeRun = createActiveRun();
    const agentRunService = createAgentRunService(activeRun);

    const handler = new AgentStreamHandler(
      sessionManager,
      agentRunService as any,
      undefined,
      broadcaster,
      createCommandCoordinator({ activeRun }) as any,
      createStatusProjectionService() as any,
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
        new ServerMessage(ServerMessageType.EXTERNAL_USER_MESSAGE, {
          content: "hello from telegram",
        }),
      ),
    ).toBe(1);

    expect(connection.send).toHaveBeenCalledTimes(3);
    const payload = JSON.parse(connection.send.mock.calls[2][0]);
    expect(payload).toMatchObject({
      type: ServerMessageType.EXTERNAL_USER_MESSAGE,
      payload: {
        content: "hello from telegram",
      },
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
      skillAccessMode: null,
    });
    const context = new AgentRunContext({
      runId,
      config,
      runtimeContext: null,
    });
    let isActive = true;
    const backend = {
      runId,
      runtimeKind: "codex_app_server",
      getContext: () => context,
      isActive: () => isActive,
      getPlatformAgentRunId: () => null,
      getStatusSnapshot: () => ({
        status: isActive ? "idle" : "offline",
        can_interrupt: false,
      }),
      subscribeToEvents: vi.fn().mockReturnValue(() => undefined),
      postUserMessage: vi.fn().mockResolvedValue({ accepted: true }),
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
      interrupt: vi.fn().mockResolvedValue({ accepted: true }),
      terminate: vi.fn(async () => {
        isActive = false;
        return { accepted: true };
      }),
    };
    const activeRun = new AgentRun({
      context,
      backend: backend as any,
    });
    const agentRunService = createAgentRunService(activeRun);
    const handler = new AgentStreamHandler(
      sessionManager,
      agentRunService as any,
      getAgentRunEventMessageMapper(),
      undefined,
      createCommandCoordinator({ activeRun }) as any,
      createStatusProjectionService(buildProjection({
        status: "idle",
        canInterrupt: false,
        statusPayload: { status: "idle", can_interrupt: false, agent_id: runId },
      })) as any,
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
        can_interrupt: false,
        agent_id: runId,
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
      undefined,
      commandCoordinator as any,
      createStatusProjectionService() as any,
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
      undefined,
      commandCoordinator as any,
      createStatusProjectionService(buildProjection({
        status: "offline",
        canInterrupt: false,
        isActive: false,
        shouldConnectStream: false,
        lastKnownStatus: "IDLE",
        statusSource: "PREPARED_IDENTITY",
        statusPayload: { status: "offline", can_interrupt: false, agent_id: "agent-123" },
      })) as any,
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

  it("keeps interrupt-generation active-only and does not activate a stopped agent run", async () => {
    const activeRun = createActiveRun();
    const agentRunService = createAgentRunService(activeRun);
    const commandCoordinator = createCommandCoordinator();
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as any,
      undefined,
      undefined,
      commandCoordinator as any,
      createStatusProjectionService() as any,
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
      }),
    );

    expect(commandCoordinator.postUserMessage).not.toHaveBeenCalled();
    expect(activeRun.interrupt).not.toHaveBeenCalled();
  });

  it("handles tool approvals for active sessions", async () => {
    const activeRun = createActiveRun();
    const agentRunService = createAgentRunService(activeRun);

    const sessionManager = new AgentSessionManager();
    const handler = new AgentStreamHandler(
      sessionManager,
      agentRunService as any,
      undefined,
      undefined,
      createCommandCoordinator({ activeRun }) as any,
      createStatusProjectionService() as any,
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
      undefined,
      commandCoordinator as any,
      createStatusProjectionService() as any,
    );

    await handler.handleMessage("missing", JSON.stringify({ type: ClientMessageType.SEND_MESSAGE }));
    expect(commandCoordinator.postUserMessage).not.toHaveBeenCalled();
  });
});
