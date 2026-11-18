/**
 * The end time of one whole read step (for example "Antigravity's model list within 8 s"). Every command, handshake
 * or request inside the step shares it: each gets `min(its usual time-out, the time left)`, and nothing starts once
 * the time is up. `timeoutMs` elsewhere keeps its own meaning: the bound of one command.
 */
export type ReadDeadline = Readonly<{ endsAt: number }>;

/**
 * A step stopped by its own deadline. Its message names no command, path or output. A helper with its own classified
 * error (e.g. a discovery diagnostic) keeps it and carries this error as its `cause`.
 */
export class DeadlineExceededError extends Error {
  constructor() {
    super("The read did not finish in time.");
    this.name = "DeadlineExceededError";
  }
}

/**
 * The one rule for "this step timed out": the error is, or was caused by, its deadline's time-out. Never decided by
 * reading the clock afterwards: timers run on the monotonic clock while `endsAt` is wall-clock time, so a step can stop
 * with a millisecond still "left" (CR-002).
 */
export const isDeadlineExceeded = (error: unknown): boolean => {
  for (let current = error, depth = 0; current && depth < 5; depth += 1) {
    if (current instanceof DeadlineExceededError) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
};

export const createReadDeadline = (ms: number): ReadDeadline => Object.freeze({ endsAt: Date.now() + ms });

/** Milliseconds left, never below 0. */
export const timeLeft = (deadline: ReadDeadline): number => Math.max(0, deadline.endsAt - Date.now());

/**
 * One command's bound inside a step: its usual time-out, cut to the time left. `byDeadline`: the deadline set the bound,
 * so the command's time-out is the step's (its error must say so). `timeoutMs` 0: out of time, do not start.
 */
export type CommandBound = Readonly<{ timeoutMs: number; byDeadline: boolean }>;

export const commandBound = (deadline: ReadDeadline | undefined, usualMs: number): CommandBound => {
  if (!deadline) return { timeoutMs: usualMs, byDeadline: false };
  const left = timeLeft(deadline);
  return left <= usualMs ? { timeoutMs: left, byDeadline: true } : { timeoutMs: usualMs, byDeadline: false };
};

/** `commandBound(...).timeoutMs`, for commands whose time-out reason does not matter (version, sign-in). */
export const commandTimeout = (deadline: ReadDeadline | undefined, usualMs: number): number =>
  commandBound(deadline, usualMs).timeoutMs;

/** The cause to attach to a helper's own time-out error, when the step's deadline set the bound. */
export const deadlineCause = (bound: CommandBound): { cause: DeadlineExceededError } | undefined =>
  bound.byDeadline ? { cause: new DeadlineExceededError() } : undefined;

/**
 * For work without a process of its own to stop (a request on a shared client): rejects with `DeadlineExceededError`
 * at the deadline, and the caller releases what it holds. Without a deadline, the work.
 */
export const raceDeadline = <T>(work: Promise<T>, deadline: ReadDeadline | undefined): Promise<T> => {
  if (!deadline) return work;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DeadlineExceededError()), timeLeft(deadline));
  });
  // A late rejection of the abandoned work must not surface as unhandled.
  work.catch(() => undefined);
  return Promise.race([work, expired]).finally(() => clearTimeout(timer));
};
