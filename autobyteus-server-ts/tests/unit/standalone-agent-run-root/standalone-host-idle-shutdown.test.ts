import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { StandaloneHostIdleShutdown } from "../../../src/standalone-agent-run-root/services/standalone-host-idle-shutdown.js";

/**
 * DS-006 (REQ-107): the host of a run a peer started shuts down after the idle grace period, only when it is
 * quiet and the root has no open child work; running cancels the timer.
 */

type Listener = (event: { eventType: AgentRunEventType; payload: Record<string, unknown> }) => void;

const fakeTimers = () => {
  const pending = new Map<number, () => void>();
  let next = 0;
  return {
    timers: {
      setTimeout: (callback: () => void) => { pending.set(++next, callback); return next; },
      clearTimeout: (handle: unknown) => { pending.delete(handle as number); },
    },
    pendingCount: () => pending.size,
    fireAll: () => { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach((callback) => callback()); },
  };
};

const fakeRun = () => {
  let listener: Listener | null = null;
  return {
    run: {
      isActive: () => true,
      subscribeToEvents: (callback: Listener) => { listener = callback; return () => { listener = null; }; },
    },
    status: (status: string) => listener?.({ eventType: AgentRunEventType.AGENT_STATUS, payload: { status } }),
    subscribed: () => listener !== null,
  };
};

const setup = (options: { quiet?: boolean; openChildWork?: boolean } = {}) => {
  const clock = fakeTimers();
  const host = fakeRun();
  const finish = vi.fn(async () => ({ accepted: true }));
  const tryPrepare = vi.fn(async () => (options.quiet === false ? null : { commit: () => ({ finish }) }));
  const shutdown = new StandaloneHostIdleShutdown({
    hostRunId: "host-run",
    agentRunManager: { tryPrepareAgentRunTerminationIfQuiescent: tryPrepare } as never,
    runInGate: (operation) => operation(),
    hasOpenChildWork: () => options.openChildWork === true,
    gracePeriodMs: () => 1_000,
    timers: clock.timers,
  });
  shutdown.watch(host.run as never);
  return { clock, host, tryPrepare, finish, shutdown };
};

const settle = () => new Promise((resolve) => setImmediate(resolve));

describe("StandaloneHostIdleShutdown", () => {
  it("arms on watch and shuts the quiet host down when the grace period ends", async () => {
    const { clock, tryPrepare, finish } = setup();
    expect(clock.pendingCount()).toBe(1);
    clock.fireAll();
    await settle();
    expect(tryPrepare).toHaveBeenCalledTimes(1);
    expect(finish).toHaveBeenCalledTimes(1);
  });

  it("cancels while the host is running and re-arms when it is idle again", async () => {
    const { clock, host, finish } = setup();
    host.status("running");
    expect(clock.pendingCount()).toBe(0);
    host.status("idle");
    expect(clock.pendingCount()).toBe(1);
    clock.fireAll();
    await settle();
    expect(finish).toHaveBeenCalledTimes(1);
  });

  it("keeps the host when it is not quiet or the root has open child work", async () => {
    const notQuiet = setup({ quiet: false });
    notQuiet.clock.fireAll();
    await settle();
    expect(notQuiet.finish).not.toHaveBeenCalled();

    const busy = setup({ openChildWork: true });
    busy.clock.fireAll();
    await settle();
    expect(busy.tryPrepare).not.toHaveBeenCalled();
  });

  it("stops watching and clears its timer when disposed", () => {
    const { clock, host, shutdown } = setup();
    shutdown.dispose();
    expect(clock.pendingCount()).toBe(0);
    expect(host.subscribed()).toBe(false);
  });
});
