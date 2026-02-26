import { describe, expect, it, vi } from "vitest";
import { StreamEventType, type AgentEventStream, type StreamEvent } from "autobyteus-ts";
import { AgentStreamHandler } from "../../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentSessionManager } from "../../../../src/services/agent-streaming/agent-session-manager.js";
import { ClientMessageType, ServerMessageType } from "../../../../src/services/agent-streaming/models.js";

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
      getAgentRun: vi.fn().mockReturnValue({ agentId: "agent-123" }),
      getAgentEventStream: vi.fn().mockReturnValue(createStream([])),
    };

    const handler = new AgentStreamHandler(sessionManager, agentManager as any);
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

  it("sends current AGENT_STATUS snapshot on connect when available", async () => {
    const sessionManager = new AgentSessionManager();
    const agentManager = {
      getAgentRun: vi
        .fn()
        .mockReturnValue({ agentId: "agent-123", currentStatus: "idle" }),
      getAgentEventStream: vi.fn().mockReturnValue(createStream([])),
    };

    const handler = new AgentStreamHandler(sessionManager, agentManager as any);
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "agent-123");
    expect(sessionId).toBeTruthy();
    expect(connection.send).toHaveBeenCalledTimes(2);

    const connectedPayload = JSON.parse(connection.send.mock.calls[0][0]);
    expect(connectedPayload.type).toBe(ServerMessageType.CONNECTED);

    const statusPayload = JSON.parse(connection.send.mock.calls[1][0]);
    expect(statusPayload.type).toBe(ServerMessageType.AGENT_STATUS);
    expect(statusPayload.payload.new_status).toBe("idle");
  });

  it("closes with 4004 when agent is missing", async () => {
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      {
        getAgentRun: vi.fn().mockReturnValue(null),
        getAgentEventStream: vi.fn(),
      } as any,
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

  it("handles SEND_MESSAGE and forwards to agent", async () => {
    const agent = {
      agentId: "agent-123",
      postUserMessage: vi.fn().mockResolvedValue(undefined),
    };

    const agentManager = {
      getAgentRun: vi.fn().mockReturnValue(agent),
      getAgentEventStream: vi.fn().mockReturnValue(createStream([])),
    };

    const sessionManager = new AgentSessionManager();
    const handler = new AgentStreamHandler(sessionManager, agentManager as any);

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

    expect(agent.postUserMessage).toHaveBeenCalledTimes(1);
    const message = agent.postUserMessage.mock.calls[0][0];
    expect(message.content).toBe("Hello world");
  });

  it("handles tool approvals", async () => {
    const agent = {
      agentId: "agent-123",
      postToolExecutionApproval: vi.fn().mockResolvedValue(undefined),
    };

    const agentManager = {
      getAgentRun: vi.fn().mockReturnValue(agent),
      getAgentEventStream: vi.fn().mockReturnValue(createStream([])),
    };

    const sessionManager = new AgentSessionManager();
    const handler = new AgentStreamHandler(sessionManager, agentManager as any);

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

    expect(agent.postToolExecutionApproval).toHaveBeenCalledWith("inv-1", true, "ok");
  });

  it("ignores messages for unknown sessions", async () => {
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      {
        getAgentRun: vi.fn().mockReturnValue(null),
        getAgentEventStream: vi.fn(),
      } as any,
    );

    await handler.handleMessage("missing", JSON.stringify({ type: ClientMessageType.SEND_MESSAGE }));
  });

  it("maps explicit tool lifecycle stream events to websocket message types", () => {
    const handler = new AgentStreamHandler(new AgentSessionManager(), {
      getAgentRun: vi.fn(),
      getAgentEventStream: vi.fn(),
    } as any);

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
      if (!message) {
        throw new Error(`Expected stream event ${streamType} to produce a message`);
      }
      expect(message.type).toBe(messageType);
      expect(message.payload.invocation_id).toBe("inv-1");
    }
  });

  it("maps error stream events to websocket ERROR payloads with code", () => {
    const handler = new AgentStreamHandler(new AgentSessionManager(), {
      getAgentRun: vi.fn(),
      getAgentEventStream: vi.fn(),
    } as any);

    const message = handler.convertStreamEvent({
      event_type: StreamEventType.ERROR_EVENT,
      data: { code: "OUTPUT_GENERATION_FAILED", message: "Model rejected prompt." },
    } as StreamEvent);

    if (!message) {
      throw new Error("Expected error stream event to produce a message");
    }
    expect(message.type).toBe(ServerMessageType.ERROR);
    expect(message.payload.code).toBe("OUTPUT_GENERATION_FAILED");
    expect(message.payload.message).toBe("Model rejected prompt.");
  });

  it("drops deprecated assistant chunk stream events", () => {
    const handler = new AgentStreamHandler(new AgentSessionManager(), {
      getAgentRun: vi.fn(),
      getAgentEventStream: vi.fn(),
    } as any);

    const message = handler.convertStreamEvent({
      event_type: StreamEventType.ASSISTANT_CHUNK,
      data: { content: "legacy chunk", is_complete: false },
    } as StreamEvent);

    expect(message).toBeNull();
  });
});
