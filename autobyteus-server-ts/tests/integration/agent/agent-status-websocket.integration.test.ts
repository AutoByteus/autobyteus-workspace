import fastify from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it } from "vitest";
import WebSocket from "ws";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentApiStatus } from "../../../src/agent-execution/domain/agent-status-payload.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { AgentStreamHandler } from "../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentTeamStreamHandler } from "../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

type StatusPayload = {
  status: AgentApiStatus;
  can_interrupt: boolean;
  agent_id?: string;
  agent_name?: string;
  member_route_key?: string;
  member_path?: string[];
  source_route_key?: string;
  source_path?: string[];
};

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

class FakeAgentEventStream {
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

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(null);
      return;
    }
    this.queue.push(null);
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

class FakeTeamEventStream {
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

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(null);
      return;
    }
    this.queue.push(null);
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

class FakeAgentRun {
  readonly isActive = () => true;

  constructor(
    readonly runId: string,
    readonly runtimeKind: RuntimeKind,
    private readonly stream: FakeAgentEventStream,
    private readonly snapshot: StatusPayload,
  ) {}

  getStatusSnapshot(): StatusPayload {
    return this.snapshot;
  }

  subscribeToEvents(listener: (event: AgentRunEvent) => void): () => void {
    void (async () => {
      for await (const event of this.stream.allEvents()) {
        listener(event);
      }
    })();
    return () => this.stream.close();
  }

  async postUserMessage(): Promise<{ accepted: true; runtimeReference: null }> {
    return { accepted: true, runtimeReference: null };
  }

  async approveToolInvocation(): Promise<{ accepted: true }> {
    return { accepted: true };
  }

  async interrupt(): Promise<{ accepted: true }> {
    return { accepted: true };
  }
}

class FakeTeamRun {
  readonly runId = "team-status-1";
  readonly runtimeKind = RuntimeKind.AUTOBYTEUS;
  readonly context = {
    runtimeContext: {
      memberContexts: [
        {
          memberName: "writer",
          memberRouteKey: "writer",
          memberRunId: "member-writer-1",
          getPlatformAgentRunId: () => null,
        },
        {
          memberName: "reviewer",
          memberRouteKey: "reviewer",
          memberRunId: "member-reviewer-1",
          getPlatformAgentRunId: () => null,
        },
      ],
    },
  };
  readonly config = {
    memberConfigs: [
      { memberName: "writer", memberRunId: "member-writer-1" },
      { memberName: "reviewer", memberRunId: "member-reviewer-1" },
    ],
  };

  constructor(
    private readonly stream: FakeTeamEventStream,
    private readonly options: {
      teamStatus?: AgentApiStatus;
      memberStatuses?: StatusPayload[];
    } = {},
  ) {}

  getStatusSnapshot() {
    return { status: this.options.teamStatus ?? "running" };
  }

  getMemberStatusSnapshots(): StatusPayload[] {
    return this.options.memberStatuses ?? [
      {
        status: "running",
        can_interrupt: true,
        agent_id: "member-writer-1",
        agent_name: "writer",
        member_route_key: "writer",
        member_path: ["writer"],
        source_route_key: "writer",
        source_path: ["writer"],
      },
      {
        status: "idle",
        can_interrupt: false,
        agent_id: "member-reviewer-1",
        agent_name: "reviewer",
        member_route_key: "reviewer",
        member_path: ["reviewer"],
        source_route_key: "reviewer",
        source_path: ["reviewer"],
      },
    ];
  }

  subscribeToEvents(listener: (event: TeamRunEvent) => void): () => void {
    void (async () => {
      for await (const event of this.stream.allEvents()) {
        listener(event);
      }
    })();
    return () => this.stream.close();
  }

  async postMessage(): Promise<{ accepted: true }> {
    return { accepted: true };
  }

  async approveToolInvocation(): Promise<{ accepted: true }> {
    return { accepted: true };
  }

  async interrupt(): Promise<{ accepted: true }> {
    return { accepted: true };
  }
}

