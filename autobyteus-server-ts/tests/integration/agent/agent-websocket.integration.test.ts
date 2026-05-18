import fastify from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { AgentInputUserMessage } from "autobyteus-ts";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunCommandCoordinator } from "../../../src/agent-execution/services/agent-run-command-coordinator.js";
import { AgentRunCommandRegistry } from "../../../src/agent-execution/services/agent-run-command-registry.js";
import { AgentRunCommandStatusOverlayStore } from "../../../src/agent-execution/services/agent-run-command-status-overlay-store.js";
import { AgentRunStatusProjectionService } from "../../../src/agent-execution/services/agent-run-status-projection-service.js";
import { AgentStreamHandler } from "../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentStreamBroadcaster } from "../../../src/services/agent-streaming/agent-stream-broadcaster.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";

class FakeRuntimeRun {
  readonly runtimeKind = RuntimeKind.CODEX_APP_SERVER;
  readonly isActive = () => true;
  readonly messages: AgentInputUserMessage[] = [];
  readonly approvals: Array<{ invocationId: string; approved: boolean; reason: string | null }> = [];
  interruptCalls = 0;
  private readonly listeners = new Set<(event: AgentRunEvent) => void>();
  private snapshot: { status: "offline" | "initializing" | "idle" | "running" | "error"; can_interrupt: boolean; agent_id: string };

  constructor(
    readonly runId: string,
    options: {
      initialStatus?: "offline" | "initializing" | "idle" | "running" | "error";
      canInterrupt?: boolean;
      postUserMessage?: (message: AgentInputUserMessage) => Promise<{ accepted: boolean; turnId?: string | null; message?: string | null }>;
    } = {},
  ) {
    this.snapshot = {
      status: options.initialStatus ?? "running",
      can_interrupt: options.canInterrupt ?? false,
      agent_id: runId,
    };
    if (options.postUserMessage) {
      this.postUserMessage = vi.fn(async (message: AgentInputUserMessage) => {
        this.messages.push(message);
        return options.postUserMessage!(message);
      });
    }
  }

  getPlatformAgentRunId(): string {
    return `platform-${this.runId}`;
  }

  getStatusSnapshot() {
    return this.snapshot;
  }

  setStatus(status: "offline" | "initializing" | "idle" | "running" | "error", canInterrupt = false): void {
    this.snapshot = {
      status,
      can_interrupt: canInterrupt,
      agent_id: this.runId,
    };
  }

