import type { ChildProcess } from "node:child_process";
import type { CommandBound } from "./read-deadline.js";

/** How long a probe waits for the `close` of a child that has already exited when its bound fires. */
export const EXITED_CHILD_CLOSE_GRACE_MS = 1_000;

/**
 * A capability probe's time bound for one child command (autobyteus-576, FU-008). When the bound fires, a child that
 * has already exited is not a time-out: its `close`, with the real result, is only pending (stdio still draining on a
 * busy host), so the probe waits up to `EXITED_CHILD_CLOSE_GRACE_MS` more for it. Only a child that is still running,
 * or whose `close` never comes, times out: then `RUNTIME_PROBE_TIMED_OUT { runtime, command, boundMs }` is logged and
 * `onTimedOut` runs. Returns the function that disarms the bound once the probe has finished.
 */
export const armProbeTimeBound = (input: Readonly<{
  child: Pick<ChildProcess, "exitCode" | "signalCode">;
  bound: CommandBound;
  runtime: string;
  command: string;
  onTimedOut: () => void;
}>): (() => void) => {
  let grace: ReturnType<typeof setTimeout> | null = null;
  const timedOut = () => {
    console.warn("RUNTIME_PROBE_TIMED_OUT", { runtime: input.runtime, command: input.command, boundMs: input.bound.timeoutMs });
    input.onTimedOut();
  };
  const timer = setTimeout(() => {
    const exited = input.child.exitCode !== null || input.child.signalCode !== null;
    if (exited) grace = setTimeout(timedOut, EXITED_CHILD_CLOSE_GRACE_MS);
    else timedOut();
  }, input.bound.timeoutMs);
  return () => {
    clearTimeout(timer);
    if (grace) clearTimeout(grace);
  };
};
