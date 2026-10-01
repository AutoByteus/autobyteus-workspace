import { EventEmitter } from 'autobyteus-ts/events/event-emitter.js';
import { EventType } from 'autobyteus-ts/events/event-types.js';
import { afterEach } from 'vitest';
import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../src/agent-execution/domain/agent-run-context.js";
import { AutoByteusAgentRunBackend } from "../../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.js";

const createBackend = (overrides: {
  agent?: Partial<ConstructorParameters<typeof AutoByteusAgentRunBackend>[1]>;
  isActive?: () => boolean;
  removeAgent?: (runId: string) => Promise<boolean>;
  pendingSystemInstructionCapture?: {
    id: string; ts: number; trace_type: "system_instruction"; content: string;
    source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED";
  };
} = {}) => {
  const agent = {
    agentId: "agent-1",
    getCompactionRecovery: () => null,
    authorizeCompactionRetry: () => "stale",
    revokeUnusedCompactionRetry: () => "stale",
    currentStatus: "idle",
    postUserMessage: vi.fn().mockResolvedValue(undefined),
    postToolExecutionApproval: vi.fn().mockResolvedValue({
      accepted: true,
      code: "posted",
      turnId: "turn-1",
      invocationId: "invoke-1",
    }),
    interrupt: vi.fn().mockResolvedValue({
      accepted: true,
      status: "accepted",
      turnId: "turn-1",
    }),
    stop: vi.fn().mockResolvedValue(undefined),
    ...overrides.agent,
  };
  const removeAgent = overrides.removeAgent ?? vi.fn().mockResolvedValue(true);
  const context = new AgentRunContext({
    runId: "agent-1",
    config: new AgentRunConfig({
      agentDefinitionId: "def-1",
      llmModelIdentifier: "model-1",
      autoExecuteTools: false,
    }),
    runtimeContext: null,
  });

  const backend = new AutoByteusAgentRunBackend(context, agent as any, {
    isActive: overrides.isActive ?? (() => true),
    removeAgent,
    pendingSystemInstructionCapture: overrides.pendingSystemInstructionCapture,
  });

  return {
    backend,
    agent,
    removeAgent,
    context,
  };
};

