import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../src/agent-execution/domain/agent-runtime-lifecycle-snapshot.js";
import type {
  AgentRunBackendInputDispatch,
  AgentRunBackendInputDispatchResult,
  AgentRunInputLifecycle,
} from "../../../src/agent-execution/input/agent-run-input-contract.js";

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const event = (
  runId: string,
  eventType: AgentRunEventType,
  payload: Record<string, unknown>,
): AgentRunEvent => ({ eventType, runId, payload, statusHint: null });

const createHarness = (options: {
  runId?: string;
  snapshot?: AgentRuntimeLifecycleSnapshot;
  append?: "supported" | "unsupported";
  dispatchUserInput?: ReturnType<typeof vi.fn>;
  interrupt?: ReturnType<typeof vi.fn>;
  terminate?: ReturnType<typeof vi.fn>;
} = {}) => {
  const runId = options.runId ?? "agent-run-1";
  const context = new AgentRunContext({
    runId,
    config: new AgentRunConfig({
      runtimeKind: "codex_app_server",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "gpt-5.3-codex",
      autoExecuteTools: false,
      workspaceId: null,
      llmConfig: null,
      skillAccessMode: null,
    }),
    runtimeContext: null,
  });
  let snapshot: AgentRuntimeLifecycleSnapshot = options.snapshot ?? {
    availability: "active",
    phase: "idle",
    currentTurn: { kind: "NONE" },
  };
  let sourceListener:
    | ((events: readonly AgentRunEvent[]) => void | Promise<void>)
    | null = null;
  const backend = {
    runId,
    runtimeKind: context.config.runtimeKind,
    inputCapabilities: { activeTurnAppend: options.append ?? "unsupported" },
    getContext: () => context,
    getPlatformAgentRunId: () => "platform-run-1",
    isActive: () => snapshot.availability === "active",
    getLifecycleSnapshot: () => snapshot,
    subscribeToSourceEventBatches: vi.fn().mockImplementation(
      (next: (events: readonly AgentRunEvent[]) => void | Promise<void>) => {
        sourceListener = next;
        return () => { sourceListener = null; };
      },
    ),
    dispatchUserInput: options.dispatchUserInput ?? vi.fn().mockResolvedValue({
      forwarded: true,
      turnId: null,
    }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interrupt: options.interrupt ?? vi.fn().mockResolvedValue({ accepted: true }),
    terminate: options.terminate ?? vi.fn().mockResolvedValue({ accepted: true }),
  };
  const run = new AgentRun({ context, backend: backend as never });
  return {
    backend,
    run,
    getSourceListener: () => sourceListener,
    setSnapshot: (value: AgentRuntimeLifecycleSnapshot) => { snapshot = value; },
  };
};

describe("AgentRun input admission", () => {
  it("returns admission before an idle start dispatch settles and records forwarding once", async () => {
    const deferred = createDeferred<AgentRunBackendInputDispatchResult>();
    const harness = createHarness({
      dispatchUserInput: vi.fn().mockReturnValue(deferred.promise),
    });
    const lifecycle: AgentRunInputLifecycle[] = [];

    const result = await harness.run.postUserMessage(
      new AgentInputUserMessage("start"),
      { lifecycleObserver: (fact) => lifecycle.push(fact) },
    );

    expect(result).toEqual({ accepted: true, turnId: null });
    expect(harness.backend.dispatchUserInput).toHaveBeenCalledWith({
      kind: "start_turn",
      message: expect.objectContaining({ content: "start" }),
    });
    expect(lifecycle).toEqual([{ kind: "admitted" }]);
    expect(harness.run.getStatusSnapshot().status).toBe("initializing");

    deferred.resolve({ forwarded: true, turnId: "turn-1" });
    await vi.waitFor(() => expect(lifecycle).toContainEqual({
      kind: "turn_associated",
      turnId: "turn-1",
    }));
    expect(lifecycle).toEqual([
      { kind: "admitted" },
      { kind: "forwarded", dispatchKind: "start_turn", turnId: "turn-1" },
      { kind: "turn_associated", turnId: "turn-1" },
    ]);
  });

  it("claims exact active Codex append and exposes only that atomic turn id", async () => {
    const harness = createHarness({
      append: "supported",
      snapshot: {
        availability: "active",
        phase: "running",
        currentTurn: { kind: "IDENTIFIED", turnId: "turn-active" },
      },
    });

    const result = await harness.run.postUserMessage(new AgentInputUserMessage("steer"));

    expect(result).toEqual({ accepted: true, turnId: "turn-active" });
    expect(harness.backend.dispatchUserInput).toHaveBeenCalledWith({
      kind: "append_to_active_turn",
      turnId: "turn-active",
      message: expect.objectContaining({ content: "steer" }),
    });
  });

  it("admits Claude/AutoByteus input while active and starts it only after terminal", async () => {
    const harness = createHarness({
      append: "unsupported",
      snapshot: {
        availability: "active",
        phase: "running",
        currentTurn: { kind: "IDENTIFIED", turnId: "turn-active" },
      },
    });

    await expect(harness.run.postUserMessage(new AgentInputUserMessage("reply"))).resolves.toEqual({
      accepted: true,
      turnId: null,
    });
    expect(harness.backend.dispatchUserInput).not.toHaveBeenCalled();

    harness.setSnapshot({
      availability: "active",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    });
    await harness.getSourceListener()?.([
      event(harness.run.runId, AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-active" }),
    ]);

    await vi.waitFor(() => expect(harness.backend.dispatchUserInput).toHaveBeenCalledWith({
      kind: "start_turn",
      message: expect.objectContaining({ content: "reply" }),
    }));
  });

  it("retains anonymous-turn input until the canonical terminal instead of guessing", async () => {
    const harness = createHarness({
      append: "supported",
      snapshot: {
        availability: "active",
        phase: "running",
        currentTurn: { kind: "ANONYMOUS" },
      },
    });

    await expect(harness.run.postUserMessage(new AgentInputUserMessage("wait"))).resolves.toEqual({
      accepted: true,
      turnId: null,
    });
    expect(harness.backend.dispatchUserInput).not.toHaveBeenCalled();

    harness.setSnapshot({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } });
    await harness.getSourceListener()?.([
      event(harness.run.runId, AgentRunEventType.TURN_COMPLETED, {}),
    ]);
    await vi.waitFor(() => expect(harness.backend.dispatchUserInput).toHaveBeenCalledWith({
      kind: "start_turn",
      message: expect.objectContaining({ content: "wait" }),
    }));
  });

  it("keeps several next-turn inputs FIFO and one provider invocation at a time", async () => {
    const first = createDeferred<AgentRunBackendInputDispatchResult>();
    const second = createDeferred<AgentRunBackendInputDispatchResult>();
    const dispatch = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const harness = createHarness({ dispatchUserInput: dispatch });

    await harness.run.postUserMessage(new AgentInputUserMessage("first"));
    await harness.run.postUserMessage(new AgentInputUserMessage("second"));
    expect(dispatch).toHaveBeenCalledTimes(1);

    first.resolve({ forwarded: true, turnId: "turn-1" });
    await vi.waitFor(() => expect(harness.run.getStatusSnapshot().status).toBe("running"));
    expect(dispatch).toHaveBeenCalledTimes(1);

    harness.setSnapshot({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } });
    await harness.getSourceListener()?.([
      event(harness.run.runId, AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-1" }),
    ]);
    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(2));
    expect((dispatch.mock.calls[1]?.[0] as AgentRunBackendInputDispatch).message.content).toBe("second");
    second.resolve({ forwarded: true, turnId: "turn-2" });
  });

  it("orders synchronous start and terminal facts behind forwarding result", async () => {
    const lifecycle: AgentRunInputLifecycle[] = [];
    let harness: ReturnType<typeof createHarness>;
    const dispatch = vi.fn().mockImplementation(async () => {
      harness.setSnapshot({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } });
      await harness.getSourceListener()?.([
        event("agent-run-sync", AgentRunEventType.TURN_STARTED, { turn_id: "turn-sync" }),
        event("agent-run-sync", AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-sync" }),
      ]);
      return { forwarded: true, turnId: "turn-sync" };
    });
    harness = createHarness({ runId: "agent-run-sync", dispatchUserInput: dispatch });

    await harness.run.postUserMessage(new AgentInputUserMessage("sync"), {
      lifecycleObserver: (fact) => lifecycle.push(fact),
    });

    await vi.waitFor(() => expect(lifecycle.at(-1)).toEqual({
      kind: "completed",
      turnId: "turn-sync",
    }));
    expect(lifecycle).toEqual([
      { kind: "admitted" },
      { kind: "forwarded", dispatchKind: "start_turn", turnId: "turn-sync" },
      { kind: "turn_associated", turnId: "turn-sync" },
      { kind: "completed", turnId: "turn-sync" },
    ]);
  });

  it("does not retry or convert a rejected append", async () => {
    const lifecycle: AgentRunInputLifecycle[] = [];
    const harness = createHarness({
      append: "supported",
      snapshot: {
        availability: "active",
        phase: "running",
        currentTurn: { kind: "IDENTIFIED", turnId: "turn-active" },
      },
      dispatchUserInput: vi.fn().mockResolvedValue({
        forwarded: false,
        code: "STEER_REJECTED",
        message: "no",
        turnId: null,
      }),
    });

    await harness.run.postUserMessage(new AgentInputUserMessage("append"), {
      lifecycleObserver: (fact) => lifecycle.push(fact),
    });
    await vi.waitFor(() => expect(lifecycle.at(-1)).toMatchObject({ kind: "failed" }));
    expect(harness.backend.dispatchUserInput).toHaveBeenCalledTimes(1);
    expect(harness.backend.dispatchUserInput.mock.calls[0]?.[0]).toMatchObject({
      kind: "append_to_active_turn",
    });
  });

  it("settles reject-after-start as one protocol failure without retry", async () => {
    const lifecycle: AgentRunInputLifecycle[] = [];
    let harness: ReturnType<typeof createHarness>;
    const dispatch = vi.fn().mockImplementation(async () => {
      harness.setSnapshot({
        availability: "active",
        phase: "running",
        currentTurn: { kind: "IDENTIFIED", turnId: "turn-observed" },
      });
      await harness.getSourceListener()?.([
        event("agent-run-protocol", AgentRunEventType.TURN_STARTED, { turn_id: "turn-observed" }),
      ]);
      return {
        forwarded: false,
        code: "PROVIDER_REJECTED",
        message: "late rejection",
        turnId: null,
      };
    });
    harness = createHarness({ runId: "agent-run-protocol", dispatchUserInput: dispatch });

    await harness.run.postUserMessage(new AgentInputUserMessage("start"), {
      lifecycleObserver: (fact) => lifecycle.push(fact),
    });

    await vi.waitFor(() => expect(lifecycle.at(-1)).toEqual({
      kind: "failed",
      code: "AGENT_RUN_INPUT_PROVIDER_PROTOCOL_VIOLATION",
      message: "Provider rejected input after publishing a canonical turn start.",
      turnId: "turn-observed",
    }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(lifecycle.filter((fact) => fact.kind === "failed")).toHaveLength(1);
  });

  it("keeps append-capable input FIFO-owned through interrupt acceptance until terminal", async () => {
    const interruptResult = createDeferred<AgentOperationResult>();
    const harness = createHarness({
      append: "supported",
      interrupt: vi.fn().mockReturnValue(interruptResult.promise),
      snapshot: {
        availability: "active",
        phase: "running",
        currentTurn: { kind: "IDENTIFIED", turnId: "turn-active" },
      },
    });

    const stop = harness.run.interrupt();
    await vi.waitFor(() => expect(harness.backend.interrupt).toHaveBeenCalledOnce());
    await expect(harness.run.postUserMessage(
      new AgentInputUserMessage("after interrupt"),
    )).resolves.toEqual({ accepted: true, turnId: null });
    expect(harness.backend.interrupt).toHaveBeenCalledWith("turn-active");
    expect(harness.backend.dispatchUserInput).not.toHaveBeenCalled();

    interruptResult.resolve({ accepted: true, turnId: "turn-active" });
    await expect(stop).resolves.toEqual({ accepted: true, turnId: "turn-active" });
    expect(harness.backend.dispatchUserInput).not.toHaveBeenCalled();

    harness.setSnapshot({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } });
    await harness.getSourceListener()?.([
      event(harness.run.runId, AgentRunEventType.TURN_INTERRUPTED, { turn_id: "turn-active" }),
    ]);
    await vi.waitFor(() => expect(harness.backend.dispatchUserInput).toHaveBeenCalledWith({
      kind: "start_turn",
      message: expect.objectContaining({ content: "after interrupt" }),
    }));
  });

  it("resumes exact active-turn append after interrupt rejection", async () => {
    const interruptResult = createDeferred<AgentOperationResult>();
    const harness = createHarness({
      append: "supported",
      interrupt: vi.fn().mockReturnValue(interruptResult.promise),
      snapshot: {
        availability: "active",
        phase: "running",
        currentTurn: { kind: "IDENTIFIED", turnId: "turn-active" },
      },
    });

    const stop = harness.run.interrupt();
    await vi.waitFor(() => expect(harness.backend.interrupt).toHaveBeenCalledOnce());
    await harness.run.postUserMessage(new AgentInputUserMessage("append after rejection"));
    expect(harness.backend.dispatchUserInput).not.toHaveBeenCalled();

    interruptResult.resolve({ accepted: false, code: "INTERRUPT_REJECTED" });
    await expect(stop).resolves.toEqual({ accepted: false, code: "INTERRUPT_REJECTED" });
    await vi.waitFor(() => expect(harness.backend.dispatchUserInput).toHaveBeenCalledWith({
      kind: "append_to_active_turn",
      turnId: "turn-active",
      message: expect.objectContaining({ content: "append after rejection" }),
    }));
    expect(harness.backend.interrupt).toHaveBeenCalledOnce();
    expect(harness.backend.dispatchUserInput).toHaveBeenCalledOnce();
  });

  it("resumes exact active-turn append after interrupt failure", async () => {
    const interruptResult = createDeferred<AgentOperationResult>();
    const harness = createHarness({
      append: "supported",
      interrupt: vi.fn().mockReturnValue(interruptResult.promise),
      snapshot: {
        availability: "active",
        phase: "running",
        currentTurn: { kind: "IDENTIFIED", turnId: "turn-active" },
      },
    });

    const stop = harness.run.interrupt();
    const stopFailure = expect(stop).rejects.toThrow("interrupt failed");
    await vi.waitFor(() => expect(harness.backend.interrupt).toHaveBeenCalledOnce());
    await harness.run.postUserMessage(new AgentInputUserMessage("append after failure"));
    expect(harness.backend.dispatchUserInput).not.toHaveBeenCalled();

    interruptResult.reject(new Error("interrupt failed"));
    await stopFailure;
    await vi.waitFor(() => expect(harness.backend.dispatchUserInput).toHaveBeenCalledWith({
      kind: "append_to_active_turn",
      turnId: "turn-active",
      message: expect.objectContaining({ content: "append after failure" }),
    }));
    expect(harness.backend.interrupt).toHaveBeenCalledOnce();
    expect(harness.backend.dispatchUserInput).toHaveBeenCalledOnce();
  });

  it("reserves one no-id interrupt and lets a canonical terminal win provider-result ordering", async () => {
    const deferred = createDeferred<AgentOperationResult>();
    const interrupt = vi.fn().mockReturnValue(deferred.promise);
    const harness = createHarness({
      append: "supported",
      interrupt,
      snapshot: {
        availability: "active",
        phase: "running",
        currentTurn: { kind: "IDENTIFIED", turnId: "turn-active" },
      },
    });

    const standaloneStop = harness.run.interrupt(null);
    const teamStop = harness.run.interrupt();
    await vi.waitFor(() => expect(interrupt).toHaveBeenCalledOnce());
    expect(interrupt).toHaveBeenCalledWith("turn-active");
    await expect(harness.run.postUserMessage(
      new AgentInputUserMessage("after terminal"),
    )).resolves.toEqual({ accepted: true, turnId: null });
    expect(harness.backend.dispatchUserInput).not.toHaveBeenCalled();

    harness.setSnapshot({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } });
    await harness.getSourceListener()?.([
      event(harness.run.runId, AgentRunEventType.TURN_INTERRUPTED, { turn_id: "turn-active" }),
    ]);
    await vi.waitFor(() => expect(harness.backend.dispatchUserInput).toHaveBeenCalledWith({
      kind: "start_turn",
      message: expect.objectContaining({ content: "after terminal" }),
    }));

    deferred.resolve({ accepted: true, turnId: "turn-active" });
    await expect(Promise.all([standaloneStop, teamStop])).resolves.toEqual([
      { accepted: true, turnId: "turn-active" },
      { accepted: true, turnId: "turn-active" },
    ]);
    expect(interrupt).toHaveBeenCalledOnce();
    expect(harness.backend.dispatchUserInput).toHaveBeenCalledOnce();
  });

  it("rejects an interrupt target mismatch before provider I/O", async () => {
    const harness = createHarness({
      snapshot: {
        availability: "active",
        phase: "running",
        currentTurn: { kind: "IDENTIFIED", turnId: "turn-active" },
      },
    });

    await expect(harness.run.interrupt("turn-foreign")).resolves.toMatchObject({
      accepted: false,
      code: "TURN_MISMATCH",
    });
    expect(harness.backend.interrupt).not.toHaveBeenCalled();
  });

  it("passes an anonymous canonical active turn as exact null provider mechanics", async () => {
    const harness = createHarness({
      snapshot: {
        availability: "active",
        phase: "running",
        currentTurn: { kind: "ANONYMOUS" },
      },
    });

    await expect(harness.run.interrupt()).resolves.toEqual({ accepted: true });
    expect(harness.backend.interrupt).toHaveBeenCalledWith(null);
  });

  it("keeps an earlier reservation intact until its owner commits and the released input terminates", async () => {
    const dispatch = createDeferred<AgentRunBackendInputDispatchResult>();
    const lifecycle: AgentRunInputLifecycle[] = [];
    const harness = createHarness({
      dispatchUserInput: vi.fn().mockReturnValue(dispatch.promise),
    });
    const reservationResult = await harness.run.reserveUserMessage(new AgentInputUserMessage("reserved"), {
      lifecycleObserver: (fact) => lifecycle.push(fact),
    });
    if (!reservationResult.reserved) throw new Error("Expected reservation.");

    const preparation = harness.run.prepareTermination();
    await Promise.resolve();
    expect(harness.backend.dispatchUserInput).not.toHaveBeenCalled();
    expect(harness.backend.terminate).not.toHaveBeenCalled();

    reservationResult.reservation.commit().release();
    await vi.waitFor(() => expect(harness.backend.dispatchUserInput).toHaveBeenCalledOnce());
    dispatch.resolve({ forwarded: true, turnId: "turn-reserved" });
    await vi.waitFor(() => expect(lifecycle).toContainEqual({
      kind: "forwarded", dispatchKind: "start_turn", turnId: "turn-reserved",
    }));
    harness.setSnapshot({ availability: "active", phase: "running", currentTurn: { kind: "IDENTIFIED", turnId: "turn-reserved" } });
    await harness.getSourceListener()?.([
      event(harness.run.runId, AgentRunEventType.TURN_STARTED, { turn_id: "turn-reserved" }),
    ]);
    harness.setSnapshot({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } });
    await harness.getSourceListener()?.([
      event(harness.run.runId, AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-reserved" }),
    ]);

    const prepared = await preparation;
    expect(lifecycle).toContainEqual({ kind: "completed", turnId: "turn-reserved" });
    expect(lifecycle.some((fact) => fact.kind === "cancelled")).toBe(false);
    expect(harness.backend.terminate).not.toHaveBeenCalled();
    prepared.cancel();
    await expect(harness.run.postUserMessage(new AgentInputUserMessage("after cancel"))).resolves.toMatchObject({ accepted: true });
  });

  it("keeps quiescence pending until an earlier reservation owner cancels", async () => {
    const harness = createHarness();
    const reservationResult = await harness.run.reserveUserMessage(
      new AgentInputUserMessage("reserved then cancelled"),
    );
    if (!reservationResult.reserved) throw new Error("Expected reservation.");

    const preparation = harness.run.prepareTermination();
    await Promise.resolve();
    expect(harness.backend.dispatchUserInput).not.toHaveBeenCalled();
    expect(harness.backend.terminate).not.toHaveBeenCalled();

    reservationResult.reservation.cancel();
    const prepared = await preparation;
    expect(harness.backend.dispatchUserInput).not.toHaveBeenCalled();
    prepared.cancel();
    await expect(harness.run.postUserMessage(new AgentInputUserMessage("after cancellation")))
      .resolves.toMatchObject({ accepted: true });
  });

  it("keeps admission closed after committed provider termination rejects", async () => {
    const terminate = vi.fn().mockResolvedValue({ accepted: false, code: "BUSY" });
    const harness = createHarness({ terminate });
    await expect(harness.run.terminate()).resolves.toEqual({ accepted: false, code: "BUSY" });
    await expect(harness.run.postUserMessage(new AgentInputUserMessage("second"))).resolves.toMatchObject({
      accepted: false,
      code: "AGENT_RUN_NOT_ACCEPTING_INPUT",
    });
    expect(terminate).toHaveBeenCalledOnce();
  });

  it("drains claimed and queued inputs in FIFO order before provider termination", async () => {
    const firstDispatch = createDeferred<AgentRunBackendInputDispatchResult>();
    const secondDispatch = createDeferred<AgentRunBackendInputDispatchResult>();
    const firstLifecycle: AgentRunInputLifecycle[] = [];
    const secondLifecycle: AgentRunInputLifecycle[] = [];
    const terminate = vi.fn().mockResolvedValue({ accepted: true });
    const dispatchUserInput = vi.fn()
      .mockReturnValueOnce(firstDispatch.promise)
      .mockReturnValueOnce(secondDispatch.promise);
    const harness = createHarness({
      dispatchUserInput,
      terminate,
    });
    await harness.run.postUserMessage(new AgentInputUserMessage("claimed"), {
      lifecycleObserver: (fact) => firstLifecycle.push(fact),
    });
    await harness.run.postUserMessage(new AgentInputUserMessage("queued"), {
      lifecycleObserver: (fact) => secondLifecycle.push(fact),
    });

    const termination = harness.run.terminate();
    await Promise.resolve();
    expect(terminate).not.toHaveBeenCalled();
    firstDispatch.resolve({ forwarded: true, turnId: "turn-1" });
    await vi.waitFor(() => expect(firstLifecycle).toContainEqual({
      kind: "forwarded", dispatchKind: "start_turn", turnId: "turn-1",
    }));
    harness.setSnapshot({ availability: "active", phase: "running", currentTurn: { kind: "IDENTIFIED", turnId: "turn-1" } });
    await harness.getSourceListener()?.([
      event(harness.run.runId, AgentRunEventType.TURN_STARTED, { turn_id: "turn-1" }),
    ]);
    harness.setSnapshot({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } });
    await harness.getSourceListener()?.([
      event(harness.run.runId, AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-1" }),
    ]);
    await vi.waitFor(() => expect(dispatchUserInput).toHaveBeenCalledTimes(2));
    secondDispatch.resolve({ forwarded: true, turnId: "turn-2" });
    await vi.waitFor(() => expect(secondLifecycle).toContainEqual({
      kind: "forwarded", dispatchKind: "start_turn", turnId: "turn-2",
    }));
    harness.setSnapshot({ availability: "active", phase: "running", currentTurn: { kind: "IDENTIFIED", turnId: "turn-2" } });
    await harness.getSourceListener()?.([
      event(harness.run.runId, AgentRunEventType.TURN_STARTED, { turn_id: "turn-2" }),
    ]);
    harness.setSnapshot({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } });
    await harness.getSourceListener()?.([
      event(harness.run.runId, AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-2" }),
    ]);
    await expect(termination).resolves.toEqual({ accepted: true });

    expect(terminate).toHaveBeenCalledOnce();
    expect(firstLifecycle).toContainEqual({ kind: "completed", turnId: "turn-1" });
    expect(secondLifecycle).toContainEqual({ kind: "completed", turnId: "turn-2" });
    expect([...firstLifecycle, ...secondLifecycle].some((fact) => fact.kind === "cancelled")).toBe(false);
  });

  it("fails retained input once and closes admission on a runtime-global terminal error", async () => {
    const lifecycle: AgentRunInputLifecycle[] = [];
    const harness = createHarness({
      snapshot: {
        availability: "active",
        phase: "running",
        currentTurn: { kind: "IDENTIFIED", turnId: "turn-active" },
      },
    });
    await harness.run.postUserMessage(new AgentInputUserMessage("queued"), {
      lifecycleObserver: (fact) => lifecycle.push(fact),
    });

    harness.setSnapshot({ availability: "offline", phase: "error", currentTurn: { kind: "NONE" } });
    await harness.getSourceListener()?.([
      event(harness.run.runId, AgentRunEventType.ERROR, {
        code: "CLAUDE_SESSION_FAILED",
        message: "session failed",
        error_scope: "runtime",
        error_effect: "terminal",
      }),
    ]);

    expect(lifecycle).toEqual([
      { kind: "admitted" },
      {
        kind: "failed",
        code: "RUNTIME_GLOBAL_FAILURE",
        message: "session failed",
        turnId: null,
      },
    ]);
    await expect(harness.run.postUserMessage(new AgentInputUserMessage("late"))).resolves.toMatchObject({
      accepted: false,
      code: "AGENT_RUN_NOT_ACCEPTING_INPUT",
    });
    expect(harness.backend.dispatchUserInput).not.toHaveBeenCalled();
  });

  it("rejects input while the runtime is offline", async () => {
    const harness = createHarness({
      snapshot: {
        availability: "offline",
        phase: "idle",
        currentTurn: { kind: "NONE" },
      },
    });
    await expect(harness.run.postUserMessage(new AgentInputUserMessage("offline"))).resolves.toMatchObject({
      accepted: false,
      code: "AGENT_RUN_NOT_ACCEPTING_INPUT",
    });
    expect(harness.backend.dispatchUserInput).not.toHaveBeenCalled();
  });

  it("rejects invalid typed input without provider effect", async () => {
    const harness = createHarness();
    await expect(harness.run.postUserMessage({ content: "" } as AgentInputUserMessage)).resolves.toEqual({
      accepted: false,
      code: "AGENT_RUN_INPUT_INVALID",
      message: "AgentRun input content must be a non-empty string.",
    });
    expect(harness.backend.dispatchUserInput).not.toHaveBeenCalled();
  });

  it("preserves source callback order and rejects cross-run publication", async () => {
    const harness = createHarness({ runId: "agent-run-events" });
    const observed: AgentRunEvent[] = [];
    harness.run.subscribeToEvents((item) => observed.push(item));
    const source = harness.getSourceListener();
    const started = source?.([
      event(harness.run.runId, AgentRunEventType.TURN_STARTED, { turn_id: "turn-1" }),
    ]);
    const completed = source?.([
      event(harness.run.runId, AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-1" }),
    ]);
    await Promise.all([started, completed]);
    expect(observed.map((item) => item.eventType)).toEqual([
      AgentRunEventType.AGENT_STATUS,
      AgentRunEventType.TURN_STARTED,
      AgentRunEventType.TURN_COMPLETED,
      AgentRunEventType.AGENT_STATUS,
    ]);
    await expect(harness.run.publishEvent(
      event("another-run", AgentRunEventType.SEGMENT_CONTENT, { delta: "nope" }),
    )).rejects.toThrow("another-run");
  });
});
