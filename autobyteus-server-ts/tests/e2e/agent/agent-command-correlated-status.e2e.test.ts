import fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentRunBackend, AgentRunEventListener } from "../../../src/agent-execution/backends/agent-run-backend.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { buildAgentStatusPayload, type AgentApiStatus } from "../../../src/agent-execution/domain/agent-status-payload.js";
import { AgentRunCommandCoordinator } from "../../../src/agent-execution/services/agent-run-command-coordinator.js";
import { AgentRunCommandRegistry } from "../../../src/agent-execution/services/agent-run-command-registry.js";
import { AgentRunCommandStatusOverlayStore } from "../../../src/agent-execution/services/agent-run-command-status-overlay-store.js";
import { AgentRunStatusProjectionService } from "../../../src/agent-execution/services/agent-run-status-projection-service.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentStreamBroadcaster } from "../../../src/services/agent-streaming/agent-stream-broadcaster.js";
import { AgentStreamHandler } from "../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
};

class ScriptedAgentRunBackend implements AgentRunBackend {
  readonly runtimeKind = RuntimeKind.CODEX_APP_SERVER;
  readonly messages: AgentInputUserMessage[] = [];
  active = true;

  private readonly listeners = new Set<AgentRunEventListener>();
  private readonly context: AgentRunContext<{ threadId: string; activeTurnId: string | null }>;
  private statusPayload;

  constructor(
    readonly runId: string,
    options: {
      initialStatus: AgentApiStatus;
      canInterrupt?: boolean;
      postUserMessage: (message: AgentInputUserMessage) => Promise<{ accepted: boolean; turnId?: string | null; message?: string | null }>;
    },
  ) {
    this.statusPayload = buildAgentStatusPayload({
      status: options.initialStatus,
      canInterrupt: options.canInterrupt === true,
      agentId: runId,
    });
    this.context = new AgentRunContext({
      runId,
      config: new AgentRunConfig({
        agentDefinitionId: "agent-def-e2e",
        llmModelIdentifier: "e2e-model",
        autoExecuteTools: false,
        workspaceId: "workspace-e2e",
        memoryDir: `/tmp/autobyteus-e2e-memory/${runId}`,
        llmConfig: null,
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      }),
      runtimeContext: { threadId: `thread-${runId}`, activeTurnId: null },
    });
    this.postUserMessage = vi.fn(async (message: AgentInputUserMessage) => {
      this.messages.push(message);
      return options.postUserMessage(message);
    });
  }

  getContext(): AgentRunContext<{ threadId: string; activeTurnId: string | null }> {
    return this.context;
  }

  isActive(): boolean {
    return this.active;
  }

  getPlatformAgentRunId(): string | null {
    return `platform-${this.runId}`;
  }

  getStatusSnapshot() {
    return this.statusPayload;
  }