describe("AutoByteusAgentRunBackend", () => {
  it("publishes the committed system instruction after listener binding and before the first input exactly once", async () => {
    const order: string[] = [];
    const { backend } = createBackend({
      agent: { postUserMessage: vi.fn(async () => { order.push("input"); }) },
      pendingSystemInstructionCapture: {
        id: "raw-native-system", ts: 10, trace_type: "system_instruction",
        content: " exact native prompt ", source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED",
      },
    });
    const listener = vi.fn(async () => { order.push("event"); });
    backend.subscribeToSourceEventBatches(listener);

    await backend.dispatchUserInput({ kind: "start_turn", message: new AgentInputUserMessage("first") });
    await backend.dispatchUserInput({ kind: "start_turn", message: new AgentInputUserMessage("second") });

    expect(order).toEqual(["event", "input", "input"]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith([expect.objectContaining({
      eventType: "SYSTEM_INSTRUCTIONS_SUPPLIED",
      payload: { trace_id: "raw-native-system", content: " exact native prompt ", ts: 10 },
    })]);
  });

  it("delegates send and approval commands to the native agent", async () => {
    const { backend, agent, context } = createBackend();

    const sendResult = await backend.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("hello backend"),
    });
    const approveResult = await backend.approveToolInvocation("invoke-1", true, "approved");

    expect(agent.postUserMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: "hello backend" }),
    );
    expect(agent.postToolExecutionApproval).toHaveBeenCalledWith("invoke-1", true, "approved");
    expect(sendResult).toEqual({
      forwarded: true,
      turnId: null,
      platformAgentRunId: "agent-1",
    });
    expect(approveResult).toEqual({
      accepted: true,
      code: "posted",
      message: undefined,
      turnId: "turn-1",
    });
    expect(backend.getLifecycleSnapshot()).toEqual({
      availability: "active",
      phase: "idle",
      recoverableBlock: null,
      currentTurn: { kind: "NONE" },
    });
    expect(backend.getPlatformAgentRunId()).toBe("agent-1");
    expect(backend.getContext()).toBe(context);
  });

  it("declares next-turn-only mechanics and has no append path", async () => {
    const { backend } = createBackend({
      agent: {
        context: {
          state: {
            activeTurn: {
              turnId: "turn-1",
            },
          },
        },
      },
    });

    const result = await backend.dispatchUserInput({
      kind: "append_to_active_turn",
      turnId: "turn-1",
      message: new AgentInputUserMessage("hello backend"),
    });

    expect(result).toMatchObject({ forwarded: false, code: "UNSUPPORTED_RUNTIME_COMMAND" });
    expect(backend.inputCapabilities).toEqual({ activeTurnAppend: "unsupported" });
  });

  it("interrupts the active native run through native interrupt()", async () => {
    const { backend, agent } = createBackend({
      agent: {
        currentStatus: "running",
      },
    });

    const result = await backend.interrupt("turn-1");

    expect(agent.interrupt).toHaveBeenCalledWith({
      turnId: "turn-1",
      reason: "user_interrupt",
    });
    expect(agent.stop).not.toHaveBeenCalled();
    expect(result).toEqual({
      accepted: true,
      code: "accepted",
      message: undefined,
      turnId: "turn-1",
    });
  });

  it("maps stale native tool approval results without treating them as command failures", async () => {
    const { backend } = createBackend({
      agent: {
        postToolExecutionApproval: vi.fn().mockResolvedValue({
          accepted: false,
          code: "no_active_turn",
          invocationId: "invoke-2",
          message: "no active turn",
        }),
      },
    });

    await expect(
      backend.approveToolInvocation("invoke-2", false, "denied"),
    ).resolves.toEqual({
      accepted: false,
      code: "no_active_turn",
      message: "no active turn",
      turnId: null,
    });
  });

  it("terminates the run by removing it from the native registry", async () => {
    const removeAgent = vi.fn().mockResolvedValue(true);
    const { backend } = createBackend({
      removeAgent,
    });

    const result = await backend.terminate();

    expect(removeAgent).toHaveBeenCalledWith("agent-1", expect.any(Number));
    expect(result).toEqual({ accepted: true });
  });

  it("treats an already-absent held native run as terminated during held terminate", async () => {
    const removeAgent = vi.fn().mockResolvedValue(false);
    const { backend } = createBackend({
      removeAgent,
      isActive: () => false,
    });

    const result = await backend.terminate();
    const repeated = await backend.terminate();

    expect(removeAgent).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ accepted: true });
    expect(repeated).toEqual({ accepted: true });
  });

  it("joins concurrent held native terminate calls and rejects new work while terminating", async () => {
    let resolveRemove: ((value: boolean) => void) | null = null;
    const removeAgent = vi.fn(() => new Promise<boolean>((resolve) => {
      resolveRemove = resolve;
    }));
    const { backend, agent } = createBackend({ removeAgent });

    const firstTerminate = backend.terminate();
    const secondTerminate = backend.terminate();
    const sendWhileTerminating = await backend.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("late"),
    });

    expect(removeAgent).toHaveBeenCalledTimes(1);
    expect(agent.postUserMessage).not.toHaveBeenCalledWith(expect.objectContaining({ content: "late" }));
    expect(sendWhileTerminating).toEqual({
      forwarded: false,
      delivery: "not_delivered",
      code: "RUN_NOT_FOUND",
      message: "Run 'agent-1' is not active.",
      turnId: null,
    });

    resolveRemove?.(true);
    await expect(firstTerminate).resolves.toEqual({ accepted: true });
    await expect(secondTerminate).resolves.toEqual({ accepted: true });
  });

  it("preserves native stop failures as terminate failures", async () => {
    const { backend } = createBackend({
      removeAgent: vi.fn().mockRejectedValue(new Error("stop failed")),
    });

    const result = await backend.terminate();

    expect(result).toEqual({
      accepted: false,
      code: "RUNTIME_COMMAND_FAILED",
      message: "Failed to terminate run: Error: stop failed",
    });
    await expect(backend.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("late"),
    })).resolves.toEqual({
      forwarded: false,
      delivery: "not_delivered",
      code: "RUN_NOT_FOUND",
      message: "Run 'agent-1' is not active.",
      turnId: null,
    });
  });

  it("returns RUN_NOT_FOUND when the run is no longer active", async () => {
    const { backend, agent } = createBackend({
      isActive: () => false,
    });

    const sendResult = await backend.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("hello inactive run"),
    });
    const interruptResult = await backend.interrupt("turn-1");

    expect(agent.postUserMessage).not.toHaveBeenCalled();
    expect(agent.interrupt).not.toHaveBeenCalled();
    expect(agent.stop).not.toHaveBeenCalled();
    expect(sendResult).toEqual({
      forwarded: false,
      delivery: "not_delivered",
      code: "RUN_NOT_FOUND",
      message: "Run 'agent-1' is not active.",
      turnId: null,
    });
    expect(interruptResult).toEqual({
      accepted: false,
      code: "RUN_NOT_FOUND",
      message: "Run 'agent-1' is not active.",
    });
  });

  it("wraps native command failures as runtime command failures", async () => {
    const { backend } = createBackend({
      agent: {
        interrupt: vi.fn().mockRejectedValue(new Error("interrupt failed")),
      },
    });

    const result = await backend.interrupt("turn-1");

    expect(result).toEqual({
      accepted: false,
      code: "RUNTIME_COMMAND_FAILED",
      message: "Failed to interrupt run: Error: interrupt failed",
    });
  });
});

