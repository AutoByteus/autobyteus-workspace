import { describe, expect, it, vi } from "vitest";
import { StreamEventType, type AgentEventStream, type StreamEvent } from "autobyteus-ts";
import { AgentStreamHandler } from "../../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentSessionManager } from "../../../../src/services/agent-streaming/agent-session-manager.js";
import { ClientMessageType, ServerMessageType } from "../../../../src/services/agent-streaming/models.js";
import { RuntimeAdapterRegistry } from "../../../../src/runtime-execution/runtime-adapter-registry.js";
import { getRuntimeEventMessageMapper } from "../../../../src/services/agent-streaming/runtime-event-message-mapper.js";

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

describe("AgentStreamHandler", () => {
  const createIngress = () => ({
    sendTurn: vi.fn().mockResolvedValue({ accepted: true, runtimeKind: "autobyteus" }),
    approveTool: vi.fn().mockResolvedValue({ accepted: true, runtimeKind: "autobyteus" }),
    interruptRun: vi.fn().mockResolvedValue({ accepted: false, runtimeKind: "autobyteus" }),
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
    const agentManager = {
      getAgentRun: vi.fn().mockReturnValue({ runId: "agent-123" }),
      getAgentEventStream: vi.fn().mockReturnValue(createStream([])),
    };
    const ingress = createIngress();

    const handler = new AgentStreamHandler(sessionManager, agentManager as any, ingress as any);
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
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      {
        getAgentRun: vi.fn().mockReturnValue(null),
        getAgentEventStream: vi.fn(),
      } as any,
      createIngress() as any,
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

  it("connects to runtime event stream via adapter when agent instance is missing", async () => {
    const subscribeToRunEvents = vi.fn().mockReturnValue(() => {});
    const adapterRegistry = new RuntimeAdapterRegistry([
      {
        runtimeKind: "codex_app_server",
        isRunActive: vi.fn().mockReturnValue(true),
        subscribeToRunEvents,
        sendTurn: vi.fn(),
        approveTool: vi.fn(),
        interruptRun: vi.fn(),
      },
    ] as any);
    const runtimeCompositionService = {
      getRunSession: vi.fn().mockReturnValue({
        runId: "runtime-run-1",
        runtimeKind: "codex_app_server",
        mode: "agent",
        runtimeReference: {
          runtimeKind: "codex_app_server",
          sessionId: "runtime-run-1",
          threadId: "thread-1",
          metadata: null,
        },
      }),
    };

    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      {
        getAgentRun: vi.fn().mockReturnValue(null),
        getAgentEventStream: vi.fn(),
      } as any,
      createIngress() as any,
      adapterRegistry,
      getRuntimeEventMessageMapper(),
      runtimeCompositionService as any,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "runtime-run-1");

    expect(sessionId).toBeTruthy();
    expect(subscribeToRunEvents).toHaveBeenCalledWith(
      "runtime-run-1",
      expect.any(Function),
    );
    expect(connection.close).not.toHaveBeenCalled();
  });

  it("handles SEND_MESSAGE and forwards to runtime ingress", async () => {
    const agentManager = {
      getAgentRun: vi.fn().mockReturnValue({ runId: "agent-123" }),
      getAgentEventStream: vi.fn().mockReturnValue(createStream([])),
    };
    const ingress = createIngress();

    const sessionManager = new AgentSessionManager();
    const handler = new AgentStreamHandler(sessionManager, agentManager as any, ingress as any);

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

    expect(ingress.sendTurn).toHaveBeenCalledTimes(1);
    const message = ingress.sendTurn.mock.calls[0][0].message;
    expect(message.content).toBe("Hello world");
  });

  it("handles tool approvals", async () => {
    const agentManager = {
      getAgentRun: vi.fn().mockReturnValue({ runId: "agent-123" }),
      getAgentEventStream: vi.fn().mockReturnValue(createStream([])),
    };
    const ingress = createIngress();

    const sessionManager = new AgentSessionManager();
    const handler = new AgentStreamHandler(sessionManager, agentManager as any, ingress as any);

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

    expect(ingress.approveTool).toHaveBeenCalledWith({
      runId: "agent-123",
      mode: "agent",
      invocationId: "inv-1",
      approved: true,
      reason: "ok",
    });
  });

  it("ignores messages for unknown sessions", async () => {
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      {
        getAgentRun: vi.fn().mockReturnValue(null),
        getAgentEventStream: vi.fn(),
      } as any,
      createIngress() as any,
    );

    await handler.handleMessage("missing", JSON.stringify({ type: ClientMessageType.SEND_MESSAGE }));
  });

  it("maps explicit tool lifecycle stream events to websocket message types", () => {
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      {
        getAgentRun: vi.fn(),
        getAgentEventStream: vi.fn(),
      } as any,
      createIngress() as any,
    );

    const mappings: Array<[StreamEventType, ServerMessageType]> = [
      [StreamEventType.TOOL_APPROVAL_REQUESTED, ServerMessageType.TOOL_APPROVAL_REQUESTED],
      [StreamEventType.TOOL_APPROVED, ServerMessageType.TOOL_APPROVED],
      [StreamEventType.TOOL_DENIED, ServerMessageType.TOOL_DENIED],
      [StreamEventType.TOOL_EXECUTION_STARTED, ServerMessageType.TOOL_EXECUTION_STARTED],
      [StreamEventType.TOOL_EXECUTION_SUCCEEDED, ServerMessageType.TOOL_EXECUTION_SUCCEEDED],
      [StreamEventType.TOOL_EXECUTION_FAILED, ServerMessageType.TOOL_EXECUTION_FAILED],
    ];

    for (const [streamType, messageType] of mappings) {
      const message = handler.convertStreamEvent({
        event_type: streamType,
        data: { invocation_id: "inv-1", tool_name: "read_file" },
      } as StreamEvent);
      expect(message.type).toBe(messageType);
      expect(message.payload.invocation_id).toBe("inv-1");
    }
  });
});
