import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunCommandCoordinator } from "../../../src/agent-execution/services/agent-run-command-coordinator.js";
import { AgentRunCommandRegistry } from "../../../src/agent-execution/services/agent-run-command-registry.js";
import { AgentRunCommandStatusOverlayStore } from "../../../src/agent-execution/services/agent-run-command-status-overlay-store.js";
import { AgentRunStatusProjectionService } from "../../../src/agent-execution/services/agent-run-status-projection-service.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";

const metadata: AgentRunMetadata = {
  runId: "run-1",
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace",
  memoryDir: "/tmp/memory/agents/run-1",
  llmModelIdentifier: "model-1",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: "thread-1",
  preparedAt: "2026-05-17T00:00:00.000Z",
  preparedExpiresAt: "2026-05-18T00:00:00.000Z",
  startedAt: "2026-05-17T00:05:00.000Z",
};

const createFakeRun = (options: {
  status?: "initializing" | "running" | "idle" | "error";
  statusAfterPostBegins?: "initializing" | "running" | "idle" | "error";
  canInterrupt?: boolean;
  accepted?: boolean;
  rejectMessage?: string;
  resultTurnId?: string | null;
} = {}) => {
  const listeners = new Set<(event: unknown) => void>();
  let status = options.status ?? "idle";
  return {
    runId: "run-1",
    postUserMessage: vi.fn(async () => {
      status = options.statusAfterPostBegins ?? status;
      return {
        accepted: options.accepted ?? true,
        turnId: options.accepted === false ? null : options.resultTurnId === undefined ? "turn-1" : options.resultTurnId,
        message: options.rejectMessage,
      };
    }),
    subscribeToEvents: vi.fn((listener: (event: unknown) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    getStatusSnapshot: () => ({
      status,
      can_interrupt: status === "running" && options.canInterrupt === true,
      agent_id: "run-1",
    }),
    emitStatus(status: "initializing" | "running" | "idle" | "error") {
      const event: AgentRunEvent = {
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: "run-1",
        payload: { status, can_interrupt: false, agent_id: "run-1" },
        statusHint: status === "running" ? "ACTIVE" : status === "error" ? "ERROR" : "IDLE",
      };
      listeners.forEach((listener) => listener(event));
    },
    emitTurnStarted(turnId = "turn-1") {
      const event: AgentRunEvent = {
        eventType: AgentRunEventType.TURN_STARTED,
        runId: "run-1",
        payload: { turn_id: turnId },
        statusHint: "ACTIVE",
      };
      listeners.forEach((listener) => listener(event));
    },
    emitTurnTerminal(turnId: string | null = "turn-1") {
      const event: AgentRunEvent = {
        eventType: AgentRunEventType.TURN_COMPLETED,
        runId: "run-1",
        payload: turnId ? { turn_id: turnId } : {},
        statusHint: "IDLE",
      };
      listeners.forEach((listener) => listener(event));
    },
    emitError(input: {
      scope: "turn" | "runtime";
      effect: "diagnostic" | "terminal";
      turnId?: string;
    }) {
      const event: AgentRunEvent = {
        eventType: AgentRunEventType.ERROR,
        runId: "run-1",
        payload: {
          code: "RUNTIME_ERROR",
          message: "runtime event",
          error_scope: input.scope,
          error_effect: input.effect,
          ...(input.turnId ? { turn_id: input.turnId } : {}),
        },
        statusHint: input.effect === "terminal" ? "ERROR" : null,
      };
      listeners.forEach((listener) => listener(event));
    },
  };
};

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

const publishedStatusPayloads = (published: string[]) =>
  published
    .map((raw) => JSON.parse(raw))
    .filter((message) => message.type === "AGENT_STATUS")
    .map((message) => message.payload);

const buildCoordinator = (options: {
  restorePromise: Promise<{ run: ReturnType<typeof createFakeRun> }>;
  activeRun?: ReturnType<typeof createFakeRun> | null;
}) => {
  const registry = new AgentRunCommandRegistry();
  const overlayStore = new AgentRunCommandStatusOverlayStore();
  const published: string[] = [];
  const agentRunService = {
    getAgentRun: vi.fn(() => options.activeRun ?? null),
    getRunMetadata: vi.fn(async () => metadata),
    restoreAgentRun: vi.fn(() => options.restorePromise),
    activatePreparedRun: vi.fn(),
    recordRunActivity: vi.fn(async () => undefined),
  } as any;
  const projectionService = new AgentRunStatusProjectionService({
    agentRunManager: { getActiveRun: vi.fn(() => options.activeRun ?? null) } as any,
    metadataService: { readMetadata: vi.fn(async () => metadata) } as any,
    overlayStore,
    commandRegistry: registry,
  });
  const coordinator = new AgentRunCommandCoordinator({
    agentRunService,
    registry,
    overlayStore,
    projectionService,
    broadcaster: {
      publishToRun: vi.fn((_runId, message) => {
        published.push(message.toJson());
        return 1;
      }),
    } as any,
  });
  return { coordinator, registry, overlayStore, published, agentRunService };
};

describe("AgentRunCommandCoordinator", () => {
  it("keeps inactive-restore accepted-result running status aligned with the following ACK", async () => {
    const fakeRun = createFakeRun({ status: "initializing" });
    let resolveRestore!: (value: { run: ReturnType<typeof createFakeRun> }) => void;
    const restorePromise = new Promise<{ run: ReturnType<typeof createFakeRun> }>((resolve) => {
      resolveRestore = resolve;
    });
    const { coordinator, published, agentRunService } = buildCoordinator({ restorePromise });

    const pending = coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
      message: new AgentInputUserMessage("hello"),
    });

    await Promise.resolve();
    expect(published.map((raw) => JSON.parse(raw))).toContainEqual({
      type: "AGENT_STATUS",
      payload: { status: "initializing", can_interrupt: false, agent_id: "run-1" },
    });
    expect(agentRunService.restoreAgentRun).toHaveBeenCalledWith("run-1");

    resolveRestore({ run: fakeRun });
    const result = await pending;

    expect(result.ack).toMatchObject({
      state: "accepted",
      accepted: true,
      duplicate: false,
      message_id: "msg-1",
      status: { status: "running", can_interrupt: false, agent_id: "run-1" },
    });
    expect([
      ...publishedStatusPayloads(published).map((payload) => payload.status),
      result.ack.status?.status,
    ]).toEqual(["initializing", "running", "running"]);
    expect(fakeRun.postUserMessage).toHaveBeenCalledOnce();
    expect(fakeRun.postUserMessage.mock.calls[0][0].metadata).toMatchObject({
      message_id: "msg-1",
      dedupe_key: "dedupe-1",
    });
  });

  it("does not downgrade an already-running active runtime to initializing", async () => {
    const fakeRun = createFakeRun({ status: "running", canInterrupt: true });
    const { coordinator, overlayStore, published, agentRunService } = buildCoordinator({
      restorePromise: Promise.resolve({ run: fakeRun }),
      activeRun: fakeRun,
    });

    const result = await coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
      message: new AgentInputUserMessage("hello"),
    });

    expect(agentRunService.restoreAgentRun).not.toHaveBeenCalled();
    expect(overlayStore.getOverlay("run-1")).toBeNull();
    expect(published.map((raw) => JSON.parse(raw))).not.toContainEqual({
      type: "AGENT_STATUS",
      payload: { status: "initializing", can_interrupt: false, agent_id: "run-1" },
    });
    expect(result.ack).toMatchObject({
      state: "accepted",
      accepted: true,
      status: { status: "running", can_interrupt: true, agent_id: "run-1" },
    });
  });

  it("keeps active-idle accepted-result running status aligned with the following ACK", async () => {
    const fakeRun = createFakeRun({
      status: "idle",
      statusAfterPostBegins: "initializing",
    });
    const { coordinator, published } = buildCoordinator({
      restorePromise: Promise.resolve({ run: fakeRun }),
      activeRun: fakeRun,
    });

    const result = await coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
      message: new AgentInputUserMessage("hello"),
    });

    expect([
      ...publishedStatusPayloads(published).map((payload) => payload.status),
      result.ack.status?.status,
    ]).toEqual(["running", "running"]);
    expect(result.ack.status).toEqual({
      status: "running",
      can_interrupt: false,
      agent_id: "run-1",
    });
  });

  it("keeps active-runtime command rejection ACK status consistent without publishing lifecycle error", async () => {
    const fakeRun = createFakeRun({
      status: "running",
      canInterrupt: true,
      accepted: false,
      rejectMessage: "runtime busy",
    });
    const { coordinator, overlayStore, published } = buildCoordinator({
      restorePromise: Promise.resolve({ run: fakeRun }),
      activeRun: fakeRun,
    });

    const result = await coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
      message: new AgentInputUserMessage("hello"),
    });

    expect(overlayStore.getOverlay("run-1")).toBeNull();
    expect(published.map((raw) => JSON.parse(raw))).not.toContainEqual({
      type: "AGENT_STATUS",
      payload: { status: "error", can_interrupt: false, agent_id: "run-1" },
    });
    expect(result.ack).toMatchObject({
      state: "failed",
      accepted: false,
      code: "RUNTIME_REJECTED",
      message: "runtime busy",
      status: { status: "running", can_interrupt: true, agent_id: "run-1" },
    });
  });

  it("deduplicates same command id and rejects different id while command is in progress", async () => {
    const fakeRun = createFakeRun();
    const { coordinator, agentRunService } = buildCoordinator({
      restorePromise: Promise.resolve({ run: fakeRun }),
    });
    fakeRun.postUserMessage.mockImplementationOnce(async () => new Promise(() => undefined));

    void coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
      message: new AgentInputUserMessage("hello"),
    });
    await Promise.resolve();
    await Promise.resolve();

    const duplicate = await coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
      message: new AgentInputUserMessage("hello"),
    });
    const rejected = await coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-2",
      dedupeKey: "dedupe-2",
      message: new AgentInputUserMessage("next"),
    });

    expect(duplicate.ack).toMatchObject({ state: "duplicate_in_progress", accepted: true, duplicate: true });
    expect(rejected.ack).toMatchObject({ state: "rejected", accepted: false, code: "RUN_COMMAND_IN_PROGRESS" });
    expect(agentRunService.restoreAgentRun).toHaveBeenCalledTimes(1);
    expect(fakeRun.postUserMessage).toHaveBeenCalledTimes(1);
  });

  it("clears command overlay when live runtime status arrives", async () => {
    const fakeRun = createFakeRun({ resultTurnId: null });
    const { coordinator, overlayStore } = buildCoordinator({
      restorePromise: Promise.resolve({ run: fakeRun }),
    });

    await coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
      message: new AgentInputUserMessage("hello"),
    });
    expect(overlayStore.getOverlay("run-1")).not.toBeNull();

    fakeRun.emitStatus("running");
    expect(overlayStore.getOverlay("run-1")).toBeNull();
  });

  it("does not let delayed terminal A settle identified command B before or after result capture", async () => {
    const fakeRun = createFakeRun();
    let resolvePost!: (value: { accepted: true; turnId: string }) => void;
    fakeRun.postUserMessage.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePost = resolve;
    }));
    const { coordinator, registry } = buildCoordinator({
      restorePromise: Promise.resolve({ run: fakeRun }),
      activeRun: fakeRun,
    });

    const pending = coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-b",
      dedupeKey: "dedupe-b",
      message: new AgentInputUserMessage("B"),
    });
    await flushAsync();
    fakeRun.emitTurnTerminal("turn-a");
    fakeRun.emitTurnStarted("turn-b");
    resolvePost({ accepted: true, turnId: "turn-b" });
    await pending;

    expect(registry.getRecord("run-1", "msg-b")).toMatchObject({
      state: "FORWARDED",
      association: { kind: "IDENTIFIED", turnId: "turn-b" },
    });
    fakeRun.emitTurnTerminal("turn-a");
    expect(registry.getRecord("run-1", "msg-b")?.state).toBe("FORWARDED");
    fakeRun.emitTurnTerminal("turn-b");
    expect(registry.getRecord("run-1", "msg-b")?.state).toBe("COMPLETED");
  });

  it("ignores diagnostics but fails once on matching turn-terminal evidence", async () => {
    const fakeRun = createFakeRun({ status: "running" });
    const { coordinator, registry } = buildCoordinator({
      restorePromise: Promise.resolve({ run: fakeRun }),
      activeRun: fakeRun,
    });
    await coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
      message: new AgentInputUserMessage("hello"),
    });

    fakeRun.emitError({ scope: "turn", effect: "diagnostic", turnId: "turn-1" });
    expect(registry.getRecord("run-1", "msg-1")?.state).toBe("FORWARDED");
    fakeRun.emitError({ scope: "turn", effect: "terminal", turnId: "turn-1" });
    expect(registry.getRecord("run-1", "msg-1")).toMatchObject({
      state: "FAILED",
      code: "RUNTIME_REJECTED",
    });
    fakeRun.emitTurnTerminal("turn-1");
    expect(registry.getRecord("run-1", "msg-1")?.state).toBe("FAILED");
  });

  it("replays a fast matching turn-terminal only after accepted result identity", async () => {
    const fakeRun = createFakeRun();
    let resolvePost!: (value: { accepted: true; turnId: string }) => void;
    fakeRun.postUserMessage.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePost = resolve;
    }));
    const { coordinator, registry } = buildCoordinator({
      restorePromise: Promise.resolve({ run: fakeRun }),
      activeRun: fakeRun,
    });
    const pending = coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
      message: new AgentInputUserMessage("hello"),
    });
    await flushAsync();
    fakeRun.emitError({ scope: "turn", effect: "terminal", turnId: "turn-1" });
    expect(registry.getRecord("run-1", "msg-1")?.state).toBe("FORWARDED");

    resolvePost({ accepted: true, turnId: "turn-1" });
    const result = await pending;
    expect(result.ack).toMatchObject({ state: "failed", accepted: false });
    expect(registry.getRecord("run-1", "msg-1")?.state).toBe("FAILED");
  });

  it("lets explicit runtime-global failure settle pending identity without result resurrection", async () => {
    const fakeRun = createFakeRun();
    let resolvePost!: (value: { accepted: true; turnId: string }) => void;
    fakeRun.postUserMessage.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePost = resolve;
    }));
    const { coordinator, registry } = buildCoordinator({
      restorePromise: Promise.resolve({ run: fakeRun }),
      activeRun: fakeRun,
    });
    const pending = coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
      message: new AgentInputUserMessage("hello"),
    });
    await flushAsync();
    fakeRun.emitError({ scope: "runtime", effect: "terminal" });
    expect(registry.getRecord("run-1", "msg-1")?.state).toBe("FAILED");

    resolvePost({ accepted: true, turnId: "turn-1" });
    const result = await pending;
    expect(result.ack).toMatchObject({ state: "failed", accepted: false });
    expect(registry.getRecord("run-1", "msg-1")?.association.kind).toBe("PENDING_IDENTITY");
  });

  it("arms an accepted anonymous command only on later positive active evidence", async () => {
    const fakeRun = createFakeRun({ resultTurnId: null });
    const { coordinator, registry } = buildCoordinator({
      restorePromise: Promise.resolve({ run: fakeRun }),
      activeRun: fakeRun,
    });
    await coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
      message: new AgentInputUserMessage("hello"),
    });
    expect(registry.getRecord("run-1", "msg-1")?.association.kind)
      .toBe("AWAITING_ANONYMOUS_START");

    fakeRun.emitTurnTerminal(null);
    expect(registry.getRecord("run-1", "msg-1")?.state).toBe("FORWARDED");
    fakeRun.emitTurnStarted("");
    expect(registry.getRecord("run-1", "msg-1")?.association.kind).toBe("ANONYMOUS_ARMED");
    fakeRun.emitTurnTerminal(null);
    expect(registry.getRecord("run-1", "msg-1")?.state).toBe("COMPLETED");
  });

  it("keeps restored running snapshot internal until command-correlated execution event", async () => {
    const fakeRun = createFakeRun({ status: "running", canInterrupt: true });
    let resolveRestore!: (value: { run: ReturnType<typeof createFakeRun> }) => void;
    let resolvePost!: (value: { accepted: true; turnId: string }) => void;
    const restorePromise = new Promise<{ run: ReturnType<typeof createFakeRun> }>((resolve) => {
      resolveRestore = resolve;
    });
    fakeRun.postUserMessage.mockImplementationOnce(async () =>
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );
    const { coordinator, overlayStore, published } = buildCoordinator({ restorePromise });

    const pending = coordinator.postUserMessage({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
      message: new AgentInputUserMessage("hello"),
    });

    await Promise.resolve();
    expect(publishedStatusPayloads(published).map((payload) => payload.status)).toEqual([
      "initializing",
    ]);

    resolveRestore({ run: fakeRun });
    await flushAsync();

    expect(fakeRun.postUserMessage).toHaveBeenCalledOnce();
    expect(overlayStore.getOverlay("run-1")?.status).toBe("initializing");
    expect(publishedStatusPayloads(published).map((payload) => payload.status)).toEqual([
      "initializing",
    ]);

    fakeRun.emitTurnStarted("turn-1");

    expect(overlayStore.getOverlay("run-1")?.status).toBe("initializing");
    expect(publishedStatusPayloads(published).map((payload) => payload.status)).toEqual([
      "initializing",
    ]);

    resolvePost({ accepted: true, turnId: "turn-1" });
    const result = await pending;
    expect(overlayStore.getOverlay("run-1")).toBeNull();
    expect(publishedStatusPayloads(published)).toMatchObject([
      { status: "initializing", can_interrupt: false, agent_id: "run-1" },
      { status: "running", can_interrupt: true, agent_id: "run-1" },
    ]);
    expect(result.ack).toMatchObject({
      state: "accepted",
      accepted: true,
      message_id: "msg-1",
    });
  });
});