  subscribeToEvents(listener: (event: AgentRunEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: AgentRunEvent): void {
    if (event.eventType === AgentRunEventType.AGENT_STATUS) {
      const payload = event.payload as { status?: unknown; can_interrupt?: unknown };
      if (
        payload.status === "offline" ||
        payload.status === "initializing" ||
        payload.status === "idle" ||
        payload.status === "running" ||
        payload.status === "error"
      ) {
        this.setStatus(payload.status, payload.can_interrupt === true);
      }
    }
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  postUserMessage = vi.fn(async (message: AgentInputUserMessage) => {
    this.messages.push(message);
    return { accepted: true, turnId: `turn-${this.messages.length}` };
  });

  approveToolInvocation = vi.fn(async (invocationId: string, approved: boolean, reason?: string | null) => {
    this.approvals.push({ invocationId, approved, reason: reason ?? null });
    return { accepted: true };
  });

  interrupt = vi.fn(async () => {
    this.interruptCalls += 1;
    return { accepted: true };
  });
}

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

const buildMetadata = (runId: string, overrides: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
  runId,
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace-one",
  memoryDir: `/tmp/autobyteus-test-memory/agents/${runId}`,
  llmModelIdentifier: "model-1",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: "platform-existing",
  lastKnownStatus: "IDLE",
  activationState: "ACTIVATED",
  preparedAt: null,
  preparedExpiresAt: null,
  applicationExecutionContext: null,
  archivedAt: null,
  ...overrides,
});

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

const waitForMessageMatching = async (
  messages: WsMessage[],
  predicate: (message: WsMessage) => boolean,
  startIndex = 0,
  timeoutMs = 2_000,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.slice(startIndex).find(predicate);
    if (match) {
      return match;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for matching websocket message");
};

const waitForCondition = async (fn: () => boolean, timeoutMs = 2_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fn()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for condition");
};

const createSendCommand = (content: string, messageId: string) => ({
  type: "SEND_MESSAGE",
  payload: {
    content,
    context_file_paths: ["/tmp/note.txt"],
    image_urls: ["https://example.com/cat.png"],
    message_id: messageId,
    dedupe_key: `agent_run_input:agent-e2e:${messageId}`,
  },
});

const startAgentWsHarness = async (options: {
  runId: string;
  activeRun?: FakeRuntimeRun | null;
  metadata?: AgentRunMetadata | null;
  restoreAgentRun?: ReturnType<typeof vi.fn>;
  activatePreparedRun?: ReturnType<typeof vi.fn>;
}) => {
  const activeRuns = new Map<string, FakeRuntimeRun>();
  if (options.activeRun) {
    activeRuns.set(options.runId, options.activeRun);
  }
  const metadataByRunId = new Map<string, AgentRunMetadata>();
  if (options.metadata) {
    metadataByRunId.set(options.runId, options.metadata);
  }
  const recordActivities: Array<{ runId: string; summary?: string | null }> = [];
  const restoreAgentRun = options.restoreAgentRun ?? vi.fn(async (runId: string) => {
    const restored = new FakeRuntimeRun(runId, { initialStatus: "idle" });
    activeRuns.set(runId, restored);
    return { run: restored, metadata: metadataByRunId.get(runId) ?? buildMetadata(runId) };
  });
  const activatePreparedRun = options.activatePreparedRun ?? vi.fn(async (runId: string) => {
    const activated = new FakeRuntimeRun(runId, { initialStatus: "idle" });
    activeRuns.set(runId, activated);
    return activated;
  });
  const agentRunService = {
    getAgentRun: vi.fn((runId: string) => activeRuns.get(runId) ?? null),
    getRunMetadata: vi.fn(async (runId: string) => metadataByRunId.get(runId) ?? null),
    restoreAgentRun,
    activatePreparedRun,
    recordRunActivity: vi.fn(async (run: { runId: string }, activity: { summary?: string | null }) => {
      recordActivities.push({ runId: run.runId, summary: activity.summary });
    }),
  };
  const registry = new AgentRunCommandRegistry();
  const overlayStore = new AgentRunCommandStatusOverlayStore();
  const broadcaster = new AgentStreamBroadcaster();
  const projectionService = new AgentRunStatusProjectionService({
    agentRunManager: {
      getActiveRun: (runId: string) => activeRuns.get(runId) ?? null,
    } as any,
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
    metadataByRunId,
    recordActivities,
    agentRunService,
    registry,
    overlayStore,
  };
};

describe("Agent websocket backend-owned command lifecycle integration", () => {
  it("connects to an inactive identity without restore, then publishes initializing before slow restore and SEND_MESSAGE ACK", async () => {
    const runId = "agent-e2e";
    const metadata = buildMetadata(runId);
    const restoredRun = new FakeRuntimeRun(runId, { initialStatus: "idle" });
    let resolveRestore!: (value: { run: FakeRuntimeRun; metadata: AgentRunMetadata }) => void;
    const restorePromise = new Promise<{ run: FakeRuntimeRun; metadata: AgentRunMetadata }>((resolve) => {
      resolveRestore = resolve;
    });
    const restoreAgentRun = vi.fn(() => restorePromise);
    const harness = await startAgentWsHarness({ runId, metadata, restoreAgentRun });
    const socket = new WebSocket(`${harness.baseUrl}/ws/agent/${runId}`);
    const messages = captureMessages(socket);
    try {
      await waitForOpen(socket);
      expect(await waitForBufferedMessage(messages, 0)).toMatchObject({
        type: "CONNECTED",
        payload: { agent_id: runId },
      });
      expect(await waitForBufferedMessage(messages, 1)).toEqual({
        type: "AGENT_STATUS",
        payload: { status: "offline", can_interrupt: false, agent_id: runId },
      });
      expect(restoreAgentRun).not.toHaveBeenCalled();

      socket.send(JSON.stringify(createSendCommand("hello after restore", "msg-restore-1")));
      const initializing = await waitForMessageMatching(
        messages,
        (message) => message.type === "AGENT_STATUS" && message.payload.status === "initializing",
        2,
      );
      expect(initializing).toEqual({
        type: "AGENT_STATUS",
        payload: { status: "initializing", can_interrupt: false, agent_id: runId },
      });
      expect(restoreAgentRun).toHaveBeenCalledWith(runId);
      expect(restoredRun.messages).toHaveLength(0);

      resolveRestore({ run: restoredRun, metadata });
      const ack = await waitForMessageMatching(
        messages,
        (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.message_id === "msg-restore-1",
        2,
      );
      expect(ack.payload).toMatchObject({
        command_type: "SEND_MESSAGE",
        run_id: runId,
        message_id: "msg-restore-1",
        dedupe_key: "agent_run_input:agent-e2e:msg-restore-1",
        state: "accepted",
        accepted: true,
        duplicate: false,
        status: { status: "initializing", can_interrupt: false, agent_id: runId },
      });
      expect(restoredRun.messages).toHaveLength(1);
      expect(restoredRun.messages[0].content).toBe("hello after restore");
      expect(restoredRun.messages[0].metadata).toMatchObject({
        message_id: "msg-restore-1",
        dedupe_key: "agent_run_input:agent-e2e:msg-restore-1",
      });
      expect(restoredRun.messages[0].contextFiles?.map((file) => file.toDict())).toEqual([
        expect.objectContaining({ uri: "/tmp/note.txt" }),
        expect.objectContaining({ uri: "https://example.com/cat.png", file_type: "image" }),
      ]);

      restoredRun.emit({
        runId,
        eventType: AgentRunEventType.AGENT_STATUS,
        payload: { status: "running", can_interrupt: true, agent_id: runId },
        statusHint: "ACTIVE",
      });
      const running = await waitForMessageMatching(
        messages,
        (message) => message.type === "AGENT_STATUS" && message.payload.status === "running",
        2,
      );
      expect(running.payload).toMatchObject({ status: "running", can_interrupt: true, agent_id: runId });
      expect(harness.overlayStore.getOverlay(runId)).toBeNull();
    } finally {
      socket.close();
      await harness.app.close();
    }
  });

  it("does not downgrade an already-running standalone send to initializing", async () => {
    const runId = "agent-e2e";
    const activeRun = new FakeRuntimeRun(runId, { initialStatus: "running", canInterrupt: true });
    const harness = await startAgentWsHarness({ runId, activeRun, metadata: buildMetadata(runId) });
    const socket = new WebSocket(`${harness.baseUrl}/ws/agent/${runId}`);
    const messages = captureMessages(socket);
    try {
      await waitForOpen(socket);
      await waitForBufferedMessage(messages, 0); // CONNECTED
      expect(await waitForBufferedMessage(messages, 1)).toEqual({
        type: "AGENT_STATUS",
        payload: { status: "running", can_interrupt: true, agent_id: runId },
      });

      socket.send(JSON.stringify(createSendCommand("hello while running", "msg-running-1")));
      const ack = await waitForMessageMatching(
        messages,
        (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.message_id === "msg-running-1",
        2,
      );
      expect(ack.payload).toMatchObject({
        state: "accepted",
        accepted: true,
        status: { status: "running", can_interrupt: true, agent_id: runId },
      });
      expect(messages.slice(2)).not.toContainEqual({
        type: "AGENT_STATUS",
        payload: { status: "initializing", can_interrupt: false, agent_id: runId },
      });
      expect(activeRun.messages).toHaveLength(1);
      expect(harness.agentRunService.restoreAgentRun).not.toHaveBeenCalled();
      expect(harness.agentRunService.activatePreparedRun).not.toHaveBeenCalled();
    } finally {
      socket.close();
      await harness.app.close();
    }
  });

  it("activates a prepared identity through SEND_MESSAGE rather than websocket connect", async () => {
    const runId = "agent-e2e";
    const metadata = buildMetadata(runId, {
      activationState: "PREPARED",
      platformAgentRunId: null,
      preparedAt: "2026-05-18T00:00:00.000Z",
      preparedExpiresAt: "2026-05-19T00:00:00.000Z",
    });
    const activatedRun = new FakeRuntimeRun(runId, { initialStatus: "idle" });
    let resolveActivation!: (run: FakeRuntimeRun) => void;
    const activationPromise = new Promise<FakeRuntimeRun>((resolve) => {
      resolveActivation = resolve;
    });
    const activatePreparedRun = vi.fn(() => activationPromise);
    const harness = await startAgentWsHarness({ runId, metadata, activatePreparedRun });
    const socket = new WebSocket(`${harness.baseUrl}/ws/agent/${runId}`);
    const messages = captureMessages(socket);
    try {
      await waitForOpen(socket);
      await waitForBufferedMessage(messages, 0); // CONNECTED
      expect(await waitForBufferedMessage(messages, 1)).toEqual({
        type: "AGENT_STATUS",
        payload: { status: "offline", can_interrupt: false, agent_id: runId },
      });
      expect(activatePreparedRun).not.toHaveBeenCalled();

      socket.send(JSON.stringify(createSendCommand("first prepared message", "msg-prepared-1")));
      await waitForMessageMatching(
        messages,
        (message) => message.type === "AGENT_STATUS" && message.payload.status === "initializing",
        2,
      );
      expect(activatePreparedRun).toHaveBeenCalledWith(runId);
      expect(harness.agentRunService.restoreAgentRun).not.toHaveBeenCalled();

      resolveActivation(activatedRun);
      const ack = await waitForMessageMatching(
        messages,
        (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.message_id === "msg-prepared-1",
        2,
      );
      expect(ack.payload).toMatchObject({ state: "accepted", accepted: true, duplicate: false });
      expect(activatedRun.messages).toHaveLength(1);
    } finally {
      socket.close();
      await harness.app.close();
    }
  });

  it("returns duplicate and busy ACKs for same and different in-flight command ids", async () => {
    const runId = "agent-e2e";
    let resolvePost!: (value: { accepted: true; turnId: string }) => void;
    const activeRun = new FakeRuntimeRun(runId, {
      initialStatus: "running",
      canInterrupt: true,
      postUserMessage: async () => new Promise((resolve) => {
        resolvePost = resolve;
      }),
    });
    const harness = await startAgentWsHarness({ runId, activeRun, metadata: buildMetadata(runId) });
    const socket = new WebSocket(`${harness.baseUrl}/ws/agent/${runId}`);
    const messages = captureMessages(socket);
    try {
      await waitForOpen(socket);
      await waitForBufferedMessage(messages, 0);
      await waitForBufferedMessage(messages, 1);

      socket.send(JSON.stringify(createSendCommand("first", "msg-busy-1")));
      await waitForCondition(() => activeRun.messages.length === 1);
      socket.send(JSON.stringify(createSendCommand("duplicate", "msg-busy-1")));
      socket.send(JSON.stringify(createSendCommand("second", "msg-busy-2")));

      const duplicateAck = await waitForMessageMatching(
        messages,
        (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.message_id === "msg-busy-1" && message.payload.duplicate === true,
        2,
      );
      expect(duplicateAck.payload).toMatchObject({
        state: "duplicate_in_progress",
        accepted: true,
        duplicate: true,
      });

      const busyAck = await waitForMessageMatching(
        messages,
        (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.message_id === "msg-busy-2",
        2,
      );
      expect(busyAck.payload).toMatchObject({
        state: "rejected",
        accepted: false,
        duplicate: false,
        code: "RUN_COMMAND_IN_PROGRESS",
      });
      expect(activeRun.messages).toHaveLength(1);

      resolvePost({ accepted: true, turnId: "turn-busy-1" });
      const acceptedAck = await waitForMessageMatching(
        messages,
        (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.message_id === "msg-busy-1" && message.payload.duplicate === false,
        2,
      );
      expect(acceptedAck.payload).toMatchObject({
        state: "accepted",
        accepted: true,
        duplicate: false,
      });
    } finally {
      socket.close();
      await harness.app.close();
    }
  });

  it("publishes error status and failed ACK when prepared activation fails", async () => {
    const runId = "agent-e2e";
    const metadata = buildMetadata(runId, {
      activationState: "PREPARED",
      platformAgentRunId: null,
      preparedAt: "2026-05-18T00:00:00.000Z",
      preparedExpiresAt: "2026-05-19T00:00:00.000Z",
    });
    const activatePreparedRun = vi.fn(async () => {
      throw new Error("activation exploded");
    });
    const harness = await startAgentWsHarness({ runId, metadata, activatePreparedRun });
    const socket = new WebSocket(`${harness.baseUrl}/ws/agent/${runId}`);
    const messages = captureMessages(socket);
    try {
      await waitForOpen(socket);
      await waitForBufferedMessage(messages, 0);
      await waitForBufferedMessage(messages, 1);

      socket.send(JSON.stringify(createSendCommand("will fail", "msg-fail-1")));
      await waitForMessageMatching(
        messages,
        (message) => message.type === "AGENT_STATUS" && message.payload.status === "initializing",
        2,
      );
      const errorStatus = await waitForMessageMatching(
        messages,
        (message) => message.type === "AGENT_STATUS" && message.payload.status === "error",
        2,
      );
      expect(errorStatus.payload).toMatchObject({ status: "error", can_interrupt: false, agent_id: runId, error_message: "activation exploded" });
      const ack = await waitForMessageMatching(
        messages,
        (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.message_id === "msg-fail-1",
        2,
      );
      expect(ack.payload).toMatchObject({
        state: "failed",
        accepted: false,
        duplicate: false,
        code: "ACTIVATION_FAILED",
        message: "activation exploded",
        status: { status: "error", can_interrupt: false, agent_id: runId },
      });
    } finally {
      socket.close();
      await harness.app.close();
    }
  });

  it("keeps non-SEND commands active-only after identity-only connect", async () => {
    const runId = "agent-e2e";
    const metadata = buildMetadata(runId);
    const harness = await startAgentWsHarness({ runId, metadata });
    const socket = new WebSocket(`${harness.baseUrl}/ws/agent/${runId}`);
    const messages = captureMessages(socket);
    try {
      await waitForOpen(socket);
      await waitForBufferedMessage(messages, 0);
      await waitForBufferedMessage(messages, 1);
      socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION" }));
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(harness.agentRunService.restoreAgentRun).not.toHaveBeenCalled();
      expect(harness.agentRunService.activatePreparedRun).not.toHaveBeenCalled();
      expect(messages).toHaveLength(2);
    } finally {
      socket.close();
      await harness.app.close();
    }
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
    const messages = captureMessages(socket);
    try {
      await waitForOpen(socket);

      socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { content: "too early" } }));
      const earlyResponse = await waitForBufferedMessage(messages, 0);

      expect(earlyResponse.type).toBe("ERROR");
      expect(earlyResponse.payload.code).toBe("SESSION_NOT_READY");
    } finally {
      socket.close();
      await app.close();
    }
  });
});
