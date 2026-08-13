import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { describe, expect, it, vi } from "vitest";
import type { AgentRunInputLifecycle, AgentRunInputLifecycleObserver } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { AgentRunCommandCoordinator } from "../../../src/agent-execution/services/agent-run-command-coordinator.js";
import { AgentRunCommandRegistry } from "../../../src/agent-execution/services/agent-run-command-registry.js";
import { AgentRunCommandStatusOverlayStore } from "../../../src/agent-execution/services/agent-run-command-status-overlay-store.js";

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
};

const createFakeRun = (input: { accepted?: boolean; active?: boolean } = {}) => {
  const observers = new Map<string, AgentRunInputLifecycleObserver>();
  const run = {
    runId: "run-1",
    postUserMessage: vi.fn(async (message, options) => {
      const messageId = String(message.metadata.message_id);
      observers.set(messageId, options.lifecycleObserver);
      options.lifecycleObserver({ kind: "admitted" });
      return input.accepted === false
        ? { accepted: false, code: "BUSY", message: "runtime busy", turnId: null }
        : { accepted: true, turnId: null };
    }),
    getStatusSnapshot: () => ({ status: "running", agent_id: "run-1" }),
    emit(messageId: string, fact: AgentRunInputLifecycle) {
      observers.get(messageId)?.(fact);
    },
  };
  return run;
};

const buildCoordinator = (input: {
  activeRun?: ReturnType<typeof createFakeRun> | null;
  restoredRun?: ReturnType<typeof createFakeRun>;
  restoreError?: Error;
  restoreAgentRun?: () => Promise<{ run: ReturnType<typeof createFakeRun> }>;
} = {}) => {
  const registry = new AgentRunCommandRegistry();
  const overlayStore = new AgentRunCommandStatusOverlayStore();
  const published: string[] = [];
  const restoredRun = input.restoredRun ?? createFakeRun();
  const agentRunService = {
    getAgentRun: vi.fn(() => input.activeRun ?? null),
    getRunMetadata: vi.fn(async () => ({ startedAt: "2026-08-13T00:00:00Z" })),
    restoreAgentRun: vi.fn(input.restoreAgentRun ?? (async () => {
      if (input.restoreError) throw input.restoreError;
      return { run: restoredRun };
    })),
    activatePreparedRun: vi.fn(),
    recordRunActivity: vi.fn(async () => undefined),
  };
  const projectionService = {
    getRunStatusProjection: vi.fn(async () => ({
      statusPayload: { status: "running", agent_id: "run-1" },
    })),
  };
  const coordinator = new AgentRunCommandCoordinator({
    agentRunService: agentRunService as never,
    registry,
    overlayStore,
    projectionService: projectionService as never,
    broadcaster: {
      publishToRun: vi.fn((_runId, message) => {
        published.push(message.toJson());
        return 1;
      }),
    } as never,
  });
  return { coordinator, registry, overlayStore, published, agentRunService, restoredRun };
};

const command = (messageId: string) => ({
  runId: "run-1",
  messageId,
  dedupeKey: `dedupe-${messageId}`,
  message: new AgentInputUserMessage(`message ${messageId}`),
});

