import fastify from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it } from "vitest";
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
import type { AgentApiStatus } from "../../../src/agent-execution/domain/agent-status-payload.js";
import { AgentRunCommandRegistry } from "../../../src/agent-execution/services/agent-run-command-registry.js";
import { AgentRunCommandStatusOverlayStore } from "../../../src/agent-execution/services/agent-run-command-status-overlay-store.js";
import { AgentRunStatusProjectionService } from "../../../src/agent-execution/services/agent-run-status-projection-service.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY } from "../../../src/config/streaming-content-flush-interval-setting.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentStreamHandler } from "../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

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
  runId: string,
  eventType: AgentRunEventType,
  payload: Record<string, unknown>,
): AgentRunEvent => ({ runId, eventType, payload, statusHint: null });

class ScriptedAgentRunBackend implements AgentRunBackend {
  readonly context: AgentRunContext<null>;
  active = true;
  private snapshot: AgentRuntimeLifecycleSnapshot;
  private readonly sourceListeners = new Set<AgentRunSourceEventBatchListener>();

  constructor(
    readonly runId: string,
    readonly runtimeKind: RuntimeKind,
    initialSnapshot: AgentRuntimeLifecycleSnapshot = idleSnapshot(),
  ) {
    this.snapshot = initialSnapshot;
    this.context = new AgentRunContext({
      runId,
      config: new AgentRunConfig({
        runtimeKind,
        agentDefinitionId: `agent-${runtimeKind}`,
        llmModelIdentifier: `model-${runtimeKind}`,
        autoExecuteTools: true,
        workspaceId: null,
        memoryDir: null,
        llmConfig: null,
        skillAccessMode: SkillAccessMode.NONE,
      }),
      runtimeContext: null,
    });
  }

  getContext(): AgentRunContext<null> {
    return this.context;
  }

  isActive(): boolean {
    return this.active;
  }

  getPlatformAgentRunId(): string | null {
    return `platform-${this.runId}`;
  }

  getLifecycleSnapshot(): AgentRuntimeLifecycleSnapshot {
    return this.snapshot;
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
    this.active = false;
    this.snapshot = {
      availability: "offline",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    };
    return { accepted: true };
  }

  setSnapshot(snapshot: AgentRuntimeLifecycleSnapshot): void {
    this.snapshot = snapshot;
  }

  async emitSource(events: readonly AgentRunEvent[]): Promise<void> {
    for (const listener of this.sourceListeners) {
      await listener(events);
    }
  }
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
  socket.on("message", (data) => messages.push(JSON.parse(data.toString()) as WsMessage));
  return messages;
};

const waitForMessageCount = async (
  messages: WsMessage[],
  count: number,
  timeoutMs = 2_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (messages.length >= count) return;
    await wait(10);
  }
  throw new Error(
    `Timed out waiting for ${String(count)} websocket messages; received ${JSON.stringify(messages)}`,
  );
};

const expectStatusOnlyPayload = (message: WsMessage, expectedStatus: AgentApiStatus): void => {
  expect(message.type).toBe("AGENT_STATUS");
  expect(message.payload.status).toBe(expectedStatus);
  expect(message.payload).not.toHaveProperty("can_interrupt");
};

const openAgentApp = async (run: AgentRun) => {
  const commandRegistry = new AgentRunCommandRegistry();
  const overlayStore = new AgentRunCommandStatusOverlayStore();
  const statusProjectionService = new AgentRunStatusProjectionService({
    agentRunManager: {
      getActiveRun: (runId: string) => (runId === run.runId ? run : null),
    } as never,
    metadataService: { readMetadata: async () => null },
    overlayStore,
    commandRegistry,
  });
  const streamHandler = new AgentStreamHandler(
    new AgentSessionManager(),
    {
      getAgentRun: (runId: string) => (runId === run.runId ? run : null),
      recordRunActivity: async () => {},
    } as never,
    undefined,
    undefined,
    undefined,
    statusProjectionService,
  );
  const app = fastify();
  await app.register(websocket);
  await registerAgentWebsocket(
    app,
    streamHandler,
    { connect: async () => null, handleMessage: async () => {}, disconnect: async () => {} } as never,
  );
  const address = await app.listen({ port: 0, host: "127.0.0.1" });
  const url = new URL(address);
  return { app, baseUrl: `ws://${url.hostname}:${url.port}` };
};

const openSocket = async (url: string): Promise<{ socket: WebSocket; messages: WsMessage[] }> => {
  const socket = new WebSocket(url);
  const messages = captureMessages(socket);
  await waitForOpen(socket);
  return { socket, messages };
};

