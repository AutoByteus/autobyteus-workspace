import fastify from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type {
  AgentRunBackend,
  AgentRunSourceEventBatchListener,
} from "../../../src/agent-execution/backends/agent-run-backend.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../src/agent-execution/domain/agent-runtime-lifecycle-snapshot.js";
import {
  buildOrdinaryTeamLeafAgentStatusSnapshot,
  type TeamLeafAgentStatusSnapshot,
} from "../../../src/agent-team-execution/domain/team-leaf-agent-status-snapshot.js";
import type { TaskTeamInstanceIdentity } from "../../../src/agent-team-execution/domain/task-team-instance.js";
import { buildTaskTeamStreamScope } from "../../../src/agent-team-execution/domain/task-team-stream-scope.js";
import type { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import {
  prefixMixedSubTeamEvent,
  prefixMixedTeamLeafAgentStatusSnapshot,
} from "../../../src/agent-team-execution/backends/mixed/events/mixed-team-event-bridge.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { AgentTeamStreamHandler } from "../../../src/services/agent-streaming/agent-team-stream-handler.js";

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

const ROOT_TEAM_RUN_ID = "root-team-1";
const ORDINARY_TEAM_RUN_ID = "research-run-2";
const TASK_TEAM_RUN_ID = "task-team-run-7";
const MEMBER_RUN_ID = "critic-runtime-93";
const ROOT_MEMBER_PATH = [
  "research_group",
  "review_team",
  "review_group",
  "critic",
];

const idleSnapshot = (): AgentRuntimeLifecycleSnapshot => ({
  availability: "active",
  phase: "idle",
  currentTurn: { kind: "NONE" },
});

const runningSnapshot = (turnId: string): AgentRuntimeLifecycleSnapshot => ({
  availability: "active",
  phase: "running",
  currentTurn: { kind: "IDENTIFIED", turnId },
});

const event = (
  eventType: AgentRunEventType,
  payload: Record<string, unknown>,
): AgentRunEvent => ({
  runId: MEMBER_RUN_ID,
  eventType,
  payload,
  statusHint: null,
});

class ScriptedMemberBackend implements AgentRunBackend {
  readonly runId = MEMBER_RUN_ID;
  readonly runtimeKind = RuntimeKind.CODEX_APP_SERVER;
  readonly context = new AgentRunContext({
    runId: this.runId,
    config: new AgentRunConfig({
      runtimeKind: this.runtimeKind,
      agentDefinitionId: "critic-agent",
      llmModelIdentifier: "codex-test",
      autoExecuteTools: true,
      workspaceId: null,
      memoryDir: null,
      llmConfig: null,
      skillAccessMode: SkillAccessMode.NONE,
    }),
    runtimeContext: null,
  });
  private lifecycleSnapshot: AgentRuntimeLifecycleSnapshot = idleSnapshot();
  private readonly sourceListeners = new Set<AgentRunSourceEventBatchListener>();

  getContext(): AgentRunContext<null> {
    return this.context;
  }

  isActive(): boolean {
    return true;
  }

  getPlatformAgentRunId(): string {
    return `platform-${this.runId}`;
  }

  getLifecycleSnapshot(): AgentRuntimeLifecycleSnapshot {
    return this.lifecycleSnapshot;
  }

  subscribeToSourceEventBatches(listener: AgentRunSourceEventBatchListener): () => void {
    this.sourceListeners.add(listener);
    return () => this.sourceListeners.delete(listener);
  }

  async postUserMessage(): Promise<{ accepted: true }> {
    return { accepted: true };
  }

  async approveToolInvocation(): Promise<{ accepted: true }> {
    return { accepted: true };
  }

  async interrupt(): Promise<{ accepted: true }> {
    return { accepted: true };
  }

  async terminate(): Promise<{ accepted: true }> {
    return { accepted: true };
  }

  setLifecycleSnapshot(snapshot: AgentRuntimeLifecycleSnapshot): void {
    this.lifecycleSnapshot = snapshot;
  }

  async emitSource(events: readonly AgentRunEvent[]): Promise<void> {
    for (const listener of this.sourceListeners) {
      await listener(events);
    }
  }
}

const operationalTaskTeamIdentity = (): TaskTeamInstanceIdentity => ({
  taskTeamRunId: TASK_TEAM_RUN_ID,
  taskTeamInstanceId: "task-team-instance-7",
  parentTeamRunId: ORDINARY_TEAM_RUN_ID,
  taskId: "task-42",
  logicalTeam: {
    memberName: "review_team",
    memberPath: ["review_team"],
    memberRouteKey: "review_team",
    templateMemberRunId: "review-team-template",
    teamDefinitionId: "review-team-definition",
    coordinatorMemberRouteKey: "review_group/lead",
  },
  ingress: {
    memberName: "critic",
    memberPath: ["review_group", "critic"],
    memberRouteKey: "review_group/critic",
    memberRunId: MEMBER_RUN_ID,
  },
  createdAt: "2026-08-02T00:00:00.000Z",
});

const scopeSnapshotToRoot = (memberRun: AgentRun): TeamLeafAgentStatusSnapshot => {
  const local = buildOrdinaryTeamLeafAgentStatusSnapshot({
    teamRunId: TASK_TEAM_RUN_ID,
    payload: {
      ...memberRun.getStatusSnapshot(),
      agent_id: MEMBER_RUN_ID,
      agent_name: "critic",
      member_path: ["review_group", "critic"],
      member_route_key: "review_group/critic",
      source_path: ["review_group", "critic"],
      source_route_key: "review_group/critic",
    },
  });
  const taskTeamScope = buildTaskTeamStreamScope({
    taskTeamInstance: operationalTaskTeamIdentity(),
    parentTeamRunId: ORDINARY_TEAM_RUN_ID,
  });
  const ordinaryFrame = prefixMixedTeamLeafAgentStatusSnapshot({
    parentTeamRunId: ORDINARY_TEAM_RUN_ID,
    sourcePrefix: ["review_team"],
    snapshot: local,
    taskTeamScopeOverride: taskTeamScope,
  });
  return prefixMixedTeamLeafAgentStatusSnapshot({
    parentTeamRunId: ROOT_TEAM_RUN_ID,
    sourcePrefix: ["research_group"],
    snapshot: ordinaryFrame,
  });
};

const scopeEventToRoot = (agentEvent: AgentRunEvent): TeamRunEvent => {
  const local: TeamRunEvent = {
    teamRunId: TASK_TEAM_RUN_ID,
    eventSourceType: TeamRunEventSourceType.AGENT,
    sourcePath: ["review_group", "critic"],
    data: {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberName: "critic",
      memberRunId: MEMBER_RUN_ID,
      memberPath: ["review_group", "critic"],
      memberRouteKey: "review_group/critic",
      agentEvent,
    },
  };
  const taskTeamScope = buildTaskTeamStreamScope({
    taskTeamInstance: operationalTaskTeamIdentity(),
    parentTeamRunId: ORDINARY_TEAM_RUN_ID,
  });
  const ordinaryFrame = prefixMixedSubTeamEvent({
    parentTeamRunId: ORDINARY_TEAM_RUN_ID,
    sourcePrefix: ["review_team"],
    event: local,
    taskTeamScopeOverride: taskTeamScope,
  });
  return prefixMixedSubTeamEvent({
    parentTeamRunId: ROOT_TEAM_RUN_ID,
    sourcePrefix: ["research_group"],
    event: ordinaryFrame,
  });
};

class ScopedRootTeamRun {
  readonly runId = ROOT_TEAM_RUN_ID;
  readonly runtimeKind = RuntimeKind.AUTOBYTEUS;
  readonly context = { runtimeContext: { memberContexts: [] } };
  readonly config = { memberConfigs: [] };
  readonly interruptMember = vi.fn(async () => ({ accepted: true as const }));
  private active = true;
  private terminationAccepted = false;
  private readonly listeners = new Set<TeamRunEventListener>();

  constructor(readonly memberRun: AgentRun) {
    memberRun.subscribeToEvents((agentEvent) => {
      const rootEvent = scopeEventToRoot(agentEvent);
      for (const listener of this.listeners) {
        listener(rootEvent);
      }
    });
  }

  isActive(): boolean {
    return this.active;
  }

  getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[] {
    return [scopeSnapshotToRoot(this.memberRun)];
  }

  subscribeToEvents(listener: TeamRunEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setTerminationAccepted(accepted: boolean): void {
    this.terminationAccepted = accepted;
  }

  async terminate(): Promise<{ accepted: boolean }> {
    if (!this.terminationAccepted) {
      return { accepted: false };
    }
    this.active = false;
    // Root manager lifecycle delivery must remain observable after the backend
    // event source has already torn down its listeners.
    this.listeners.clear();
    return { accepted: true };
  }

  async postMessageToConversationTarget(): Promise<{ accepted: true }> {
    return { accepted: true };
  }

  async approveToolInvocation(): Promise<{ accepted: true }> {
    return { accepted: true };
  }
}

const createManager = () => new AgentTeamRunManager({
  mixedTeamRunBackendFactory: {} as never,
  teamCommunicationService: { attachToTeamRun: vi.fn(() => vi.fn()) } as never,
  runFileChangeService: { attachToTeamRun: vi.fn(() => vi.fn()) } as never,
});

const registerRun = (manager: AgentTeamRunManager, teamRun: TeamRun): void => {
  (manager as unknown as { registerActiveRun: (run: TeamRun) => void })
    .registerActiveRun(teamRun);
};

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const waitForSocketClose = (socket: WebSocket): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for websocket close")),
      2_000,
    );
    socket.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
  });

