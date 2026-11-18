/*
 * The native command scope's time limits, in one place. Measured on a loaded 10-core Mac (autobyteus-524 RF-004,
 * RF-005): in a burst of 200 commands at load ~160 a healthy start takes up to 18.4 s, and one `ps` read several
 * seconds. A deadline below gives up on a step; a single `ps` or WSL run has no limit of its own: it is bounded by the
 * deadline of the step it serves.
 */

/** Start handshake: launch until START is confirmed (pid, process-group check, START). A call's shorter timeout caps it. */
export const COMMAND_START_LIMIT_MS = 30_000;
/** Observing a command's group: inspection, and confirming a finished command's group is empty (retirement). */
export const COMMAND_OBSERVATION_LIMIT_MS = 10_000;
/** Stopping a command: TERM, then KILL if needed, until its group is confirmed gone. */
export const COMMAND_STOP_LIMIT_MS = 30_000;

/*
 * Graces: wait this long, then take the next step. Running out is the intended path, not a failure.
 */

/** A start-gated anchor's own exit after cancel, before it is killed. */
export const COMMAND_CANCEL_GATE_GRACE_MS = 500;
/** Between TERM and KILL of a command's group. */
export const COMMAND_TERM_GRACE_MS = 500;
/** The stdout end marker after the wrapper reported its foreground end; output read so far is returned after it. */
export const COMMAND_END_MARKER_GRACE_MS = 1_000;

/** Host shutdown: the whole scope's close; commands not confirmed by then are reported `unconfirmed`. */
export const COMMAND_SCOPE_SHUTDOWN_BUDGET_MS = 3_000;

export async function beforeDeadline<T>(promise: Promise<T>, deadline: number): Promise<T> {
  let timer: NodeJS.Timeout;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Command control deadline exceeded')), Math.max(0, deadline - Date.now()));
  })]); } finally { clearTimeout(timer!); }
}
