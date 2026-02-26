import fastify from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it } from "vitest";
import WebSocket from "ws";
import { AgentInputUserMessage, StreamEvent, StreamEventType } from "autobyteus-ts";
import { AgentStreamHandler } from "../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { RuntimeCommandIngressService } from "../../../src/runtime-execution/runtime-command-ingress-service.js";
import { RuntimeAdapterRegistry } from "../../../src/runtime-execution/runtime-adapter-registry.js";
import { RuntimeSessionStore } from "../../../src/runtime-execution/runtime-session-store.js";
import { AutobyteusRuntimeAdapter } from "../../../src/runtime-execution/adapters/autobyteus-runtime-adapter.js";

class FakeEventStream {
  private queue: Array<StreamEvent | null> = [];
  private waiters: Array<(value: StreamEvent | null) => void> = [];
  private closed = false;

  push(event: StreamEvent): void {
    if (this.closed) {
      return;
    }
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(event);
      return;
    }
    this.queue.push(event);
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(null);
    } else {
      this.queue.push(null);
    }
  }

  private async next(): Promise<StreamEvent | null> {
    if (this.queue.length > 0) {
      return this.queue.shift() ?? null;
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  async *allEvents(): AsyncGenerator<StreamEvent, void, unknown> {
    while (true) {
      const event = await this.next();
      if (!event) {
        break;
      }
      yield event;
    }
  }
}

class FakeAgent {
  agentRunId: string;
  messages: AgentInputUserMessage[] = [];
  approvals: Array<{ invocationId: string; approved: boolean; reason: string | null }> = [];
  stopCalls = 0;

  constructor(agentRunId: string) {
    this.agentRunId = agentRunId;
  }

  async postUserMessage(message: AgentInputUserMessage): Promise<void> {
    this.messages.push(message);
  }

  async postToolExecutionApproval(
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ): Promise<void> {
    this.approvals.push({ invocationId, approved, reason: reason ?? null });
  }

  async stop(): Promise<void> {
    this.stopCalls += 1;
  }
}

class FakeAgentManager {
  private agent: FakeAgent;
  private stream: FakeEventStream;

  constructor(agent: FakeAgent, stream: FakeEventStream) {
    this.agent = agent;
    this.stream = stream;
  }

  getAgentRun(agentRunId: string): FakeAgent | null {
    return agentRunId === this.agent.agentRunId ? this.agent : null;
  }

  getAgentEventStream(agentRunId: string): FakeEventStream | null {
    return agentRunId === this.agent.agentRunId ? this.stream : null;
  }
}

const waitForMessage = (socket: WebSocket, timeoutMs: number = 2000): Promise<string> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket message")), timeoutMs);
    socket.once("message", (data) => {
      clearTimeout(timer);
      resolve(data.toString());
    });
  });

const waitForCondition = async (fn: () => boolean, timeoutMs = 2000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fn()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for condition");
};

describe("Agent websocket integration", () => {
  it("streams events and handles client messages", async () => {
    const agent = new FakeAgent("agent-1");
    const stream = new FakeEventStream();
    const manager = new FakeAgentManager(agent, stream);
    const ingress = new RuntimeCommandIngressService(
      new RuntimeSessionStore(),
      new RuntimeAdapterRegistry([
        new AutobyteusRuntimeAdapter(
          manager as unknown as any,
          { getTeamRun: () => null } as any,
        ),
      ]),
    );
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      manager as unknown as any,
      ingress,
    );

    const app = fastify();
    await app.register(websocket);
    const dummyTeamHandler = {
      connect: async () => null,
      handleMessage: async () => {},
      disconnect: async () => {},
    } as unknown as Parameters<typeof registerAgentWebsocket>[2];

    await registerAgentWebsocket(app, handler, dummyTeamHandler);
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const localBaseUrl = `ws://${url.hostname}:${url.port}`;

    const socket = new WebSocket(`${localBaseUrl}/ws/agent/${agent.agentRunId}`);
    const connectedPromise = waitForMessage(socket);

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), 2000);
      socket.once("open", () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });

    const connectedMessage = JSON.parse(await connectedPromise) as {
      type: string;
      payload: { agent_id: string; session_id: string };
    };

    expect(connectedMessage.type).toBe("CONNECTED");
    expect(connectedMessage.payload.agent_id).toBe(agent.agentRunId);

    socket.send(
      JSON.stringify({
        type: "SEND_MESSAGE",
        payload: {
          content: "hello",
          context_file_paths: ["/tmp/note.txt"],
          image_urls: ["https://example.com/cat.png"],
        },
      }),
    );

    await waitForCondition(() => agent.messages.length === 1);
    expect(agent.messages[0].constructor?.name).toBe("AgentInputUserMessage");
    expect(agent.messages[0].content).toBe("hello");
    expect(agent.messages[0].contextFiles?.length).toBe(2);

    socket.send(
      JSON.stringify({
        type: "APPROVE_TOOL",
        payload: { invocation_id: "inv-123", reason: "ok" },
      }),
    );

    await waitForCondition(() => agent.approvals.length === 1);
    expect(agent.approvals[0]).toEqual({ invocationId: "inv-123", approved: true, reason: "ok" });

    socket.send(JSON.stringify({ type: "STOP_GENERATION" }));
    await waitForCondition(() => agent.stopCalls === 1);
    expect(agent.stopCalls).toBe(1);

    const segmentPromise = waitForMessage(socket);
    const event = new StreamEvent({
      event_type: StreamEventType.SEGMENT_EVENT,
      data: {
        event_type: "SEGMENT_START",
        segment_id: "seg-1",
        segment_type: "text",
        payload: { metadata: { foo: "bar" } },
      },
      agent_id: agent.agentRunId,
    });
    stream.push(event);

    const segmentMessage = JSON.parse(await segmentPromise) as {
      type: string;
      payload: { id: string; segment_type?: string; metadata?: unknown };
    };

    expect(segmentMessage.type).toBe("SEGMENT_START");
    expect(segmentMessage.payload.id).toBe("seg-1");
    expect(segmentMessage.payload.segment_type).toBe("text");

    socket.close();
    await app.close();
  });

  it("returns SESSION_NOT_READY when command arrives before connect handshake", async () => {
    const delayedHandler = {
      connect: async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return "session-late";
      },
      handleMessage: async () => {},
      disconnect: async () => {},
    } as unknown as Parameters<typeof registerAgentWebsocket>[1];

    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(
      app,
      delayedHandler,
      {
        connect: async () => null,
        handleMessage: async () => {},
        disconnect: async () => {},
      } as unknown as Parameters<typeof registerAgentWebsocket>[2],
    );

    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/any-agent`);

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), 2000);
      socket.once("open", () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });

    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { content: "too early" } }));
    const earlyResponse = JSON.parse(await waitForMessage(socket)) as {
      type: string;
      payload: { code?: string };
    };

    expect(earlyResponse.type).toBe("ERROR");
    expect(earlyResponse.payload.code).toBe("SESSION_NOT_READY");

    socket.close();
    await app.close();
  });
});