const captureMessages = (socket: WebSocket): WsMessage[] => {
  const messages: WsMessage[] = [];
  socket.on("message", (data) => messages.push(JSON.parse(data.toString()) as WsMessage));
  return messages;
};

const openSocket = async (url: string): Promise<{ socket: WebSocket; messages: WsMessage[] }> => {
  const socket = new WebSocket(url);
  const messages = captureMessages(socket);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), 2_000);
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  return { socket, messages };
};

const waitForMessageCount = async (messages: WsMessage[], count: number): Promise<void> => {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if (messages.length >= count) return;
    await wait(10);
  }
  throw new Error(`Expected ${String(count)} messages, received ${JSON.stringify(messages)}`);
};

const expectScopedLeafIdentity = (payload: Record<string, unknown>): void => {
  expect(payload).toMatchObject({
    agent_id: MEMBER_RUN_ID,
    agent_name: "critic",
    member_path: ROOT_MEMBER_PATH,
    member_route_key: ROOT_MEMBER_PATH.join("/"),
    source_path: ROOT_MEMBER_PATH,
    source_route_key: ROOT_MEMBER_PATH.join("/"),
    task_team_run_id: TASK_TEAM_RUN_ID,
    task_team_instance_id: "task-team-instance-7",
    task_id: "task-42",
    team_path: ["research_group", "review_team"],
    team_route_key: "research_group/review_team",
    task_team_relative_member_path: ["review_group", "critic"],
    task_team_relative_member_route_key: "review_group/critic",
  });
};

