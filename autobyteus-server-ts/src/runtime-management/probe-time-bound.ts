import type { CommandBound } from "./read-deadline.js";

/** What the bound needs of a child process (a `ChildProcess` is one): its `exit` notification. */
export type ProbeChildExit = {
  once(event: "exit", listener: () => void): unknown;
  removeListener(event: "exit", listener: () => void): unknown;
};

/** How long a probe waits for the `close` of a child that has already exited when its bound fires. */
export const EXITED_CHILD_CLOSE_GRACE_MS = 1_000;

/**
 * A capability probe's time bound for one child command (autobyteus-576, FU-008, SR-002). When the bound fires, a child
 * that has already exited is not a time-out: its `close`, with the real result, is only pending, so the probe waits up
 * to `EXITED_CHILD_CLOSE_GRACE_MS` more for it. Only a child that is still running, or whose `close` never comes, times
 * out: then `RUNTIME_PROBE_TIMED_OUT { runtime, command, boundMs }` is logged and `onTimedOut` runs.
 *
 * The exit is learned from the child's `exit` event, never from `exitCode`/`signalCode`: Node sets those only when it
 * processes the exit. After the main thread was blocked past the bound, the event loop runs the expired timer before
 * the poll phase that delivers the exit (CRR-001 CR-001), so the timer defers its decision with `setImmediate`, which
 * runs after that poll phase. Returns the function that disarms the bound (and removes its listener).
 */
export const armProbeTimeBound = (input: Readonly<{
  child: ProbeChildExit;
  bound: CommandBound;
  runtime: string;
  command: string;
  onTimedOut: () => void;
}>): (() => void) => {
  let exited = false;
  const onExit = () => { exited = true; };
  input.child.once("exit", onExit);
  let decision: ReturnType<typeof setImmediate> | null = null;
  let grace: ReturnType<typeof setTimeout> | null = null;
  const timedOut = () => {
    console.warn("RUNTIME_PROBE_TIMED_OUT", { runtime: input.runtime, command: input.command, boundMs: input.bound.timeoutMs });
    input.onTimedOut();
  };
  const timer = setTimeout(() => {
    decision = setImmediate(() => {
      decision = null;
      if (exited) grace = setTimeout(timedOut, EXITED_CHILD_CLOSE_GRACE_MS);
      else timedOut();
    });
  }, input.bound.timeoutMs);
  return () => {
    clearTimeout(timer);
    if (decision) clearImmediate(decision);
    if (grace) clearTimeout(grace);
    input.child.removeListener("exit", onExit);
  };
};
