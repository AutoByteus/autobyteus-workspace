/**
 * The end time of one whole read step (for example "Antigravity's model list within 8 s"). Every command, handshake
 * or request inside the step shares it: each gets `min(its usual time-out, the time left)`, and nothing starts once
 * the time is up. `timeoutMs` elsewhere keeps its own meaning: the bound of one command.
 */
export type ReadDeadline = Readonly<{ endsAt: number }>;

/** A step that ran past its deadline. Its message names no command, path or output. */
export class ReadDeadlineExceededError extends Error {
  constructor() {
    super("The read did not finish in time.");
    this.name = "ReadDeadlineExceededError";
  }
}

export const createReadDeadline = (ms: number): ReadDeadline => Object.freeze({ endsAt: Date.now() + ms });

/** Milliseconds left, never below 0. */
export const timeLeft = (deadline: ReadDeadline): number => Math.max(0, deadline.endsAt - Date.now());

/**
 * One command's bound inside a step: its usual time-out, cut to the time left. 0 means the step is out of time and
 * the command must not start. Without a deadline (launch paths, the Agent Runtimes page) the usual time-out applies.
 */
export const commandTimeout = (deadline: ReadDeadline | undefined, usualMs: number): number =>
  deadline ? Math.min(usualMs, timeLeft(deadline)) : usualMs;

/**
 * For work without a process of its own to stop (a request on a shared client): rejects with
 * `ReadDeadlineExceededError` at the deadline, and the caller releases what it holds. Without a deadline, the work.
 */
export const raceDeadline = <T>(work: Promise<T>, deadline: ReadDeadline | undefined): Promise<T> => {
  if (!deadline) return work;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ReadDeadlineExceededError()), timeLeft(deadline));
  });
  // A late rejection of the abandoned work must not surface as unhandled.
  work.catch(() => undefined);
  return Promise.race([work, expired]).finally(() => clearTimeout(timer));
};
