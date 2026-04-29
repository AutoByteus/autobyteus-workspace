import fastify from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it } from "vitest";
import WebSocket from "ws";
import { AgentInputUserMessage } from "autobyteus-ts";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentStreamHandler } from "../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";

class FakeEventStream {
  private queue: Array<AgentRunEvent | null> = [];
  private waiters: Array<(value: AgentRunEvent | null) => void> = [];
  private closed = false;

  push(event: AgentRunEvent): void {
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

  private async next(): Promise<AgentRunEvent | null> {
    if (this.queue.length > 0) {
      return this.queue.shift() ?? null;
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  async *allEvents(): AsyncGenerator<AgentRunEvent, void, unknown> {
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
  private readonly activeRun: {
    runId: string;
    runtimeKind: string;
    getStatus: () => string;
    isActive: () => boolean;
    subscribeToEvents: (listener: (event: unknown) => void) => () => void;
    postUserMessage: (message: AgentInputUserMessage) => Promise<{ accepted: true; runtimeReference: null }>;
    approveToolInvocation: (
      invocationId: string,
      approved: boolean,
      reason?: string | null,
    ) => Promise<{ accepted: true }>;
    interrupt: () => Promise<{ accepted: true }>;
  };

  constructor(agent: FakeAgent, stream: FakeEventStream) {
    this.agent = agent;
    this.stream = stream;
    this.activeRun = {
      runId: this.agent.agentRunId,
      runtimeKind: "autobyteus",
      getStatus: () => "ACTIVE",
      isActive: () => true,
      subscribeToEvents: (listener: (event: unknown) => void) => {
        void (async () => {
          for await (const event of this.stream.allEvents()) {
            listener(event);
          }
        })();
        return () => {
          void this.stream.close();
        };
      },
      postUserMessage: async (message: AgentInputUserMessage) => {
        await this.agent.postUserMessage(message);
        return { accepted: true, runtimeReference: null };
      },
      approveToolInvocation: async (
        invocationId: string,
        approved: boolean,
        reason?: string | null,
      ) => {
        await this.agent.postToolExecutionApproval(invocationId, approved, reason ?? null);
        return { accepted: true };
      },
      interrupt: async () => {
        await this.agent.stop();
        return { accepted: true };
      },
    };
  }

  getActiveRun(agentRunId: string) {
    if (agentRunId !== this.agent.agentRunId) {
      return null;
    }
    return this.activeRun;
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

const waitForClose = (socket: WebSocket, timeoutMs: number = 2000): Promise<number> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket close")), timeoutMs);
    socket.once("close", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });

const waitForOpen = (socket: WebSocket, timeoutMs: number = 2000): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), timeoutMs);
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
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
    const agentRunService = {
      getAgentRun: (runId: string) => manager.getActiveRun(runId),
      resolveAgentRun: async (runId: string) => manager.getActiveRun(runId),
      recordRunActivity: async () => {},
    };
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as unknown as any,
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

    await waitForOpen(socket);

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
    const event: AgentRunEvent = {
      runId: agent.agentRunId,
      eventType: AgentRunEventType.SEGMENT_START,
      payload: {
        id: "seg-1",
        segment_type: "text",
        metadata: { foo: "bar" },
      },
      statusHint: null,
    };
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

  it("restores a stopped run on websocket connect and rebinds before follow-up SEND_MESSAGE", async () => {
    const initialAgent = new FakeAgent("agent-recover");
    const restoredAgent = new FakeAgent("agent-recover");
    const initialStream = new FakeEventStream();
    const restoredStream = new FakeEventStream();
    const initialManager = new FakeAgentManager(initialAgent, initialStream);
    const restoredManager = new FakeAgentManager(restoredAgent, restoredStream);
    const resolvedRuns = [
      initialManager.getActiveRun("agent-recover"),
      restoredManager.getActiveRun("agent-recover"),
    ];
    let resolveCalls = 0;
    const recordActivities: Array<{ runId: string; summary?: string }> = [];
    const agentRunService = {
      getAgentRun: () => null,
      resolveAgentRun: async () => resolvedRuns[resolveCalls++] ?? null,
      recordRunActivity: async (run: { runId: string }, activity: { summary?: string }) => {
        recordActivities.push({ runId: run.runId, summary: activity.summary });
      },
    };
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as unknown as any,
    );

    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(
      app,
      handler,
      {
        connect: async () => null,
        handleMessage: async () => {},
        disconnect: async () => {},
      } as unknown as Parameters<typeof registerAgentWebsocket>[2],
    );
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/agent-recover`);
    const connectedPromise = waitForMessage(socket);

    await waitForOpen(socket);
    const connectedMessage = JSON.parse(await connectedPromise) as {
      type: string;
      payload: { agent_id: string };
    };
    expect(connectedMessage.type).toBe("CONNECTED");
    expect(connectedMessage.payload.agent_id).toBe("agent-recover");

    socket.send(
      JSON.stringify({
        type: "SEND_MESSAGE",
        payload: {
          content: "resume agent after stop",
        },
      }),
    );

    await waitForCondition(() => restoredAgent.messages.length === 1);
    expect(initialAgent.messages).toHaveLength(0);
    expect(restoredAgent.messages[0].content).toBe("resume agent after stop");
    expect(resolveCalls).toBe(2);
    expect(recordActivities).toContainEqual({
      runId: "agent-recover",
      summary: "resume agent after stop",
    });

    const segmentPromise = waitForMessage(socket);
    restoredStream.push({
      runId: "agent-recover",
      eventType: AgentRunEventType.SEGMENT_CONTENT,
      payload: {
        id: "restored-seg-1",
        segment_type: "text",
        delta: "restored",
      },
      statusHint: null,
    });
    const restoredMessage = JSON.parse(await segmentPromise) as {
      type: string;
      payload: { id?: string; delta?: string };
    };
    expect(restoredMessage.type).toBe("SEGMENT_CONTENT");
    expect(restoredMessage.payload).toMatchObject({
      id: "restored-seg-1",
      delta: "restored",
    });

    socket.close();
    await app.close();
  });

  it("closes with AGENT_NOT_FOUND when a websocket connect cannot resolve a missing run", async () => {
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      {
        getAgentRun: () => null,
        resolveAgentRun: async () => null,
        recordRunActivity: async () => {},
      } as unknown as any,
    );

    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(
      app,
      handler,
      {
        connect: async () => null,
        handleMessage: async () => {},
        disconnect: async () => {},
      } as unknown as Parameters<typeof registerAgentWebsocket>[2],
    );
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/missing-agent`);
    const errorPromise = waitForMessage(socket);
    const closePromise = waitForClose(socket);

    await waitForOpen(socket);
    const errorMessage = JSON.parse(await errorPromise) as {
      type: string;
      payload: { code?: string; message?: string };
    };
    expect(errorMessage).toMatchObject({
      type: "ERROR",
      payload: {
        code: "AGENT_NOT_FOUND",
        message: "Agent run 'missing-agent' not found",
      },
    });
    await expect(closePromise).resolves.toBe(4004);

    await app.close();
  });