const flushPump = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const withStream = (removeAgent: (id: string, seconds: number) => Promise<boolean>) => {
  const notifier = new EventEmitter();
  const h = createBackend({ agent: { context: { statusManager: { notifier } } as any }, removeAgent: removeAgent as any });
  const emit = (phase: string) => notifier.emit(EventType.AGENT_COMPACTION_STATUS_UPDATED,
    { payload: { phase, compaction_operation_id: 'native-operation', turn_id: 'turn-1' }, agent_id: 'agent-1' });
  return { ...h, emit };
};
describe('native shutdown event drain', () => {
  it('keeps the producer while stopping, drains FIFO including awaited listeners, then forbids resubscription', async () => {
    const remove = deferred<boolean>(); const listenerDone = deferred<void>(); const received: string[] = [];
    const h = withStream(() => remove.promise);
    h.backend.subscribeToSourceEventBatches(async ([event]) => {
      received.push((event as any).payload.phase);
      if (received.length === 1) await listenerDone.promise;
    });
    h.emit('started'); await flushPump();
    let settled = false;
    const termination = h.backend.terminate().then(result => { settled = true; return result; });
    h.emit('stopped'); remove.resolve(true);
    await Promise.resolve(); await Promise.resolve();
    expect(settled).toBe(false);
    listenerDone.resolve();
    await expect(termination).resolves.toEqual({ accepted: true });
    expect(received).toEqual(['started', 'stopped']);
    const late = vi.fn(); h.backend.subscribeToSourceEventBatches(late); h.emit('started');
    await Promise.resolve(); expect(late).not.toHaveBeenCalled();
  });
  it('uses only the remainder of one ten-second deadline for a hung listener without undoing resource success', async () => {
    vi.useFakeTimers(); const remove = deferred<boolean>(); const listenerDone = deferred<void>();
    const removeAgent = vi.fn(() => remove.promise); const h = withStream(removeAgent);
    h.backend.subscribeToSourceEventBatches(() => listenerDone.promise);
    h.emit('started'); await flushPump();
    const termination = h.backend.terminate();
    await vi.advanceTimersByTimeAsync(9000); remove.resolve(true); await vi.advanceTimersByTimeAsync(0);
    let settled = false; void termination.then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(999); expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1); await expect(termination).resolves.toEqual({ accepted: true });
    expect(removeAgent).toHaveBeenCalledWith('agent-1', 10);
    listenerDone.resolve();
  });
  it('does not turn an unfinished removal or a still-registered run into success', async () => {
    vi.useFakeTimers(); const remove = deferred<boolean>(); const h = withStream(() => remove.promise);
    const termination = h.backend.terminate(); await vi.advanceTimersByTimeAsync(10000);
    await expect(termination).resolves.toMatchObject({ accepted: false });
    remove.resolve(true);
    const active = withStream(async () => false);
    await expect(active.backend.terminate()).resolves.toMatchObject({ accepted: false });
  });
  it('old pump disposal cannot close a replacement stream, and unsubscribe alone emits no stopped', async () => {
    const h = withStream(async () => true); const oldDone = deferred<void>();
    const old = vi.fn(() => oldDone.promise); const unsubscribe = h.backend.subscribeToSourceEventBatches(old);
    h.emit('started'); await vi.waitFor(() => expect(old).toHaveBeenCalledOnce()); unsubscribe();
    const next = vi.fn(); const stop = h.backend.subscribeToSourceEventBatches(next);
    oldDone.resolve(); await flushPump();
    h.emit('completed'); await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
    expect((next.mock.calls[0][0][0] as any).payload.phase).toBe('completed');
    stop();
  });
  it('continues draining other listeners when one observer fails', async () => {
    const h = withStream(async () => true); const seen = vi.fn();
    h.backend.subscribeToSourceEventBatches(async () => { throw new Error('projection failed'); });
    h.backend.subscribeToSourceEventBatches(seen); h.emit('stopped');
    await expect(h.backend.terminate()).resolves.toEqual({ accepted: true });
    expect(seen).toHaveBeenCalledOnce();
  });
});