  subscribeToEvents(listener: AgentRunEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  postUserMessage: AgentRunBackend["postUserMessage"];

  approveToolInvocation = vi.fn(async () => ({ accepted: true }));

  interrupt = vi.fn(async () => ({ accepted: true }));

  terminate = vi.fn(async () => {
    this.active = false;
    this.emitStatus("offline", false);
    return { accepted: true };
  });

  emitStatus(status: AgentApiStatus, canInterrupt = false): void {
    this.statusPayload = buildAgentStatusPayload({
      status,
      canInterrupt,
      agentId: this.runId,
    });
    this.emit({
      runId: this.runId,
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: this.statusPayload,
      statusHint: status === "running" ? "ACTIVE" : status === "error" ? "ERROR" : "IDLE",
    });
  }

  emitTurnStarted(turnId: string): void {
    this.statusPayload = buildAgentStatusPayload({
      status: "running",
      canInterrupt: true,
      agentId: this.runId,
    });
    this.emit({
      runId: this.runId,
      eventType: AgentRunEventType.TURN_STARTED,
      payload: { turn_id: turnId, turnId },
      statusHint: "ACTIVE",
    });
  }

  private emit(event: AgentRunEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

const buildAgentRun = (backend: ScriptedAgentRunBackend): AgentRun =>
  new AgentRun({
    context: backend.getContext(),
    backend,
  });

const buildMetadata = (runId: string): AgentRunMetadata => ({
  runId,
  agentDefinitionId: "agent-def-e2e",
  workspaceRootPath: "/tmp/autobyteus-e2e-workspace",
  memoryDir: `/tmp/autobyteus-e2e-memory/${runId}`,
  llmModelIdentifier: "e2e-model",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: `platform-${runId}`,
  lastKnownStatus: "ACTIVE",
  activationState: "ACTIVATED",
  preparedAt: null,
  preparedExpiresAt: null,
  applicationExecutionContext: null,
  archivedAt: null,
});

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const waitForOpen = (socket: WebSocket, timeoutMs = 2_000): Promise<void> =>
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

const captureMessages = (socket: WebSocket): WsMessage[] => {
  const messages: WsMessage[] = [];
  socket.on("message", (data) => {
    messages.push(JSON.parse(data.toString()) as WsMessage);
  });
  return messages;
};

const waitForCondition = async (fn: () => boolean, label: string, timeoutMs = 2_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fn()) {
      return;
    }
    await wait(10);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const waitForMessageAfter = async (
  messages: WsMessage[],
  startIndex: number,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 2_000,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.slice(startIndex).find(predicate);
    if (match) {
      return match;
    }
    await wait(10);
  }
  const preview = messages
    .slice(startIndex)
    .map((message) => `${message.type}:${JSON.stringify(message.payload)}`)
    .join(" | ");
  throw new Error(`Timed out waiting for ${label}; preview=${preview}`);
};

const waitForBufferedMessage = async (
  messages: WsMessage[],
  index: number,
  timeoutMs = 2_000,
): Promise<WsMessage> => {
  await waitForCondition(() => Boolean(messages[index]), `message at index ${String(index)}`, timeoutMs);
  return messages[index]!;
};

const statusValuesAfter = (messages: WsMessage[], startIndex: number): unknown[] =>
  messages
    .slice(startIndex)
    .filter((message) => message.type === "AGENT_STATUS")
    .map((message) => message.payload.status);

const sendCommand = (content: string, messageId: string) => ({
  type: "SEND_MESSAGE",
  payload: {
    content,
    message_id: messageId,
    dedupe_key: `agent_run_input:e2e:${messageId}`,
  },
});

const startHarness = async (input: {
  runId: string;
  initialRun: AgentRun;
  restoreRun: () => Promise<AgentRun>;
}) => {
  const activeRuns = new Map<string, AgentRun>([[input.runId, input.initialRun]]);
  const metadataByRunId = new Map<string, AgentRunMetadata>([[input.runId, buildMetadata(input.runId)]]);

  const getActiveRun = (runId: string): AgentRun | null => {
    const activeRun = activeRuns.get(runId) ?? null;
    if (!activeRun) {
      return null;
    }
    if (!activeRun.isActive()) {
      activeRuns.delete(runId);
      return null;
    }
    return activeRun;
  };

  const agentRunService = {
    getAgentRun: vi.fn((runId: string) => getActiveRun(runId)),
    getRunMetadata: vi.fn(async (runId: string) => metadataByRunId.get(runId) ?? null),
    restoreAgentRun: vi.fn(async (runId: string) => {
      const run = await input.restoreRun();
      activeRuns.set(runId, run);
      return { run, metadata: metadataByRunId.get(runId)! };
    }),
    activatePreparedRun: vi.fn(async () => {
      throw new Error("Prepared activation is not used by this e2e scenario.");
    }),
    recordRunActivity: vi.fn(async (run: AgentRun, activity: { lastKnownStatus?: "ACTIVE" | "IDLE" | "ERROR" | "TERMINATED" }) => {
      const metadata = metadataByRunId.get(run.runId);
      if (metadata) {
        metadataByRunId.set(run.runId, {
          ...metadata,
          lastKnownStatus: activity.lastKnownStatus ?? "ACTIVE",
          platformAgentRunId: run.getPlatformAgentRunId() ?? metadata.platformAgentRunId,
        });
      }
    }),
  };

  const registry = new AgentRunCommandRegistry();
  const overlayStore = new AgentRunCommandStatusOverlayStore();
  const broadcaster = new AgentStreamBroadcaster();
  const projectionService = new AgentRunStatusProjectionService({
    agentRunManager: { getActiveRun } as any,
    metadataService: {
      readMetadata: async (runId: string) => metadataByRunId.get(runId) ?? null,
    },
    overlayStore,
    commandRegistry: registry,
  });
  const commandCoordinator = new AgentRunCommandCoordinator({
    agentRunService: agentRunService as any,
    registry,
    overlayStore,
    projectionService,
    broadcaster,
  });
  const handler = new AgentStreamHandler(
    new AgentSessionManager(),
    agentRunService as any,
    undefined,
    broadcaster,
    commandCoordinator,
    projectionService,
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
    } as any,
  );
  const address = await app.listen({ port: 0, host: "127.0.0.1" });
  const url = new URL(address);

  return {
    app,
    baseUrl: `ws://${url.hostname}:${url.port}`,
    activeRuns,
    agentRunService,
    overlayStore,
  };
};

const openAgentSocket = async (baseUrl: string, runId: string): Promise<{ socket: WebSocket; messages: WsMessage[] }> => {
  const socket = new WebSocket(`${baseUrl}/ws/agent/${runId}`);
  const messages = captureMessages(socket);
  await waitForOpen(socket);
  return { socket, messages };
};

describe("Agent command-correlated status overlay e2e", () => {
  it("preserves offline -> initializing -> running when a stopped standalone run restores with an already-running snapshot", async () => {
    const runId = "agent-command-status-e2e";
    const firstPost = deferred<{ accepted: true; turnId: string }>();
    const restoredPost = deferred<{ accepted: true; turnId: string }>();
    const restoreReady = deferred<AgentRun>();

    const firstBackend = new ScriptedAgentRunBackend(runId, {
      initialStatus: "idle",
      postUserMessage: async () => firstPost.promise,
    });
    const restoredBackend = new ScriptedAgentRunBackend(runId, {
      initialStatus: "running",
      canInterrupt: true,
      postUserMessage: async () => restoredPost.promise,
    });

    const harness = await startHarness({
      runId,
      initialRun: buildAgentRun(firstBackend),
      restoreRun: async () => restoreReady.promise,
    });
    let firstSocket: WebSocket | null = null;
    let secondSocket: WebSocket | null = null;

    try {
      const firstConnection = await openAgentSocket(harness.baseUrl, runId);
      firstSocket = firstConnection.socket;
      const firstMessages = firstConnection.messages;
      expect(await waitForBufferedMessage(firstMessages, 0)).toMatchObject({
        type: "CONNECTED",
        payload: { agent_id: runId },
      });
      expect(await waitForBufferedMessage(firstMessages, 1)).toEqual({
        type: "AGENT_STATUS",
        payload: { status: "idle", can_interrupt: false, agent_id: runId },
      });

      const firstSendStart = firstMessages.length;
      firstSocket.send(JSON.stringify(sendCommand("start the first turn", "msg-first")));
      expect(
        await waitForMessageAfter(
          firstMessages,
          firstSendStart,
          (message) => message.type === "AGENT_STATUS" && message.payload.status === "initializing",
          "first initializing status",
        ),
      ).toEqual({
        type: "AGENT_STATUS",
        payload: { status: "initializing", can_interrupt: false, agent_id: runId },
      });
      firstBackend.emitStatus("running", true);
      await waitForMessageAfter(
        firstMessages,
        firstSendStart,
        (message) => message.type === "AGENT_STATUS" && message.payload.status === "running",
        "first running status",
      );
      firstPost.resolve({ accepted: true, turnId: "turn-first" });
      await waitForMessageAfter(
        firstMessages,
        firstSendStart,
        (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.message_id === "msg-first",
        "first command ACK",
      );
      firstBackend.emitStatus("idle", false);
      await waitForMessageAfter(
        firstMessages,
        firstSendStart,
        (message) => message.type === "AGENT_STATUS" && message.payload.status === "idle",
        "first idle status",
      );

      firstSocket.close();
      firstSocket = null;
      firstBackend.active = false;
      harness.activeRuns.delete(runId);

      const secondConnection = await openAgentSocket(harness.baseUrl, runId);
      secondSocket = secondConnection.socket;
      const secondMessages = secondConnection.messages;
      expect(await waitForBufferedMessage(secondMessages, 0)).toMatchObject({
        type: "CONNECTED",
        payload: { agent_id: runId },
      });
      expect(await waitForBufferedMessage(secondMessages, 1)).toEqual({
        type: "AGENT_STATUS",
        payload: { status: "offline", can_interrupt: false, agent_id: runId },
      });
      expect(harness.agentRunService.restoreAgentRun).not.toHaveBeenCalled();

      const restoredSendStart = secondMessages.length;
      secondSocket.send(JSON.stringify(sendCommand("resume after process stop", "msg-restored")));
      expect(
        await waitForMessageAfter(
          secondMessages,
          restoredSendStart,
          (message) => message.type === "AGENT_STATUS" && message.payload.status === "initializing",
          "restored initializing status before restore resolves",
        ),
      ).toEqual({
        type: "AGENT_STATUS",
        payload: { status: "initializing", can_interrupt: false, agent_id: runId },
      });
      expect(harness.agentRunService.restoreAgentRun).toHaveBeenCalledWith(runId);

      restoreReady.resolve(buildAgentRun(restoredBackend));
      await waitForCondition(
        () => restoredBackend.messages.length === 1,
        "restored runtime to receive the SEND_MESSAGE command",
      );
      await wait(30);

      expect(statusValuesAfter(secondMessages, restoredSendStart)).toEqual(["initializing"]);
      expect(harness.overlayStore.getOverlay(runId)?.status).toBe("initializing");

      restoredBackend.emitTurnStarted("turn-restored");
      expect(
        await waitForMessageAfter(
          secondMessages,
          restoredSendStart,
          (message) => message.type === "AGENT_STATUS" && message.payload.status === "running",
          "running status after command-correlated TURN_STARTED",
        ),
      ).toMatchObject({
        type: "AGENT_STATUS",
        payload: { status: "running", agent_id: runId },
      });
      expect(statusValuesAfter(secondMessages, restoredSendStart).slice(0, 2)).toEqual([
        "initializing",
        "running",
      ]);
      expect(harness.overlayStore.getOverlay(runId)).toBeNull();

      restoredPost.resolve({ accepted: true, turnId: "turn-restored" });
      const restoredAck = await waitForMessageAfter(
        secondMessages,
        restoredSendStart,
        (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.message_id === "msg-restored",
        "restored command ACK",
      );
      expect(restoredAck.payload).toMatchObject({
        command_type: "SEND_MESSAGE",
        run_id: runId,
        message_id: "msg-restored",
        state: "accepted",
        accepted: true,
        duplicate: false,
        status: { status: "running", agent_id: runId },
      });
    } finally {
      firstSocket?.close();
      secondSocket?.close();
      await harness.app.close();
    }
  });
});