describe("Agent status WebSocket contract integration", () => {
  const runtimeCases = [
    RuntimeKind.AUTOBYTEUS,
    RuntimeKind.CODEX_APP_SERVER,
    RuntimeKind.CLAUDE_AGENT_SDK,
  ] as const;

  it.each(runtimeCases)(
    "projects only %s status transitions to a real standalone socket while preserving canonical companions",
    async (runtimeKind) => {
      const backend = new ScriptedAgentRunBackend(`run-${runtimeKind}`, runtimeKind);
      const run = new AgentRun({ context: backend.context, backend });
      const canonicalEvents: AgentRunEvent[] = [];
      const unsubscribe = run.subscribeToEvents((runEvent) => canonicalEvents.push(runEvent));
      const harness = await openAgentApp(run);
      const connection = await openSocket(`${harness.baseUrl}/ws/agent/${run.runId}`);

      try {
        await waitForMessageCount(connection.messages, 2);
        expect(connection.messages[0]).toMatchObject({
          type: "CONNECTED",
          payload: { agent_id: run.runId },
        });
        expectStatusOnlyPayload(connection.messages[1]!, "idle");

        backend.setSnapshot(runningSnapshot("turn-a"));
        await backend.emitSource([
          event(run.runId, AgentRunEventType.TURN_STARTED, { turn_id: "turn-a" }),
          event(run.runId, AgentRunEventType.SEGMENT_START, {
            id: "content-a",
            turn_id: "turn-a",
            segment_type: "text",
          }),
          event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
            id: "content-a",
            turn_id: "turn-a",
            delta: "one",
          }),
          event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
            id: "content-a",
            turn_id: "turn-a",
            delta: "two",
          }),
        ]);
        backend.setSnapshot(idleSnapshot());
        await backend.emitSource([
          event(run.runId, AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" }),
        ]);

        await waitForMessageCount(connection.messages, 8);
        const liveTrace = connection.messages.slice(2);
        expect(liveTrace.map((message) => message.type)).toEqual([
          "AGENT_STATUS",
          "TURN_STARTED",
          "SEGMENT_START",
          "SEGMENT_CONTENT",
          "TURN_COMPLETED",
          "AGENT_STATUS",
        ]);
        expectStatusOnlyPayload(liveTrace[0]!, "running");
        expectStatusOnlyPayload(liveTrace[5]!, "idle");
        expect(liveTrace[3]?.payload.delta).toBe("onetwo");
        expect(liveTrace.filter((message) => message.type === "AGENT_STATUS")).toHaveLength(2);
        expect(liveTrace.filter((message) => message.type !== "AGENT_STATUS")).toHaveLength(4);

        expect(canonicalEvents.filter(
          (runEvent) => runEvent.eventType !== AgentRunEventType.AGENT_STATUS,
        ).map((runEvent) => runEvent.eventType)).toEqual([
          AgentRunEventType.TURN_STARTED,
          AgentRunEventType.SEGMENT_START,
          AgentRunEventType.SEGMENT_CONTENT,
          AgentRunEventType.SEGMENT_CONTENT,
          AgentRunEventType.TURN_COMPLETED,
        ]);
        expect(canonicalEvents.filter(
          (runEvent) => runEvent.eventType === AgentRunEventType.AGENT_STATUS,
        )).toHaveLength(5);

        const reconnect = await openSocket(`${harness.baseUrl}/ws/agent/${run.runId}`);
        try {
          await waitForMessageCount(reconnect.messages, 2);
          expectStatusOnlyPayload(reconnect.messages[1]!, "idle");
        } finally {
          reconnect.socket.close();
        }
      } finally {
        unsubscribe();
        connection.socket.close();
        await harness.app.close();
      }
    },
  );

  it("coalesces a representative fine-grained canonical stream into one default-window content frame", async () => {
    const previousInterval = process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY];
    process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY] = "500";
    const backend = new ScriptedAgentRunBackend(
      "run-default-window-rate",
      RuntimeKind.AUTOBYTEUS,
      runningSnapshot("turn-rate"),
    );
    const run = new AgentRun({ context: backend.context, backend });
    let internalContentEvents = 0;
    const unsubscribe = run.subscribeToEvents((runEvent) => {
      if (runEvent.eventType === AgentRunEventType.SEGMENT_CONTENT) {
        internalContentEvents += 1;
      }
    });
    const harness = await openAgentApp(run);
    const connection = await openSocket(`${harness.baseUrl}/ws/agent/${run.runId}`);

    try {
      await waitForMessageCount(connection.messages, 2);
      const deltas = Array.from({ length: 30 }, (_, index) => `${String(index).padStart(2, "0")}|`);
      const openedAt = Date.now();
      await backend.emitSource([
        event(run.runId, AgentRunEventType.SEGMENT_START, {
          id: "segment-rate",
          turn_id: "turn-rate",
          segment_type: "text",
        }),
        ...deltas.map((delta) => event(
          run.runId,
          AgentRunEventType.SEGMENT_CONTENT,
          {
            id: "segment-rate",
            turn_id: "turn-rate",
            delta,
          },
        )),
      ]);

      await wait(350);
      expect(connection.messages.filter((message) => message.type === "SEGMENT_CONTENT")).toHaveLength(0);
      await wait(300);

      const contentFrames = connection.messages.filter(
        (message) => message.type === "SEGMENT_CONTENT",
      );
      expect(internalContentEvents).toBe(30);
      expect(contentFrames).toHaveLength(1);
      expect(contentFrames[0]?.payload.delta).toBe(deltas.join(""));
      expect(Date.now() - openedAt).toBeGreaterThanOrEqual(500);
    } finally {
      unsubscribe();
      connection.socket.close();
      await harness.app.close();
      if (previousInterval === undefined) {
        delete process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY];
      } else {
        process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY] = previousInterval;
      }
    }
  });

  it("uses a changed interval only for the active socket's next newly opened window", async () => {
    const previousInterval = process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY];
    process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY] = "500";
    const backend = new ScriptedAgentRunBackend(
      "run-live-interval-change",
      RuntimeKind.CODEX_APP_SERVER,
      runningSnapshot("turn-live-setting"),
    );
    const run = new AgentRun({ context: backend.context, backend });
    const harness = await openAgentApp(run);
    const connection = await openSocket(`${harness.baseUrl}/ws/agent/${run.runId}`);

    try {
      await waitForMessageCount(connection.messages, 2);
      await backend.emitSource([
        event(run.runId, AgentRunEventType.SEGMENT_START, {
          id: "segment-live-setting",
          turn_id: "turn-live-setting",
          segment_type: "text",
        }),
        event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
          id: "segment-live-setting",
          turn_id: "turn-live-setting",
          delta: "first",
        }),
      ]);
      process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY] = "1000";

      await wait(350);
      expect(connection.messages.filter((message) => message.type === "SEGMENT_CONTENT"))
        .toHaveLength(0);
      await wait(300);
      expect(connection.messages.filter((message) => message.type === "SEGMENT_CONTENT")
        .map((message) => message.payload.delta)).toEqual(["first"]);

      await backend.emitSource([
        event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
          id: "segment-live-setting",
          turn_id: "turn-live-setting",
          delta: "second",
        }),
      ]);
      await wait(650);
      expect(connection.messages.filter((message) => message.type === "SEGMENT_CONTENT")
        .map((message) => message.payload.delta)).toEqual(["first"]);
      await wait(500);
      expect(connection.messages.filter((message) => message.type === "SEGMENT_CONTENT")
        .map((message) => message.payload.delta)).toEqual(["first", "second"]);
    } finally {
      connection.socket.close();
      await harness.app.close();
      if (previousInterval === undefined) {
        delete process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY];
      } else {
        process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY] = previousInterval;
      }
    }
  });

  it("preserves B while rejecting a retired turn's late segment content across reconnect", async () => {
    const backend = new ScriptedAgentRunBackend(
      "run-retired-turn-ordering",
      RuntimeKind.CODEX_APP_SERVER,
    );
    const run = new AgentRun({ context: backend.context, backend });
    const harness = await openAgentApp(run);
    const primary = await openSocket(`${harness.baseUrl}/ws/agent/${run.runId}`);

    try {
      await waitForMessageCount(primary.messages, 2);

      backend.setSnapshot(runningSnapshot("turn-a"));
      await backend.emitSource([
        event(run.runId, AgentRunEventType.TURN_STARTED, { turn_id: "turn-a" }),
        event(run.runId, AgentRunEventType.SEGMENT_START, {
          id: "late-content-a",
          turn_id: "turn-a",
          segment_type: "text",
        }),
      ]);
      backend.setSnapshot(idleSnapshot());
      await backend.emitSource([
        event(run.runId, AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" }),
      ]);
      await backend.emitSource([
        event(run.runId, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
          turn_id: "turn-a",
          invocation_id: "late-a",
          tool_name: "run_bash",
          result: "late-result",
        }),
      ]);

      backend.setSnapshot(runningSnapshot("turn-b"));
      await backend.emitSource([
        event(run.runId, AgentRunEventType.TURN_STARTED, { turn_id: "turn-b" }),
      ]);
      await backend.emitSource([
        event(run.runId, AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" }),
        event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
          id: "late-content-a",
          turn_id: "turn-a",
          delta: "still observable",
        }),
      ]);

      await waitForMessageCount(primary.messages, 12);
      const trace = primary.messages.slice(2);
      expect(trace.map((message) => [message.type, message.payload.status ?? message.payload.turn_id])).toEqual([
        ["AGENT_STATUS", "running"],
        ["TURN_STARTED", "turn-a"],
        ["SEGMENT_START", "turn-a"],
        ["TURN_COMPLETED", "turn-a"],
        ["AGENT_STATUS", "idle"],
        ["TOOL_EXECUTION_SUCCEEDED", "turn-a"],
        ["AGENT_STATUS", "running"],
        ["TURN_STARTED", "turn-b"],
        ["TURN_COMPLETED", "turn-a"],
        ["ERROR", "turn-a"],
      ]);
      expect(trace.at(-1)?.payload.code).toBe("AGENT_SEGMENT_LIFECYCLE_INVALID");
      expect(run.getStatusSnapshot()).toEqual({
        status: "running",
        agent_id: run.runId,
      });

      const reconnectRunning = await openSocket(`${harness.baseUrl}/ws/agent/${run.runId}`);
      try {
        await waitForMessageCount(reconnectRunning.messages, 2);
        expectStatusOnlyPayload(reconnectRunning.messages[1]!, "running");
      } finally {
        reconnectRunning.socket.close();
      }

      backend.setSnapshot(idleSnapshot());
      await backend.emitSource([
        event(run.runId, AgentRunEventType.TURN_INTERRUPTED, { turn_id: "turn-b" }),
      ]);
      await waitForMessageCount(primary.messages, 14);
      expect(primary.messages.slice(-2).map((message) => message.type)).toEqual([
        "TURN_INTERRUPTED",
        "AGENT_STATUS",
      ]);
      expectStatusOnlyPayload(primary.messages.at(-1)!, "idle");

      const reconnectIdle = await openSocket(`${harness.baseUrl}/ws/agent/${run.runId}`);
      try {
        await waitForMessageCount(reconnectIdle.messages, 2);
        expectStatusOnlyPayload(reconnectIdle.messages[1]!, "idle");
      } finally {
        reconnectIdle.socket.close();
      }
    } finally {
      primary.socket.close();
      await harness.app.close();
    }
  });

  it("keeps diagnostic errors running, terminalizes the current turn to error, then publishes offline on termination", async () => {
    const backend = new ScriptedAgentRunBackend("run-error-contract", RuntimeKind.CLAUDE_AGENT_SDK);
    const run = new AgentRun({ context: backend.context, backend });
    const harness = await openAgentApp(run);
    const connection = await openSocket(`${harness.baseUrl}/ws/agent/${run.runId}`);

    try {
      await waitForMessageCount(connection.messages, 2);
      backend.setSnapshot(runningSnapshot("turn-error"));
      await backend.emitSource([
        event(run.runId, AgentRunEventType.TURN_STARTED, { turn_id: "turn-error" }),
        event(run.runId, AgentRunEventType.ERROR, {
          turn_id: "turn-error",
          error_scope: "turn",
          error_effect: "diagnostic",
          code: "TOOL_DIAGNOSTIC",
          message: "recoverable tool diagnostic",
        }),
        event(run.runId, AgentRunEventType.ERROR, {
          turn_id: "turn-error",
          error_scope: "turn",
          error_effect: "terminal",
          code: "LLM_PROVIDER_ERROR",
          message: "terminal turn failure",
          provider_status: 402,
          provider_code: "balance_required",
          provider_request_id: "provider-request-123",
          details: "safe provider details",
        }),
      ]);

      await waitForMessageCount(connection.messages, 7);
      const trace = connection.messages.slice(2);
      expect(trace.map((message) => message.type)).toEqual([
        "AGENT_STATUS",
        "TURN_STARTED",
        "ERROR",
        "ERROR",
        "AGENT_STATUS",
      ]);
      expect(trace[3]).toEqual({
        type: "ERROR",
        payload: {
          code: "LLM_PROVIDER_ERROR",
          message: "terminal turn failure",
          details: "safe provider details",
          provider_status: 402,
          provider_code: "balance_required",
          provider_request_id: "provider-request-123",
          error_scope: "turn",
          error_effect: "terminal",
          turn_id: "turn-error",
        },
      });
      expect(JSON.stringify(trace[3])).not.toContain("raw-provider-secret");
      expectStatusOnlyPayload(trace[4]!, "error");
      expect(run.getStatusSnapshot().status).toBe("error");

      await run.terminate();
      await waitForMessageCount(connection.messages, 8);
      expectStatusOnlyPayload(connection.messages[7]!, "offline");
    } finally {
      connection.socket.close();
      await harness.app.close();
    }
  });

});