describe("AgentRunCommandCoordinator", () => {
  it("registers the typed lifecycle observer before admission and never subscribes to raw events", async () => {
    const run = createFakeRun();
    const { coordinator, registry } = buildCoordinator({ activeRun: run });

    const result = await coordinator.postUserMessage(command("msg-1"));
    expect(result.ack).toMatchObject({ state: "accepted", accepted: true, duplicate: false });
    expect(registry.getRecord("run-1", "msg-1")?.state).toBe("ADMITTED");
    expect(run.postUserMessage).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ message_id: "msg-1" }) }),
      expect.objectContaining({ lifecycleObserver: expect.any(Function) }),
    );

    run.emit("msg-1", {
      kind: "forwarded",
      dispatchKind: "start_turn",
      turnId: null,
    });
    run.emit("msg-1", { kind: "turn_associated", turnId: "turn-1" });
    run.emit("msg-1", { kind: "completed", turnId: "turn-1" });
    expect(registry.getRecord("run-1", "msg-1")).toMatchObject({
      state: "COMPLETED",
      turnId: "turn-1",
    });
  });

  it("admits distinct commands concurrently while preserving duplicate replay", async () => {
    const run = createFakeRun();
    const { coordinator, registry } = buildCoordinator({ activeRun: run });

    const first = await coordinator.postUserMessage(command("msg-1"));
    const duplicate = await coordinator.postUserMessage(command("msg-1"));
    const second = await coordinator.postUserMessage(command("msg-2"));

    expect(first.ack.state).toBe("accepted");
    expect(duplicate.ack).toMatchObject({ state: "duplicate_in_progress", duplicate: true });
    expect(second.ack).toMatchObject({ state: "accepted", accepted: true });
    expect(run.postUserMessage).toHaveBeenCalledTimes(2);
    expect(registry.getOutstandingRecords("run-1")).toHaveLength(2);
  });

  it("settles dispatch failure and cancellation from the entry-bound lifecycle", async () => {
    const run = createFakeRun();
    const { coordinator, registry } = buildCoordinator({ activeRun: run });
    await coordinator.postUserMessage(command("msg-fail"));
    await coordinator.postUserMessage(command("msg-cancel"));

    run.emit("msg-fail", {
      kind: "failed",
      code: "RUNTIME_COMMAND_FAILED",
      message: "provider rejected",
      turnId: null,
    });
    run.emit("msg-cancel", {
      kind: "cancelled",
      code: "AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD",
    });

    expect(registry.getRecord("run-1", "msg-fail")).toMatchObject({
      state: "FAILED",
      code: "RUNTIME_REJECTED",
      message: "provider rejected",
    });
    expect(registry.getRecord("run-1", "msg-cancel")).toMatchObject({
      state: "CANCELLED",
      code: "AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD",
    });
  });

  it("shares one inactive-run activation across concurrent distinct commands", async () => {
    const run = createFakeRun();
    const restored = createDeferred<{ run: typeof run }>();
    const { coordinator, agentRunService } = buildCoordinator({
      restoredRun: run,
      restoreAgentRun: () => restored.promise,
    });

    const first = coordinator.postUserMessage(command("msg-1"));
    const second = coordinator.postUserMessage(command("msg-2"));
    await vi.waitFor(() => expect(agentRunService.restoreAgentRun).toHaveBeenCalledOnce());

    restored.resolve({ run });

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ ack: expect.objectContaining({ state: "accepted" }) }),
      expect.objectContaining({ ack: expect.objectContaining({ state: "accepted" }) }),
    ]);
    expect(run.postUserMessage).toHaveBeenCalledTimes(2);
    expect(agentRunService.restoreAgentRun).toHaveBeenCalledOnce();
  });

  it("keeps activation-only status overlay and clears it before live admission", async () => {
    const run = createFakeRun();
    const { coordinator, overlayStore, published } = buildCoordinator({ restoredRun: run });

    await coordinator.postUserMessage(command("msg-restore"));

    expect(published.map((raw) => JSON.parse(raw).payload.status)).toEqual(["initializing"]);
    expect(overlayStore.getOverlay("run-1")).toBeNull();
  });

  it("keeps activation failure as one failed record and error overlay", async () => {
    const { coordinator, registry, overlayStore } = buildCoordinator({
      restoreError: new Error("restore failed"),
    });
    const result = await coordinator.postUserMessage(command("msg-restore"));

    expect(result.ack).toMatchObject({ state: "failed", accepted: false, code: "ACTIVATION_FAILED" });
    expect(registry.getRecord("run-1", "msg-restore")?.state).toBe("FAILED");
    expect(overlayStore.getOverlay("run-1")?.status).toBe("error");
  });

  it("returns a rejected ACK when AgentRun refuses admission", async () => {
    const run = createFakeRun({ accepted: false });
    const { coordinator, registry } = buildCoordinator({ activeRun: run });
    const result = await coordinator.postUserMessage(command("msg-reject"));

    expect(result.ack).toMatchObject({
      state: "rejected",
      accepted: false,
      code: "RUNTIME_REJECTED",
      message: "runtime busy",
    });
    expect(registry.getRecord("run-1", "msg-reject")?.state).toBe("REJECTED");
  });
});
