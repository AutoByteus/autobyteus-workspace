import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { armProbeTimeBound, EXITED_CHILD_CLOSE_GRACE_MS } from "../../../src/runtime-management/probe-time-bound.js";

/**
 * A capability probe's time bound (autobyteus-576 FU-008, REQ-008, AC-008): a child that has already exited when the
 * bound fires is waited for (its `close` brings the real result); only a running child, or a `close` that never comes,
 * is a time-out, logged with the runtime, the command and the bound.
 */
let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  warn.mockRestore();
});

const arm = (child: { exitCode: number | null; signalCode: NodeJS.Signals | null }, timeoutMs = 3_000) => {
  const onTimedOut = vi.fn();
  const disarm = armProbeTimeBound({ child, bound: { timeoutMs, byDeadline: false }, runtime: "grok", command: "grok --version", onTimedOut });
  return { onTimedOut, disarm };
};

describe("armProbeTimeBound", () => {
  it("times out a child still running at the bound and logs the runtime, the command and the bound", () => {
    const { onTimedOut } = arm({ exitCode: null, signalCode: null });
    vi.advanceTimersByTime(2_999);
    expect(onTimedOut).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTimedOut).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("RUNTIME_PROBE_TIMED_OUT", { runtime: "grok", command: "grok --version", boundMs: 3_000 });
  });

  it.each([
    ["an exit code", { exitCode: 0, signalCode: null }],
    ["a signal", { exitCode: null, signalCode: "SIGTERM" as NodeJS.Signals }],
  ])("waits for the close of a child that has already exited (%s): no time-out while the close is pending", (_label, child) => {
    const { onTimedOut, disarm } = arm(child);
    vi.advanceTimersByTime(3_000 + EXITED_CHILD_CLOSE_GRACE_MS - 1);
    expect(onTimedOut).not.toHaveBeenCalled();
    // The close arrives: the probe finishes with the child's real result and disarms the bound.
    disarm();
    vi.advanceTimersByTime(60_000);
    expect(onTimedOut).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("times out an exited child whose close never comes, once the grace has passed", () => {
    const { onTimedOut } = arm({ exitCode: 0, signalCode: null });
    vi.advanceTimersByTime(3_000 + EXITED_CHILD_CLOSE_GRACE_MS);
    expect(onTimedOut).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("RUNTIME_PROBE_TIMED_OUT", { runtime: "grok", command: "grok --version", boundMs: 3_000 });
  });

  it("does nothing once disarmed before the bound", () => {
    const { onTimedOut, disarm } = arm({ exitCode: null, signalCode: null });
    disarm();
    vi.advanceTimersByTime(60_000);
    expect(onTimedOut).not.toHaveBeenCalled();
  });
});
