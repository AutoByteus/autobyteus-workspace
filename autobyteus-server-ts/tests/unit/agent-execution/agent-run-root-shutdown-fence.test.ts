import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import {
  AgentRunRootShutdownFence,
  ROOT_SHUTDOWN_REJECTED_INTERRUPT_QUIESCENCE_TIMEOUT_MS,
} from "../../../src/agent-execution/domain/agent-run-root-shutdown-fence.js";

const REJECTED: AgentOperationResult = { accepted: false, code: "AGENT_RUN_INTERRUPT_REJECTED", message: "no active turn" };

/** A controllable run: turn state, quiescence, interrupt outcome, manual timers and captured warnings. */
const createFence = (input: { interrupt?: () => Promise<AgentOperationResult>; timeoutMs?: number } = {}) => {
  const state = { quiescent: false, hasActiveTurn: true, turnId: "turn-busy" as string | null, hasPendingCommand: false };
  const timers = new Map<number, { callback: () => void; ms: number }>();
  let nextHandle = 1;
  const warnings: string[] = [];
  const interrupt = vi.fn(input.interrupt ?? (async () => REJECTED));
  const fence = new AgentRunRootShutdownFence({
    snapshot: () => ({ quiescent: state.quiescent, hasActiveTurn: state.hasActiveTurn }),
    interruptActiveTurn: interrupt,
    diagnostics: () => ({
      runId: "run-1",
      activeTurn: state.turnId ? { kind: "IDENTIFIED", turnId: state.turnId } : { kind: "NONE" },
      hasPendingCommand: state.hasPendingCommand,
    }),
  }, {
    quiescenceTimeoutMs: input.timeoutMs,
    warn: (message) => warnings.push(message),
    timers: {
      setTimeout: (callback, ms) => { const handle = nextHandle++; timers.set(handle, { callback, ms }); return handle; },
      clearTimeout: (handle) => { timers.delete(handle as number); },
    },
  });
  const settledWith = async () => {
    let value: AgentOperationResult | "pending" = "pending";
    void fence.result.then((result) => { value = result; }, () => undefined);
    await Promise.resolve(); await Promise.resolve();
    return value;
  };
  const expire = () => { const [handle, timer] = [...timers.entries()][0]!; timers.delete(handle); timer.callback(); };
  return { fence, state, timers, warnings, interrupt, settledWith, expire };
};

const flush = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };

describe("AgentRunRootShutdownFence (SR-006)", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("F-1: a rejected interrupt while the turn is still active waits for quiescence, without a second interrupt", async () => {
    const f = createFence();
    f.fence.evaluate();
    await flush();
    expect(f.interrupt).toHaveBeenCalledOnce();
    expect(await f.settledWith()).toBe("pending");
    expect(f.fence.isReusable).toBe(true);
    expect([...f.timers.values()].map((timer) => timer.ms)).toEqual([ROOT_SHUTDOWN_REJECTED_INTERRUPT_QUIESCENCE_TIMEOUT_MS]);

    f.fence.evaluate(); // a later event batch while the turn is still active
    await flush();
    expect(f.interrupt).toHaveBeenCalledOnce();

    f.state.quiescent = true; // the local turn-completion dispatch arrived
    f.state.hasActiveTurn = false;
    f.fence.evaluate();
    await expect(f.fence.result).resolves.toEqual({ accepted: true });
    expect(f.timers.size).toBe(0);
    expect(f.interrupt).toHaveBeenCalledOnce();
  });

  it("F-2: with no quiescence the attempt settles the original rejected result at the bound, and the timer is gone", async () => {
    const f = createFence({ timeoutMs: 250 });
    f.fence.evaluate();
    await flush();
    expect([...f.timers.values()].map((timer) => timer.ms)).toEqual([250]);
    f.expire();
    await expect(f.fence.result).resolves.toBe(REJECTED);
    expect(f.timers.size).toBe(0);
    expect(f.fence.isReusable).toBe(false);
    f.fence.evaluate(); // a settled attempt ignores later evaluations
    await flush();
    expect(f.interrupt).toHaveBeenCalledOnce();
  });

  it("F-2 (N-2): quiescent at expiry without any dispatch settles accepted", async () => {
    const f = createFence();
    f.fence.evaluate();
    await flush();
    f.state.hasPendingCommand = false;
    f.state.quiescent = true; // e.g. a pending command cleared; no evaluate() scheduled
    f.expire();
    await expect(f.fence.result).resolves.toEqual({ accepted: true });
    expect(f.fence.isReusable).toBe(true);
  });

  it("F-4: warns at rejection and at expiry with run ID, turn kind and ID, pending command and the interrupt result", async () => {
    const f = createFence();
    f.state.hasPendingCommand = true;
    f.fence.evaluate();
    await flush();
    f.state.turnId = "turn-next"; // a turn change between rejection and expiry is visible
    f.expire();
    await f.fence.result;
    expect(f.warnings).toEqual([
      "[AgentRun] root shutdown interrupt rejected; awaiting quiescence for run 'run-1': activeTurn=IDENTIFIED(turn-busy)"
        + " hasPendingCommand=true code=AGENT_RUN_INTERRUPT_REJECTED message=no active turn",
      "[AgentRun] root shutdown interrupt quiescence wait expired for run 'run-1': activeTurn=IDENTIFIED(turn-next)"
        + " hasPendingCommand=true code=AGENT_RUN_INTERRUPT_REJECTED message=no active turn",
    ]);
  });

  it("a rejected interrupt that finds the run already quiescent settles accepted at once, with no wait or warning", async () => {
    const f = createFence({ interrupt: async () => { f.state.quiescent = true; return REJECTED; } });
    f.fence.evaluate();
    await expect(f.fence.result).resolves.toEqual({ accepted: true });
    expect(f.timers.size).toBe(0);
    expect(f.warnings).toEqual([]);
  });

  it("F-3: an accepted fence stays latched and reusable; an interrupt that throws fails only that attempt", async () => {
    const accepted = createFence({ interrupt: async () => ({ accepted: true }) });
    accepted.fence.evaluate();
    await flush();
    accepted.state.quiescent = true;
    accepted.fence.evaluate();
    await expect(accepted.fence.result).resolves.toEqual({ accepted: true });
    accepted.state.quiescent = false;
    accepted.fence.evaluate();
    expect(accepted.fence.isReusable).toBe(true);
    expect(accepted.interrupt).toHaveBeenCalledOnce();

    const failure = new Error("transport closed");
    const thrown = createFence({ interrupt: async () => { throw failure; } });
    thrown.fence.evaluate();
    await expect(thrown.fence.result).rejects.toBe(failure);
    expect(thrown.fence.isReusable).toBe(false);
    expect(thrown.timers.size).toBe(0);
  });

  it("uses an unref'd timer by default", async () => {
    const unref = vi.fn();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation((() => ({ unref })) as never);
    const fence = new AgentRunRootShutdownFence({
      snapshot: () => ({ quiescent: false, hasActiveTurn: true }),
      interruptActiveTurn: async () => REJECTED,
      diagnostics: () => ({ runId: "run-1", activeTurn: { kind: "ANONYMOUS" }, hasPendingCommand: false }),
    }, { warn: () => undefined });
    fence.evaluate();
    await flush();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), ROOT_SHUTDOWN_REJECTED_INTERRUPT_QUIESCENCE_TIMEOUT_MS);
    expect(unref).toHaveBeenCalledOnce();
  });
});
