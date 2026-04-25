import fastify from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it } from "vitest";
import WebSocket from "ws";
import {
  AgentInputUserMessage,
} from "autobyteus-ts";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { AgentTeamStreamHandler } from "../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { TeamStreamBroadcaster } from "../../../src/services/agent-streaming/team-stream-broadcaster.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";

class FakeTeamStream {
  private queue: Array<TeamRunEvent | null> = [];
  private waiters: Array<(value: TeamRunEvent | null) => void> = [];
  private closed = false;

  push(event: TeamRunEvent): void {
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

  private async next(): Promise<TeamRunEvent | null> {
    if (this.queue.length > 0) {
      return this.queue.shift() ?? null;
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  async *allEvents(): AsyncGenerator<TeamRunEvent, void, unknown> {
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

class FakeTeamRun {
  readonly runId: string;
  readonly runtimeKind = "autobyteus";
  readonly context = {
    runtimeContext: {
      memberContexts: [
        {
          memberName: "alpha",
          memberRouteKey: "alpha",
          memberRunId: "member-42",
          getPlatformAgentRunId: () => null,
        },
      ],
    },
  };
  readonly config = {
    memberConfigs: [
      {
        memberName: "alpha",
        memberRunId: "member-42",
      },
    ],
  };

  constructor(
    private readonly team: FakeTeam,
    private readonly stream: FakeTeamStream,
  ) {
    this.runId = team.teamRunId;
  }

  getStatus(): string {
    return "ACTIVE";
  }

  subscribeToEvents(listener: (event: TeamRunEvent) => void): () => void {
    void (async () => {
      for await (const event of this.stream.allEvents()) {
        listener(event);
      }
    })();
    return () => {
      void this.stream.close();
    };
  }

  async postMessage(message: AgentInputUserMessage, targetMemberName?: string | null): Promise<{ accepted: true }> {
    await this.team.postMessage(message, targetMemberName);
    return { accepted: true };
  }

  async approveToolInvocation(
    targetMemberName: string,
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ): Promise<{ accepted: true }> {
    await this.team.postToolExecutionApproval(
      targetMemberName,
      invocationId,
      approved,
      reason,
    );
    return { accepted: true };
  }

  async interrupt(): Promise<{ accepted: true }> {
    await this.team.stop();
    return { accepted: true };
  }
}

class FakeTeamRunService {
  private team: FakeTeam;
  private teamRun: FakeTeamRun;

  constructor(team: FakeTeam, stream: FakeTeamStream) {
    this.team = team;
    this.teamRun = new FakeTeamRun(team, stream);
  }

  getTeamRun(teamRunId: string): FakeTeamRun | null {
    return teamRunId === this.team.teamRunId ? this.teamRun : null;
  }

  async resolveTeamRun(teamRunId: string): Promise<FakeTeamRun | null> {
    return this.getTeamRun(teamRunId);
  }

  async recordRunActivity(): Promise<void> {
    return;
  }

  async refreshRunMetadata(): Promise<void> {
    return;
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

describe("Agent team websocket integration", () => {
  it("streams team events and routes client messages", async () => {
    const team = new FakeTeam("team-1");
    const stream = new FakeTeamStream();
    const teamRunService = new FakeTeamRunService(team, stream);
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      teamRunService as unknown as any,
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

    await waitForOpen(socket);

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
    const agentEvent: AgentRunEvent = {
      runId: "agent-42",
      eventType: AgentRunEventType.SEGMENT_CONTENT,
      payload: {
        id: "seg-alpha-1",
        segment_type: "text",
        delta: "hi",
      },
      statusHint: null,
    };
    const teamEvent: TeamRunEvent = {
      teamRunId: team.teamRunId,
      eventSourceType: TeamRunEventSourceType.AGENT,
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: "alpha",
        memberRunId: "agent-42",
        agentEvent,
      },
    };
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

  it("restores a stopped team on websocket connect and rebinds before member follow-up SEND_MESSAGE", async () => {
    const initialTeam = new FakeTeam("team-recover");
    const restoredTeam = new FakeTeam("team-recover");
    const initialStream = new FakeTeamStream();
    const restoredStream = new FakeTeamStream();
    const initialRun = new FakeTeamRun(initialTeam, initialStream);
    const restoredRun = new FakeTeamRun(restoredTeam, restoredStream);
    const resolvedRuns = [initialRun, restoredRun];
    let resolveCalls = 0;
    const recordActivities: Array<{ runId: string; summary?: string }> = [];
    const teamRunService = {
      getTeamRun: () => null,
      resolveTeamRun: async () => resolvedRuns[resolveCalls++] ?? null,
      recordRunActivity: async (run: { runId: string }, activity: { summary?: string }) => {
        recordActivities.push({ runId: run.runId, summary: activity.summary });
      },
      refreshRunMetadata: async () => {},
    };
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      teamRunService as unknown as any,
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
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/team-recover`);
    const connectedPromise = waitForMessage(socket);

    await waitForOpen(socket);
    const connectedMessage = JSON.parse(await connectedPromise) as {
      type: string;
      payload: { team_id: string };
    };
    expect(connectedMessage.type).toBe("CONNECTED");
    expect(connectedMessage.payload.team_id).toBe("team-recover");

    socket.send(
      JSON.stringify({
        type: "SEND_MESSAGE",
        payload: {
          content: "resume team member after stop",
          target_member_name: "alpha",
        },
      }),
    );

    await waitForCondition(() => restoredTeam.messages.length === 1);
    expect(initialTeam.messages).toHaveLength(0);
    expect(restoredTeam.messages[0].content).toBe("resume team member after stop");
    expect(restoredTeam.lastTarget).toBe("alpha");
    expect(resolveCalls).toBe(2);
    expect(recordActivities).toContainEqual({
      runId: "team-recover",
      summary: "resume team member after stop",
    });

    const segmentPromise = waitForMessage(socket);
    restoredStream.push({
      teamRunId: "team-recover",
      eventSourceType: TeamRunEventSourceType.AGENT,
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: "alpha",
        memberRunId: "member-42",
        agentEvent: {
          runId: "member-42",
          eventType: AgentRunEventType.SEGMENT_CONTENT,
          payload: {
            id: "team-restored-seg-1",
            segment_type: "text",
            delta: "restored team",
          },
          statusHint: null,
        },
      },
    });
    const restoredMessage = JSON.parse(await segmentPromise) as {
      type: string;
      payload: { id?: string; delta?: string; agent_name?: string; agent_id?: string };
    };
    expect(restoredMessage.type).toBe("SEGMENT_CONTENT");
    expect(restoredMessage.payload).toMatchObject({
      id: "team-restored-seg-1",
      delta: "restored team",
      agent_name: "alpha",
      agent_id: "member-42",
    });

    socket.close();
    await app.close();
  });

  it("closes with TEAM_NOT_FOUND when a websocket connect cannot resolve a missing team run", async () => {
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      {
        getTeamRun: () => null,
        resolveTeamRun: async () => null,
        recordRunActivity: async () => {},
        refreshRunMetadata: async () => {},
      } as unknown as any,
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
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/missing-team`);
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
        code: "TEAM_NOT_FOUND",
        message: "Team run 'missing-team' not found",
      },
    });
    await expect(closePromise).resolves.toBe(4004);

    await app.close();
  });

  it("closes with TEAM_NOT_FOUND when follow-up SEND_MESSAGE cannot restore the team run", async () => {
    const team = new FakeTeam("team-send-missing");
    const stream = new FakeTeamStream();
    const initialRun = new FakeTeamRun(team, stream);
    let resolveCalls = 0;
    const teamRunService = {
      getTeamRun: () => null,
      resolveTeamRun: async () => {
        resolveCalls += 1;
        return resolveCalls === 1 ? initialRun : null;
      },
      recordRunActivity: async () => {},
      refreshRunMetadata: async () => {},
    };
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      teamRunService as unknown as any,
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
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/team-send-missing`);
    const connectedPromise = waitForMessage(socket);

    await waitForOpen(socket);
    await connectedPromise;

    const errorPromise = waitForMessage(socket);
    const closePromise = waitForClose(socket);
    socket.send(
      JSON.stringify({
        type: "SEND_MESSAGE",
        payload: { content: "still there?", target_member_name: "alpha" },
      }),
    );

    const errorMessage = JSON.parse(await errorPromise) as {
      type: string;
      payload: { code?: string; message?: string };
    };
    expect(errorMessage).toMatchObject({
      type: "ERROR",
      payload: {
        code: "TEAM_NOT_FOUND",
        message: "Team run 'team-send-missing' not found",
      },
    });
    await expect(closePromise).resolves.toBe(4004);
    expect(team.messages).toHaveLength(0);

    await app.close();
  });

  it("keeps STOP_GENERATION active-only and does not restore a stopped team run", async () => {
    const team = new FakeTeam("team-stop-active-only");
    const stream = new FakeTeamStream();
    const teamRun = new FakeTeamRun(team, stream);
    let resolveCalls = 0;
    const teamRunService = {
      getTeamRun: () => null,
      resolveTeamRun: async () => {
        resolveCalls += 1;
        return teamRun;
      },
      recordRunActivity: async () => {},
      refreshRunMetadata: async () => {},
    };
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      teamRunService as unknown as any,
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
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/team-stop-active-only`);
    const connectedPromise = waitForMessage(socket);

    await waitForOpen(socket);
    await connectedPromise;

    socket.send(JSON.stringify({ type: "STOP_GENERATION" }));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(team.stopCalls).toBe(0);
    expect(resolveCalls).toBe(1);

    socket.close();
    await app.close();
  });

  it("forwards team-scoped live external user messages over the team websocket", async () => {
    const team = new FakeTeam("team-live-1");
    const stream = new FakeTeamStream();
    const teamRunService = new FakeTeamRunService(team, stream);
    const broadcaster = new TeamStreamBroadcaster();
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      teamRunService as unknown as any,
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

    await waitForOpen(socket);

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

  it("routes approval commands with all personal target identity fields", async () => {
    const team = new FakeTeam("team-approvals");
    const stream = new FakeTeamStream();
    const teamRunService = new FakeTeamRunService(team, stream);
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      teamRunService as unknown as any,
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

    await waitForOpen(socket);

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
      agentName: "alpha",
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