describe("Team lifecycle and nested task-team WebSocket integration", () => {
  it("keeps binary root liveness separate while live/reconnect map the same exact scoped leaf", async () => {
    const backend = new ScriptedMemberBackend();
    const memberRun = new AgentRun({ context: backend.context, backend });
    const teamRun = new ScopedRootTeamRun(memberRun);
    const manager = createManager();
    registerRun(manager, teamRun as unknown as TeamRun);

    const teamRunService = {
      getTeamRun: vi.fn(() => manager.getActiveRun(ROOT_TEAM_RUN_ID)),
      resolveTeamRun: vi.fn(async () => manager.getActiveRun(ROOT_TEAM_RUN_ID)),
      recordRunActivity: vi.fn(async () => {}),
      refreshRunMetadata: vi.fn(async () => {}),
    };
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      teamRunService as never,
      undefined,
      undefined,
      undefined,
      manager,
    );
    let resolvePrimaryDisconnect!: () => void;
    const primaryDisconnectCompleted = new Promise<void>((resolve) => {
      resolvePrimaryDisconnect = resolve;
    });
    const disconnect = handler.disconnect.bind(handler);
    vi.spyOn(handler, "disconnect").mockImplementation(async (sessionId) => {
      await disconnect(sessionId);
      resolvePrimaryDisconnect();
    });
    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(
      app,
      { connect: async () => null, handleMessage: async () => {}, disconnect: async () => {} } as never,
      handler,
    );
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socketUrl = `ws://${url.hostname}:${url.port}/ws/agent-team/${ROOT_TEAM_RUN_ID}`;
    const primary = await openSocket(socketUrl);

    try {
      await waitForMessageCount(primary.messages, 3);
      expect(primary.messages.map((message) => message.type)).toEqual([
        "CONNECTED",
        "AGENT_STATUS",
        "TEAM_RUN_LIFECYCLE",
      ]);
      expect(primary.messages[1]?.payload.status).toBe("idle");
      expectScopedLeafIdentity(primary.messages[1]!.payload);
      expect(primary.messages[2]).toEqual({
        type: "TEAM_RUN_LIFECYCLE",
        payload: { team_run_id: ROOT_TEAM_RUN_ID, is_active: true },
      });
      expect(primary.messages.some((message) => message.type === "TEAM_STATUS")).toBe(false);

      backend.setLifecycleSnapshot(runningSnapshot("turn-live"));
      await backend.emitSource([
        event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-live" }),
        event(AgentRunEventType.SEGMENT_CONTENT, {
          turn_id: "turn-live",
          segment_id: "segment-live",
          delta: "streamed through every boundary",
        }),
      ]);
      await waitForMessageCount(primary.messages, 6);
      const live = primary.messages.slice(3);
      expect(live.map((message) => message.type)).toEqual([
        "AGENT_STATUS",
        "TURN_STARTED",
        "SEGMENT_CONTENT",
      ]);
      for (const message of live) expectScopedLeafIdentity(message.payload);
      expect(live[0]?.payload.status).toBe("running");

      primary.socket.send(JSON.stringify({
        type: "INTERRUPT_GENERATION",
        payload: {
          command_id: "client_interrupt_nested_leaf",
          target_member_route_key: ROOT_MEMBER_PATH.join("/"),
          target_member_run_id: MEMBER_RUN_ID,
        },
      }));
      await vi.waitFor(() => {
        expect(teamRun.interruptMember).toHaveBeenCalledWith(
          ROOT_MEMBER_PATH.join("/"),
          MEMBER_RUN_ID,
        );
      });
      await waitForMessageCount(primary.messages, 7);
      expect(primary.messages[6]).toEqual({
        type: "AGENT_COMMAND_ACK",
        payload: {
          command_type: "INTERRUPT_GENERATION",
          command_id: "client_interrupt_nested_leaf",
          state: "accepted",
          target: {
            target_kind: "team_member",
            team_run_id: ROOT_TEAM_RUN_ID,
            member_route_key: ROOT_MEMBER_PATH.join("/"),
            member_run_id: MEMBER_RUN_ID,
          },
        },
      });

      const primaryClosed = waitForSocketClose(primary.socket);
      primary.socket.close();
      await primaryClosed;
      await primaryDisconnectCompleted;
      expect(manager.getLifecycleSnapshot(ROOT_TEAM_RUN_ID).isActive).toBe(true);
      const reconnectRunning = await openSocket(socketUrl);
      try {
        await waitForMessageCount(reconnectRunning.messages, 3);
        expect(reconnectRunning.messages[1]?.payload.status).toBe("running");
        expectScopedLeafIdentity(reconnectRunning.messages[1]!.payload);
        expect(reconnectRunning.messages[2]?.payload).toEqual({
          team_run_id: ROOT_TEAM_RUN_ID,
          is_active: true,
        });

        backend.setLifecycleSnapshot(idleSnapshot());
        await backend.emitSource([
          event(AgentRunEventType.TURN_INTERRUPTED, { turn_id: "turn-live" }),
        ]);
        await waitForMessageCount(reconnectRunning.messages, 5);
        expect(reconnectRunning.messages.slice(-2).map((message) => message.type)).toEqual([
          "TURN_INTERRUPTED",
          "AGENT_STATUS",
        ]);
        expect(reconnectRunning.messages.at(-1)?.payload.status).toBe("idle");
        expect(manager.getLifecycleSnapshot(ROOT_TEAM_RUN_ID).isActive).toBe(true);

        teamRun.setTerminationAccepted(false);
        await expect(manager.terminateTeamRun(ROOT_TEAM_RUN_ID)).resolves.toBe(false);
        expect(manager.getLifecycleSnapshot(ROOT_TEAM_RUN_ID).isActive).toBe(true);
        expect(reconnectRunning.messages.some((message) =>
          message.type === "TEAM_RUN_LIFECYCLE" && message.payload.is_active === false)).toBe(false);

        teamRun.setTerminationAccepted(true);
        await expect(manager.terminateTeamRun(ROOT_TEAM_RUN_ID)).resolves.toBe(true);
        await waitForMessageCount(reconnectRunning.messages, 6);
        expect(reconnectRunning.messages.at(-1)).toEqual({
          type: "TEAM_RUN_LIFECYCLE",
          payload: { team_run_id: ROOT_TEAM_RUN_ID, is_active: false },
        });
        expect(manager.getLifecycleSnapshot(ROOT_TEAM_RUN_ID).isActive).toBe(false);
        expect(reconnectRunning.messages.some((message) => message.type === "TEAM_STATUS")).toBe(false);
      } finally {
        reconnectRunning.socket.close();
      }
    } finally {
      primary.socket.close();
      await app.close();
    }
  });
});
