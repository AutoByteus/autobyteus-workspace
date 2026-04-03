import { describe, expect, it, vi } from "vitest";
import { type AgentEventStream } from "autobyteus-ts";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
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

const createStream = (events: StreamEvent[]): AgentEventStream => {
  const allEvents = async function* () {
    for (const event of events) {
      yield event;
      await new Promise((resolve) => setImmediate(resolve));
    }
  };

  return {
    allEvents,
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as AgentEventStream;
};

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("AgentStreamHandler", () => {
  const createActiveRun = (overrides: Record<string, unknown> = {}) => ({
    runId: "agent-123",
    runtimeKind: "autobyteus",
    isActive: vi.fn().mockReturnValue(true),
    getStatus: vi.fn().mockReturnValue("ACTIVE"),
    subscribeToEvents: vi.fn((listener: (event: unknown) => void) => {
      const stream = createStream([]);
      void (async () => {
        for await (const event of stream.allEvents()) {
          listener(event);
        }
      })();
      return () => {};
    }),
    postUserMessage: vi.fn().mockResolvedValue({ accepted: true, runtimeKind: "autobyteus" }),
    approveToolInvocation: vi
      .fn()
      .mockResolvedValue({ accepted: true, runtimeKind: "autobyteus" }),
    interrupt: vi.fn().mockResolvedValue({ accepted: false, runtimeKind: "autobyteus" }),
    ...overrides,
  });

  const createAgentRunService = (activeRun: ReturnType<typeof createActiveRun> | null) => ({
    getAgentRun: vi.fn().mockReturnValue(activeRun),
    recordRunActivity: vi.fn().mockResolvedValue(undefined),
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

  it("connects and sends CONNECTED message", async () => {
    const sessionManager = new AgentSessionManager();
    const activeRun = createActiveRun();
    const agentRunService = createAgentRunService(activeRun);
    const handler = new AgentStreamHandler(sessionManager, agentRunService as any);
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "agent-123");

    expect(sessionId).toBeTruthy();
    expect(sessionManager.getSession(sessionId as string)).toBeDefined();

    const payload = JSON.parse(connection.send.mock.calls[0][0]);
    expect(payload.type).toBe(ServerMessageType.CONNECTED);
    expect(payload.payload.agent_id).toBe("agent-123");
    expect(payload.payload.session_id).toBe(sessionId);
  });

  it("closes with 4004 when agent is missing", async () => {
    const agentRunService = createAgentRunService(null);
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as any,
    );

    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "missing-agent");

    expect(sessionId).toBeNull();
    expect(connection.close).toHaveBeenCalledWith(4004);

    const payload = JSON.parse(connection.send.mock.calls[0][0]);
    expect(payload.type).toBe(ServerMessageType.ERROR);
    expect(payload.payload.code).toBe("AGENT_NOT_FOUND");
  });

  it("connects to run events through the AgentRun subject for runtime-managed runs", async () => {
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
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    await handler.connect(connection, "runtime-run-2");
    await flush();

    expect(connection.send).toHaveBeenCalledTimes(3);
    const payload = JSON.parse(connection.send.mock.calls[2][0]);
    expect(payload).toMatchObject({
      type: ServerMessageType.SEGMENT_CONTENT,
      payload: {
        id: "item-1",
        delta: "hello",
        segment_type: "text",
      },
    });
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

  it("handles SEND_MESSAGE and forwards to the live AgentRun subject", async () => {
    const activeRun = createActiveRun();
    const agentRunService = createAgentRunService(activeRun);

    const sessionManager = new AgentSessionManager();
    const handler = new AgentStreamHandler(sessionManager, agentRunService as any);

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
        },
      }),
    );

    expect(activeRun.postUserMessage).toHaveBeenCalledTimes(1);
    const message = activeRun.postUserMessage.mock.calls[0][0];
    expect(message.content).toBe("Hello world");
    expect(agentRunService.recordRunActivity).toHaveBeenCalledWith(
      activeRun,
      expect.objectContaining({
        summary: "Hello world",
        lastKnownStatus: "ACTIVE",
      }),
    );
  });

  it("handles tool approvals", async () => {
    const activeRun = createActiveRun();
    const agentRunService = createAgentRunService(activeRun);

    const sessionManager = new AgentSessionManager();
    const handler = new AgentStreamHandler(sessionManager, agentRunService as any);

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
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as any,
    );

    await handler.handleMessage("missing", JSON.stringify({ type: ClientMessageType.SEND_MESSAGE }));
  });
});
