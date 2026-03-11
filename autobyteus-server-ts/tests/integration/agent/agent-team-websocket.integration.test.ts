import fastify from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it } from "vitest";
import WebSocket from "ws";
import {
  AgentInputUserMessage,
  AgentEventRebroadcastPayload,
  AgentTeamStreamEvent,
  StreamEvent,
  StreamEventType,
} from "autobyteus-ts";
import { AgentTeamStreamHandler } from "../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { TeamStreamBroadcaster } from "../../../src/services/agent-streaming/team-stream-broadcaster.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { RuntimeCommandIngressService } from "../../../src/runtime-execution/runtime-command-ingress-service.js";
import { RuntimeAdapterRegistry } from "../../../src/runtime-execution/runtime-adapter-registry.js";
import { RuntimeSessionStore } from "../../../src/runtime-execution/runtime-session-store.js";
import { AutobyteusRuntimeAdapter } from "../../../src/runtime-execution/adapters/autobyteus-runtime-adapter.js";

class FakeTeamStream {
  private queue: Array<AgentTeamStreamEvent | null> = [];
  private waiters: Array<(value: AgentTeamStreamEvent | null) => void> = [];
  private closed = false;

  push(event: AgentTeamStreamEvent): void {
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

  private async next(): Promise<AgentTeamStreamEvent | null> {
    if (this.queue.length > 0) {
      return this.queue.shift() ?? null;
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  async *allEvents(): AsyncGenerator<AgentTeamStreamEvent, void, unknown> {
    while (true) {
      const event = await this.next();
      if (!event) {
        break;
      }
      yield event;
    }
  }
}

class FakeTeam {
  teamRunId: string;
  messages: AgentInputUserMessage[] = [];
  approvals: Array<{ agentName: string; invocationId: string; approved: boolean; reason: string | null }> = [];
  lastTarget: string | null = null;
  stopCalls = 0;

  constructor(teamRunId: string) {
    this.teamRunId = teamRunId;
  }

  async postMessage(message: AgentInputUserMessage, targetAgentName?: string | null): Promise<void> {
    this.lastTarget = targetAgentName ?? null;
    this.messages.push(message);
  }

  async postToolExecutionApproval(
    agentName: string,
    toolInvocationId: string,
    isApproved: boolean,
    reason?: string | null,
  ): Promise<void> {
    this.approvals.push({
      agentName,
      invocationId: toolInvocationId,
      approved: isApproved,
      reason: reason ?? null,
    });
  }

  async stop(): Promise<void> {
    this.stopCalls += 1;
  }
}

class FakeTeamManager {
  private team: FakeTeam;
  private stream: FakeTeamStream;

  constructor(team: FakeTeam, stream: FakeTeamStream) {
    this.team = team;
    this.stream = stream;
  }

  getTeamRun(teamRunId: string): FakeTeam | null {
    return teamRunId === this.team.teamRunId ? this.team : null;
  }

  getTeamEventStream(teamRunId: string): FakeTeamStream | null {
    return teamRunId === this.team.teamRunId ? this.stream : null;
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

describe("Agent team websocket integration", () => {
  it("streams team events and routes client messages", async () => {
    const team = new FakeTeam("team-1");
    const stream = new FakeTeamStream();
    const manager = new FakeTeamManager(team, stream);
    const sessionStore = new RuntimeSessionStore();
    sessionStore.upsertSession({
      runId: team.teamRunId,
      runtimeKind: "autobyteus",
      mode: "team",
      runtimeReference: {
        runtimeKind: "autobyteus",
        sessionId: team.teamRunId,
        threadId: null,
        metadata: null,
      },
    });
    const ingress = new RuntimeCommandIngressService(
      sessionStore,
      new RuntimeAdapterRegistry([
        new AutobyteusRuntimeAdapter(
          { getAgentRun: () => null } as any,
          manager as unknown as any,
        ),
      ]),
    );
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      manager as unknown as any,
      ingress,
    );

    const dummyAgentHandler = {
      connect: async () => null,
      handleMessage: async () => {},
      disconnect: async () => {},
    } as unknown as Parameters<typeof registerAgentWebsocket>[1];

    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(app, dummyAgentHandler, handler);

    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const baseUrl = `ws://${url.hostname}:${url.port}`;

    const socket = new WebSocket(`${baseUrl}/ws/agent-team/${team.teamRunId}`);
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
      payload: { team_id: string; session_id: string };
    };

    expect(connectedMessage.type).toBe("CONNECTED");
    expect(connectedMessage.payload.team_id).toBe(team.teamRunId);

    socket.send(
      JSON.stringify({
        type: "SEND_MESSAGE",
        payload: {
          content: "hello team",
          target_member_name: "alpha",
          context_file_paths: ["/tmp/info.txt"],
          image_urls: ["https://example.com/dog.png"],
        },
      }),
    );

    await waitForCondition(() => team.messages.length === 1);
    expect(team.messages[0].constructor?.name).toBe("AgentInputUserMessage");
    expect(team.messages[0].content).toBe("hello team");
    expect(team.messages[0].contextFiles?.length).toBe(2);
    expect(team.lastTarget).toBe("alpha");

    socket.send(JSON.stringify({ type: "STOP_GENERATION" }));
    await waitForCondition(() => team.stopCalls === 1);
    expect(team.stopCalls).toBe(1);

    const agentMessagePromise = waitForMessage(socket);
    const agentEvent = new StreamEvent({
      event_type: StreamEventType.SEGMENT_EVENT,
      data: {
        event_type: "SEGMENT_CONTENT",
        segment_id: "seg-alpha-1",
        segment_type: "text",
        payload: { delta: "hi" },
      },
      agent_id: "agent-42",
    });
    const teamEvent = new AgentTeamStreamEvent({
      team_id: team.teamRunId,
      event_source_type: "AGENT",
      data: new AgentEventRebroadcastPayload({ agent_name: "alpha", agent_event: agentEvent }),
    });
    stream.push(teamEvent);

    const agentMessage = JSON.parse(await agentMessagePromise) as {
      type: string;
      payload: {
        id?: string;
        delta?: string;
        segment_type?: string;
        agent_name?: string;
        agent_id?: string;
      };
    };

    expect(agentMessage.type).toBe("SEGMENT_CONTENT");
    expect(agentMessage.payload.delta).toBe("hi");
    expect(agentMessage.payload.segment_type).toBe("text");
    expect(agentMessage.payload.id).toBe("seg-alpha-1");
    expect(agentMessage.payload.agent_name).toBe("alpha");
    expect(agentMessage.payload.agent_id).toBe("agent-42");

    socket.close();
    await app.close();
  });

  it("forwards team-scoped live external user messages over the team websocket", async () => {
    const team = new FakeTeam("team-live-1");
    const stream = new FakeTeamStream();
    const manager = new FakeTeamManager(team, stream);
    const broadcaster = new TeamStreamBroadcaster();
    const sessionStore = new RuntimeSessionStore();
    sessionStore.upsertSession({
      runId: team.teamRunId,
      runtimeKind: "autobyteus",
      mode: "team",
      runtimeReference: {
        runtimeKind: "autobyteus",
        sessionId: team.teamRunId,
        threadId: null,
        metadata: null,
      },
    });
    const ingress = new RuntimeCommandIngressService(
      sessionStore,
      new RuntimeAdapterRegistry([
        new AutobyteusRuntimeAdapter(
          { getAgentRun: () => null } as any,
          manager as unknown as any,
        ),
      ]),
    );
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      manager as unknown as any,
      ingress,
      undefined,
      undefined,
      broadcaster,
    );

    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(
      app,
      {
        connect: async () => null,
        handleMessage: async () => {},
        disconnect: async () => {},
      } as unknown as Parameters<typeof registerAgentWebsocket>[1],
      handler,
    );

    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/${team.teamRunId}`);
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

    await connectedPromise;

    const externalMessagePromise = waitForMessage(socket);
    broadcaster.publishToTeamRun(
      team.teamRunId,
      {
        toJson: () =>
          JSON.stringify({
            type: "EXTERNAL_USER_MESSAGE",
            payload: {
              content: "hello from telegram",
              agent_name: "Professor",
              received_at: "2026-03-10T20:10:00.000Z",
            },
          }),
      } as any,
    );

    const externalMessage = JSON.parse(await externalMessagePromise) as {
      type: string;
      payload: {
        content?: string;
        agent_name?: string;
        received_at?: string;
      };
    };

    expect(externalMessage).toMatchObject({
      type: "EXTERNAL_USER_MESSAGE",
      payload: {
        content: "hello from telegram",
        agent_name: "Professor",
        received_at: "2026-03-10T20:10:00.000Z",
      },
    });

    socket.close();
    await app.close();
  });

  it("returns SESSION_NOT_READY for team command before connect handshake", async () => {
    const delayedTeamHandler = {
      connect: async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return "team-session-late";
      },
      handleMessage: async () => {},
      disconnect: async () => {},
    } as unknown as Parameters<typeof registerAgentWebsocket>[2];

    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(
      app,
      {
        connect: async () => null,
        handleMessage: async () => {},
        disconnect: async () => {},
      } as unknown as Parameters<typeof registerAgentWebsocket>[1],
      delayedTeamHandler,
    );

    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/any-team`);

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

  it("routes approval commands with all personal target identity fields", async () => {
    const team = new FakeTeam("team-approvals");
    const stream = new FakeTeamStream();
    const manager = new FakeTeamManager(team, stream);
    const sessionStore = new RuntimeSessionStore();
    sessionStore.upsertSession({
      runId: team.teamRunId,
      runtimeKind: "autobyteus",
      mode: "team",
      runtimeReference: {
        runtimeKind: "autobyteus",
        sessionId: team.teamRunId,
        threadId: null,
        metadata: null,
      },
    });
    const ingress = new RuntimeCommandIngressService(
      sessionStore,
      new RuntimeAdapterRegistry([
        new AutobyteusRuntimeAdapter(
          { getAgentRun: () => null } as any,
          manager as unknown as any,
        ),
      ]),
    );
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      manager as unknown as any,
      ingress,
    );

    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(
      app,
      {
        connect: async () => null,
        handleMessage: async () => {},
        disconnect: async () => {},
      } as unknown as Parameters<typeof registerAgentWebsocket>[1],
      handler,
    );

    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/${team.teamRunId}`);
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

    await connectedPromise; // CONNECTED

    socket.send(
      JSON.stringify({
        type: "APPROVE_TOOL",
        payload: { invocation_id: "inv-1", agent_name: "alpha" },
      }),
    );
    await waitForCondition(() => team.approvals.length === 1);
    expect(team.approvals[0]).toEqual({
      agentName: "alpha",
      invocationId: "inv-1",
      approved: true,
      reason: null,
    });

    socket.send(
      JSON.stringify({
        type: "DENY_TOOL",
        payload: {
          invocation_id: "inv-2",
          target_member_name: "beta",
          reason: "deny",
        },
      }),
    );
    await waitForCondition(() => team.approvals.length === 2);
    expect(team.approvals[1]).toEqual({
      agentName: "beta",
      invocationId: "inv-2",
      approved: false,
      reason: "deny",
    });

    socket.send(
      JSON.stringify({
        type: "APPROVE_TOOL",
        payload: { invocation_id: "inv-3", agent_id: "member-42" },
      }),
    );
    await waitForCondition(() => team.approvals.length === 3);
    expect(team.approvals[2]).toEqual({
      agentName: "member-42",
      invocationId: "inv-3",
      approved: true,
      reason: null,
    });

    socket.send(
      JSON.stringify({
        type: "APPROVE_TOOL",
        payload: { invocation_id: "inv-4" },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(team.approvals).toHaveLength(3);

    socket.close();
    await app.close();
  });
});
