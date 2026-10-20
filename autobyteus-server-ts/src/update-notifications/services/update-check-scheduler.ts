import type { GitHubSourceUpdateState } from "../../integrations/github/github-source-update-state.js";

export const INITIAL_DELAY_MS = 60_000;
export const TICK_INTERVAL_MS = 1_800_000;
/** A source is due when its last check of any kind is at least this old (REQ-002). */
export const CHECK_INTERVAL_MS = 21_600_000;

/** One source owner's public checking surface, as the scheduler uses it. */
export type CheckedSourceOwner = Readonly<{
  name: string;
  listGitHubSourceUpdateStates(): GitHubSourceUpdateState[] | Promise<GitHubSourceUpdateState[]>;
  check(sourceId: string): Promise<unknown>;
}>;

type Timers = Readonly<{
  setTimeout: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
}>;

const isDue = (state: GitHubSourceUpdateState, now: number): boolean => {
  if (state.lastCheckedAt === null) return true;
  const checkedAt = Date.parse(state.lastCheckedAt);
  return !Number.isFinite(checkedAt) || now - checkedAt >= CHECK_INTERVAL_MS;
};

const checkedTime = (state: GitHubSourceUpdateState): number =>
  state.lastCheckedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(state.lastCheckedAt) || Number.NEGATIVE_INFINITY;

/**
 * When automatic update checks run (DS-006): a first pass shortly after start, then a tick every
 * 30 minutes. A pass checks the sources not checked for 6 hours, one at a time (packages, then
 * skill sources; oldest check first), through the owners' own check. It stops when the setting is
 * turned off or GitHub rate-limits this node. It never decides what a check does or what is
 * notified.
 */
export class UpdateCheckScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private closed = false;

  constructor(private readonly deps: {
    isEnabled: () => boolean;
    isRateLimited: () => boolean;
    owners: readonly CheckedSourceOwner[];
    afterPass: () => Promise<unknown>;
    now?: () => Date;
    timers?: Timers;
  }) {}

  start(): void {
    this.schedule(INITIAL_DELAY_MS);
  }

  /** Stops future ticks; a pass in flight may finish its current check. */
  close(): void {
    this.closed = true;
    if (this.timer) this.timers.clearTimeout(this.timer);
    this.timer = null;
  }

  async runPass(): Promise<void> {
    if (this.running || !this.canCheck()) return;
    this.running = true;
    try {
      let checked = 0;
      passing: for (const owner of this.deps.owners) {
        const due = await this.dueSourceIds(owner);
        for (const sourceId of due) {
          // The setting and the gate are read before every source, so either stops the pass.
          if (this.closed || !this.canCheck()) break passing;
          try {
            await owner.check(sourceId);
          } catch (error) {
            console.warn(`UPDATE_CHECK_FAILED:${owner.name}:${sourceId}`, error);
          }
          checked += 1;
        }
      }
      if (checked > 0) await this.deps.afterPass();
    } catch (error) {
      console.warn("UPDATE_CHECK_PASS_FAILED", error);
    } finally {
      this.running = false;
    }
  }

  private canCheck(): boolean {
    return this.deps.isEnabled() && !this.deps.isRateLimited();
  }

  private async dueSourceIds(owner: CheckedSourceOwner): Promise<string[]> {
    const now = this.now().getTime();
    const states = await owner.listGitHubSourceUpdateStates();
    return states
      .filter((state) => isDue(state, now))
      .sort((left, right) => checkedTime(left) - checkedTime(right))
      .map((state) => state.sourceId);
  }

  private schedule(delayMs: number): void {
    if (this.closed) return;
    this.timer = this.timers.setTimeout(() => {
      this.timer = null;
      void this.runPass().finally(() => this.schedule(TICK_INTERVAL_MS));
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

  private now(): Date {
    return this.deps.now?.() ?? new Date();
  }
}