const waitForOpen = (socket: WebSocket, timeoutMs = 2_000): Promise<void> =>
  new Promise((resolve, reject) => {
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

const captureMessages = (socket: WebSocket): WsMessage[] => {
  const messages: WsMessage[] = [];
  socket.on("message", (data) => {
    messages.push(JSON.parse(data.toString()) as WsMessage);
  });
  return messages;
};

const waitForBufferedMessage = async (
  messages: WsMessage[],
  index: number,
  timeoutMs = 2_000,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const message = messages[index];
    if (message) {
      return message;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for websocket message at index ${String(index)}`);
};

const expectNoLegacyStatusFields = (payload: Record<string, unknown>) => {
  expect(payload).not.toHaveProperty("new_status");
  expect(payload).not.toHaveProperty("old_status");
};

const openAgentApp = async (run: FakeAgentRun) => {
  const streamHandler = new AgentStreamHandler(
    new AgentSessionManager(),
    {
      getAgentRun: (runId: string) => (runId === run.runId ? run : null),
      resolveAgentRun: async (runId: string) => (runId === run.runId ? run : null),
      recordRunActivity: async () => {},
    } as any,
  );
  const app = fastify();
  await app.register(websocket);
  await registerAgentWebsocket(
    app,
    streamHandler,
    {
      connect: async () => null,
      handleMessage: async () => {},
      disconnect: async () => {},
    } as any,
  );
  const address = await app.listen({ port: 0, host: "127.0.0.1" });
  const url = new URL(address);
  return { app, baseUrl: `ws://${url.hostname}:${url.port}` };
};

describe("Agent status websocket contract integration", () => {
  const runtimeCases = [
    RuntimeKind.AUTOBYTEUS,
    RuntimeKind.CODEX_APP_SERVER,
    RuntimeKind.CLAUDE_AGENT_SDK,
  ] as const;

  it.each(runtimeCases)(
    "sends an idle %s single-agent status snapshot on reconnect without legacy fields",
    async (runtimeKind) => {
      const stream = new FakeAgentEventStream();
      const run = new FakeAgentRun(
        `run-${runtimeKind}`,
        runtimeKind,
        stream,
        { status: "idle", can_interrupt: false },
      );
      const { app, baseUrl } = await openAgentApp(run);
      const socket = new WebSocket(`${baseUrl}/ws/agent/${run.runId}`);
      const messages = captureMessages(socket);
      try {
        await waitForOpen(socket);

        const connected = await waitForBufferedMessage(messages, 0);
        expect(connected).toMatchObject({
          type: "CONNECTED",
          payload: { agent_id: run.runId },
        });

        const status = await waitForBufferedMessage(messages, 1);
        expect(status).toEqual({
          type: "AGENT_STATUS",
          payload: { status: "idle", can_interrupt: false },
        });
        expectNoLegacyStatusFields(status.payload);
      } finally {
        socket.close();
        await app.close();
      }
    },
  );

  it.each(runtimeCases)(
    "normalizes live %s AGENT_STATUS payloads over the real websocket",
    async (runtimeKind) => {
      const stream = new FakeAgentEventStream();
      const run = new FakeAgentRun(
        `live-${runtimeKind}`,
        runtimeKind,
        stream,
        { status: "running", can_interrupt: true },
      );
      const { app, baseUrl } = await openAgentApp(run);
      const socket = new WebSocket(`${baseUrl}/ws/agent/${run.runId}`);
      const messages = captureMessages(socket);
      let cursor = 0;
      try {
        await waitForOpen(socket);
        await waitForBufferedMessage(messages, cursor++); // CONNECTED
        await waitForBufferedMessage(messages, cursor++); // initial AGENT_STATUS

        stream.push({
          runId: run.runId,
          eventType: AgentRunEventType.AGENT_STATUS,
          payload: { status: "RUNNING", can_interrupt: true },
          statusHint: "ACTIVE",
        });
        const running = await waitForBufferedMessage(messages, cursor++);
        expect(running).toEqual({
          type: "AGENT_STATUS",
          payload: { status: "running", can_interrupt: true },
        });
        expectNoLegacyStatusFields(running.payload);

        stream.push({
          runId: run.runId,
          eventType: AgentRunEventType.TURN_COMPLETED,
          payload: { turn_id: "turn-1" },
          statusHint: "IDLE",
        });
        stream.push({
          runId: run.runId,
          eventType: AgentRunEventType.AGENT_STATUS,
          payload: { status: "IDLE", can_interrupt: false },
          statusHint: "IDLE",
        });

        const completed = await waitForBufferedMessage(messages, cursor++);
        expect(completed).toMatchObject({
          type: "TURN_COMPLETED",
          payload: { turn_id: "turn-1" },
        });
        const idle = await waitForBufferedMessage(messages, cursor++);
        expect(idle).toEqual({
          type: "AGENT_STATUS",
          payload: { status: "idle", can_interrupt: false },
        });
        expectNoLegacyStatusFields(idle.payload);
      } finally {
        socket.close();
        await app.close();
      }
    },
  );

  it("carries initializing single-agent snapshots and normalizes startup live status over the real websocket", async () => {
    const stream = new FakeAgentEventStream();
    const run = new FakeAgentRun(
      "single-initializing-1",
      RuntimeKind.AUTOBYTEUS,
      stream,
      { status: "initializing", can_interrupt: false },
    );
    const { app, baseUrl } = await openAgentApp(run);
    const socket = new WebSocket(`${baseUrl}/ws/agent/${run.runId}`);
    const messages = captureMessages(socket);
    let cursor = 0;
    try {
      await waitForOpen(socket);
      await waitForBufferedMessage(messages, cursor++); // CONNECTED

      const snapshot = await waitForBufferedMessage(messages, cursor++);
      expect(snapshot).toEqual({
        type: "AGENT_STATUS",
        payload: { status: "initializing", can_interrupt: false },
      });
      expectNoLegacyStatusFields(snapshot.payload);

      stream.push({
        runId: run.runId,
        eventType: AgentRunEventType.AGENT_STATUS,
        payload: { status: "initializing", can_interrupt: true },
        statusHint: null,
      });

      const liveInitializing = await waitForBufferedMessage(messages, cursor++);
      expect(liveInitializing).toEqual({
        type: "AGENT_STATUS",
        payload: { status: "initializing", can_interrupt: false },
      });
      expectNoLegacyStatusFields(liveInitializing.payload);
    } finally {
      socket.close();
      await app.close();
    }
  });

  it("sends team member AGENT_STATUS snapshots before aggregate TEAM_STATUS without legacy fields", async () => {
    const stream = new FakeTeamEventStream();
    const teamRun = new FakeTeamRun(stream);
    const teamHandler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      {
        getTeamRun: (teamRunId: string) => (teamRunId === teamRun.runId ? teamRun : null),
        resolveTeamRun: async (teamRunId: string) => (teamRunId === teamRun.runId ? teamRun : null),
        recordRunActivity: async () => {},
        refreshRunMetadata: async () => {},
      } as any,
    );
    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(
      app,
      {
        connect: async () => null,
        handleMessage: async () => {},
        disconnect: async () => {},
      } as any,
      teamHandler,
    );
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/${teamRun.runId}`);
    const messages = captureMessages(socket);
    let cursor = 0;
    try {
      await waitForOpen(socket);

      const connected = await waitForBufferedMessage(messages, cursor++);
      expect(connected).toMatchObject({
        type: "CONNECTED",
        payload: { team_id: teamRun.runId },
      });

      const writerStatus = await waitForBufferedMessage(messages, cursor++);
      expect(writerStatus).toEqual({
        type: "AGENT_STATUS",
        payload: {
          status: "running",
          can_interrupt: true,
          agent_id: "member-writer-1",
          agent_name: "writer",
          member_route_key: "writer",
          member_path: ["writer"],
          source_route_key: "writer",
          source_path: ["writer"],
        },
      });
      expectNoLegacyStatusFields(writerStatus.payload);

      const reviewerStatus = await waitForBufferedMessage(messages, cursor++);
      expect(reviewerStatus).toEqual({
        type: "AGENT_STATUS",
        payload: {
          status: "idle",
          can_interrupt: false,
          agent_id: "member-reviewer-1",
          agent_name: "reviewer",
          member_route_key: "reviewer",
          member_path: ["reviewer"],
          source_route_key: "reviewer",
          source_path: ["reviewer"],
        },
      });
      expectNoLegacyStatusFields(reviewerStatus.payload);

      const teamStatus = await waitForBufferedMessage(messages, cursor++);
      expect(teamStatus).toEqual({
        type: "TEAM_STATUS",
        payload: { status: "running", source_path: [] },
      });
      expect(teamStatus.payload).not.toHaveProperty("can_interrupt");
      expectNoLegacyStatusFields(teamStatus.payload);

      stream.push({
        teamRunId: teamRun.runId,
        eventSourceType: TeamRunEventSourceType.TEAM,
        data: { status: "error" },
      });
      const liveTeamStatus = await waitForBufferedMessage(messages, cursor++);
      expect(liveTeamStatus).toEqual({
        type: "TEAM_STATUS",
        payload: { status: "error", source_path: [] },
      });
      expect(liveTeamStatus.payload).not.toHaveProperty("can_interrupt");
      expectNoLegacyStatusFields(liveTeamStatus.payload);
    } finally {
      socket.close();
      await app.close();
    }
  });

  it("carries initializing team member and aggregate statuses over the real websocket", async () => {
    const stream = new FakeTeamEventStream();
    const teamRun = new FakeTeamRun(stream, {
      teamStatus: "initializing",
      memberStatuses: [
        {
          status: "initializing",
          can_interrupt: false,
          agent_id: "member-writer-1",
          agent_name: "writer",
          member_route_key: "writer",
          member_path: ["writer"],
          source_route_key: "writer",
          source_path: ["writer"],
        },
        {
          status: "offline",
          can_interrupt: false,
          agent_id: "member-reviewer-1",
          agent_name: "reviewer",
          member_route_key: "reviewer",
          member_path: ["reviewer"],
          source_route_key: "reviewer",
          source_path: ["reviewer"],
        },
      ],
    });
    const teamHandler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      {
        getTeamRun: (teamRunId: string) => (teamRunId === teamRun.runId ? teamRun : null),
        resolveTeamRun: async (teamRunId: string) => (teamRunId === teamRun.runId ? teamRun : null),
        recordRunActivity: async () => {},
        refreshRunMetadata: async () => {},
      } as any,
    );
    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(
      app,
      {
        connect: async () => null,
        handleMessage: async () => {},
        disconnect: async () => {},
      } as any,
      teamHandler,
    );
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/${teamRun.runId}`);
    const messages = captureMessages(socket);
    let cursor = 0;
    try {
      await waitForOpen(socket);
      await waitForBufferedMessage(messages, cursor++); // CONNECTED

      const writerStatus = await waitForBufferedMessage(messages, cursor++);
      expect(writerStatus).toEqual({
        type: "AGENT_STATUS",
        payload: {
          status: "initializing",
          can_interrupt: false,
          agent_id: "member-writer-1",
          agent_name: "writer",
          member_route_key: "writer",
          member_path: ["writer"],
          source_route_key: "writer",
          source_path: ["writer"],
        },
      });
      expectNoLegacyStatusFields(writerStatus.payload);

      const reviewerStatus = await waitForBufferedMessage(messages, cursor++);
      expect(reviewerStatus).toEqual({
        type: "AGENT_STATUS",
        payload: {
          status: "offline",
          can_interrupt: false,
          agent_id: "member-reviewer-1",
          agent_name: "reviewer",
          member_route_key: "reviewer",
          member_path: ["reviewer"],
          source_route_key: "reviewer",
          source_path: ["reviewer"],
        },
      });
      expectNoLegacyStatusFields(reviewerStatus.payload);

      const teamSnapshot = await waitForBufferedMessage(messages, cursor++);
      expect(teamSnapshot).toEqual({
        type: "TEAM_STATUS",
        payload: { status: "initializing", source_path: [] },
      });
      expectNoLegacyStatusFields(teamSnapshot.payload);

      stream.push({
        teamRunId: teamRun.runId,
        eventSourceType: TeamRunEventSourceType.AGENT,
        sourcePath: ["reviewer"],
        data: {
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          memberName: "reviewer",
          memberRunId: "member-reviewer-1",
          memberPath: ["reviewer"],
          memberRouteKey: "reviewer",
          agentEvent: {
            runId: "member-reviewer-1",
            eventType: AgentRunEventType.AGENT_STATUS,
            payload: { status: "initializing", can_interrupt: true },
            statusHint: null,
          },
        },
      });

      const liveMemberInitializing = await waitForBufferedMessage(messages, cursor++);
      expect(liveMemberInitializing).toEqual({
        type: "AGENT_STATUS",
        payload: {
          status: "initializing",
          can_interrupt: false,
          agent_name: "reviewer",
          agent_id: "member-reviewer-1",
          member_route_key: "reviewer",
          member_path: ["reviewer"],
          source_route_key: "reviewer",
          source_path: ["reviewer"],
        },
      });
      expectNoLegacyStatusFields(liveMemberInitializing.payload);

      stream.push({
        teamRunId: teamRun.runId,
        eventSourceType: TeamRunEventSourceType.TEAM,
        sourcePath: [],
        data: { status: "initializing" },
      });

      const liveTeamInitializing = await waitForBufferedMessage(messages, cursor++);
      expect(liveTeamInitializing).toEqual({
        type: "TEAM_STATUS",
        payload: { status: "initializing", source_path: [] },
      });
      expectNoLegacyStatusFields(liveTeamInitializing.payload);
    } finally {
      socket.close();
      await app.close();
    }
  });
});
