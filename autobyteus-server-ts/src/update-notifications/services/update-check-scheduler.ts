import type { UpdatePass } from "./update-pass.js";

/** The first tick comes this long after start, plus a random part of the same length (REQ-003). */
export const FIRST_TICK_DELAY_MS = 60_000;
export const TICK_INTERVAL_MS = 60_000;

type Timers = Readonly<{
  setTimeout: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
}>;

/**
 * When the node's update pass runs (DS-007): a first tick a minute (plus up to a minute) after
 * start, then a tick every minute after the previous pass finished, so passes never overlap. It
 * never decides what a pass does; the cheap ticks let a switch turned on act within about a minute.
 */
export class UpdateCheckScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(private readonly deps: {
    pass: Pick<UpdatePass, "run">;
    random?: () => number;
    timers?: Timers;
  }) {}

  start(): void {
    this.schedule(FIRST_TICK_DELAY_MS + (this.deps.random ?? Math.random)() * FIRST_TICK_DELAY_MS);
  }

  /** Stops future ticks; a pass in flight finishes on its own. */
  close(): void {
    this.closed = true;
    if (this.timer) this.timers.clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(delayMs: number): void {
    if (this.closed) return;
    this.timer = this.timers.setTimeout(() => {
      this.timer = null;
      void this.deps.pass.run()
        .catch((error) => console.warn("UPDATE_PASS_FAILED", error))
        .finally(() => this.schedule(TICK_INTERVAL_MS));
    }, delayMs);
  }

  private get timers(): Timers {
    return this.deps.timers ?? {
      setTimeout: (callback, ms) => {
        const handle = setTimeout(callback, ms);
        handle.unref?.();
        return handle;
      },
      clearTimeout: (handle) => clearTimeout(handle),
    };
  }
}
