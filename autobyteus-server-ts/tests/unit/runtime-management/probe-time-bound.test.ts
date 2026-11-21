import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { armProbeTimeBound, EXITED_CHILD_CLOSE_GRACE_MS } from "../../../src/runtime-management/probe-time-bound.js";

/**
 * A capability probe's time bound (autobyteus-576 FU-008, REQ-008, AC-008; SR-002 after CRR-001 CR-001): the exit is
 * learned from the child's `exit` event, and the decision waits for the poll phase that delivers it; a child that has
 * exited is waited for (its `close` brings the real result); only a running child, or a `close` that never comes, is a
 * time-out, logged with the runtime, the command and the bound.
 */
let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => { warn = vi.spyOn(console, "warn").mockImplementation(() => undefined); });
afterEach(() => {
  vi.useRealTimers();
  warn.mockRestore();
});

/** One turn of the event loop's check phase, where the bound's deferred decision runs. */
const checkPhase = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("armProbeTimeBound with a fake child (fake timers)", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));

  const arm = (timeoutMs = 3_000) => {
    const child = new EventEmitter();
    const onTimedOut = vi.fn();
    const disarm = armProbeTimeBound({ child, bound: { timeoutMs, byDeadline: false }, runtime: "grok", command: "grok --version", onTimedOut });
    return { child, onTimedOut, disarm };
  };

  it("times out a child that never exits and logs the runtime, the command and the bound", async () => {
    const { onTimedOut } = arm();
    vi.advanceTimersByTime(2_999);
    await checkPhase();
    expect(onTimedOut).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await checkPhase();
    expect(onTimedOut).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("RUNTIME_PROBE_TIMED_OUT", { runtime: "grok", command: "grok --version", boundMs: 3_000 });
  });

  it("waits for the close of a child that has exited (SR-001 late close): no time-out while the close is pending", async () => {
    const { child, onTimedOut, disarm } = arm();
    child.emit("exit", 0, null);
    vi.advanceTimersByTime(3_000);
    await checkPhase();
    vi.advanceTimersByTime(EXITED_CHILD_CLOSE_GRACE_MS - 1);
    expect(onTimedOut).not.toHaveBeenCalled();
    disarm(); // the close arrives: the probe finishes with the child's real result
    vi.advanceTimersByTime(60_000);
    await checkPhase();
    expect(onTimedOut).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("sees an exit delivered after the timer fired but before its deferred decision (the CR-001 order)", async () => {
    const { child, onTimedOut, disarm } = arm();
    vi.advanceTimersByTime(3_000); // the timer runs first, as after a block
    child.emit("exit", 0, null); // the poll phase delivers the exit
    await checkPhase(); // the decision sees it
    vi.advanceTimersByTime(EXITED_CHILD_CLOSE_GRACE_MS - 1);
    expect(onTimedOut).not.toHaveBeenCalled();
    disarm();
  });

  it("times out an exited child whose close never comes, once the grace has passed", async () => {
    const { child, onTimedOut } = arm();
    child.emit("exit", null, "SIGTERM");
    vi.advanceTimersByTime(3_000);
    await checkPhase();
    vi.advanceTimersByTime(EXITED_CHILD_CLOSE_GRACE_MS);
    expect(onTimedOut).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("RUNTIME_PROBE_TIMED_OUT", { runtime: "grok", command: "grok --version", boundMs: 3_000 });
  });

  it("does nothing once disarmed, and removes its exit listener", async () => {
    const { child, onTimedOut, disarm } = arm();
    expect(child.listenerCount("exit")).toBe(1);
    disarm();
    expect(child.listenerCount("exit")).toBe(0);
    vi.advanceTimersByTime(60_000);
    await checkPhase();
    expect(onTimedOut).not.toHaveBeenCalled();
  });
});

describe("armProbeTimeBound with a real child, in the real order (CRR-001 CR-001)", () => {
  // The child exits while the main thread is blocked past the bound: when the loop runs again, the expired timer runs
  // before the poll phase that delivers the exit. The probe must still return the child's real result.
  it("returns the real result of a child that exited while the main thread was blocked past the bound", async () => {
    const child = spawn(process.execPath, ["-e", ""], { stdio: ["ignore", "pipe", "pipe"] });
    const onTimedOut = vi.fn(() => child.kill("SIGKILL"));
    let disarm: () => void = () => undefined;
    const closed = new Promise<number | null>((resolve) => child.once("close", (code) => { disarm(); resolve(code); }));
    disarm = armProbeTimeBound({ child, bound: { timeoutMs: 200, byDeadline: false }, runtime: "test", command: "node -e", onTimedOut });
    // Block the main thread well past the bound; the child starts and exits meanwhile (Node starts in well under 1.5 s).
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_500);
    expect(await closed).toBe(0);
    expect(onTimedOut).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