  it("closes with AGENT_NOT_FOUND when follow-up SEND_MESSAGE cannot restore the run", async () => {
    const agent = new FakeAgent("agent-send-missing");
    const stream = new FakeEventStream();
    const manager = new FakeAgentManager(agent, stream);
    let resolveCalls = 0;
    const agentRunService = {
      getAgentRun: () => null,
      resolveAgentRun: async () => {
        resolveCalls += 1;
        return resolveCalls === 1 ? manager.getActiveRun("agent-send-missing") : null;
      },
      recordRunActivity: async () => {},
    };
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as unknown as any,
    );

    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(
      app,
      handler,
      {
        connect: async () => null,
        handleMessage: async () => {},
        disconnect: async () => {},
      } as unknown as Parameters<typeof registerAgentWebsocket>[2],
    );
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/agent-send-missing`);
    const connectedPromise = waitForMessage(socket);

    await waitForOpen(socket);
    await connectedPromise;

    const errorPromise = waitForMessage(socket);
    const closePromise = waitForClose(socket);
    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { content: "still there?" } }));

    const errorMessage = JSON.parse(await errorPromise) as {
      type: string;
      payload: { code?: string; message?: string };
    };
    expect(errorMessage).toMatchObject({
      type: "ERROR",
      payload: {
        code: "AGENT_NOT_FOUND",
        message: "Agent run 'agent-send-missing' not found",
      },
    });
    await expect(closePromise).resolves.toBe(4004);
    expect(agent.messages).toHaveLength(0);

    await app.close();
  });

  it("keeps STOP_GENERATION active-only and does not restore a stopped run", async () => {
    const agent = new FakeAgent("agent-stop-active-only");
    const stream = new FakeEventStream();
    const manager = new FakeAgentManager(agent, stream);
    let resolveCalls = 0;
    const agentRunService = {
      getAgentRun: () => null,
      resolveAgentRun: async () => {
        resolveCalls += 1;
        return manager.getActiveRun("agent-stop-active-only");
      },
      recordRunActivity: async () => {},
    };
    const handler = new AgentStreamHandler(
      new AgentSessionManager(),
      agentRunService as unknown as any,
    );

    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(
      app,
      handler,
      {
        connect: async () => null,
        handleMessage: async () => {},
        disconnect: async () => {},
      } as unknown as Parameters<typeof registerAgentWebsocket>[2],
    );
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/agent-stop-active-only`);
    const connectedPromise = waitForMessage(socket);

    await waitForOpen(socket);
    await connectedPromise;

    socket.send(JSON.stringify({ type: "STOP_GENERATION" }));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(agent.stopCalls).toBe(0);
    expect(resolveCalls).toBe(1);

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

    await waitForOpen(socket);

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
