import { isAppUpdateAutoCheck, type AppUpdateAutoCheck } from '../../shared/appUpdateTypes';
import { logger } from '../logger';
import { loadAppUpdateCheckSettings, saveAppUpdateCheckSettings } from './appUpdateCheckSettingsStore';

/** The launch check comes this long after start. */
export const APP_UPDATE_LAUNCH_CHECK_DELAY_MS = 8_000;
const MINUTE_MS = 60_000;

export type AppUpdateCheckSource = 'startup' | 'periodic';

/** What the schedule needs from the updater: it runs checks and says when it is busy. */
export type AppUpdateCheckTarget = {
  checkForUpdates(source: AppUpdateCheckSource): Promise<unknown>;
  /** Checking, downloading, downloaded (staged) or installing. */
  isBusy(): boolean;
};

type Timers = {
  setTimeout: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
};

export type AppUpdateCheckSettingsChange = { accepted: boolean; persisted: boolean };

/**
 * The one owner of the app's automatic update checks (DS-005, AR-004): its settings file (the only
 * writer of `app-update-checks.json`), the timer and the skip rules. When on, it checks 8 s after
 * start and then every interval after the previous check; a check is skipped (and the next one
 * scheduled) while the updater is busy or the machine is offline. A settings change is saved,
 * re-arms the timer and is told to the one listener.
 */
export class AppUpdateCheckSchedule {
  private current: AppUpdateAutoCheck;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listener: (() => void) | null = null;
  private startedAt: number | null = null;
  /** When the schedule last ran (or skipped) a check; null before the launch check. */
  private lastRunAt: number | null = null;
  private running = false;
  private stopped = false;

  constructor(private readonly deps: {
    userDataPath: string;
    target: AppUpdateCheckTarget;
    isOnline: () => boolean;
    launchDelayMs?: number;
    timers?: Timers;
    now?: () => number;
  }) {
    this.current = loadAppUpdateCheckSettings(deps.userDataPath);
  }

  settings(): AppUpdateAutoCheck {
    return { ...this.current };
  }

  /** The updater's state follows the settings through this one listener. */
  onChange(listener: (() => void) | null): void {
    this.listener = listener;
  }

  /** Starts the schedule once (packaged launches only); when on, the launch check comes first. */
  start(): void {
    if (this.startedAt !== null || this.stopped) return;
    this.startedAt = this.now();
    this.arm();
  }

  /** Validates (15..1440 whole minutes), saves and re-arms. An invalid value changes nothing. */
  setSettings(value: unknown): AppUpdateCheckSettingsChange {
    if (!isAppUpdateAutoCheck(value)) return { accepted: false, persisted: false };
    const next = { enabled: value.enabled, intervalMinutes: value.intervalMinutes };
    // A failed save still applies the settings for this session; the caller reports it.
    const persisted = saveAppUpdateCheckSettings(this.deps.userDataPath, next);
    this.current = next;
    this.arm();
    try {
      this.listener?.();
    } catch (error) {
      logger.warn('[updater] App update check settings listener failed.', error);
    }
    return { accepted: true, persisted };
  }

  stop(): void {
    this.stopped = true;
    this.clear();
  }

  /**
   * Arms the next check from the current settings: the launch check (8 s after start) until one
   * ran, then one interval after the last one. Nothing while off, not started, or a check runs
   * (it re-arms when it finishes).
   */
  private arm(): void {
    this.clear();
    if (!this.current.enabled || this.startedAt === null || this.running || this.stopped) return;
    const launchDelayMs = this.deps.launchDelayMs ?? APP_UPDATE_LAUNCH_CHECK_DELAY_MS;
    const dueAt = this.lastRunAt === null
      ? this.startedAt + launchDelayMs
      : this.lastRunAt + this.current.intervalMinutes * MINUTE_MS;
    const source: AppUpdateCheckSource = this.lastRunAt === null ? 'startup' : 'periodic';
    this.timer = this.timers.setTimeout(() => {
      this.timer = null;
      void this.run(source);
    }, Math.max(0, dueAt - this.now()));
  }

  private async run(source: AppUpdateCheckSource): Promise<void> {
    if (!this.current.enabled || this.stopped) return;
    this.lastRunAt = this.now();
    if (this.deps.target.isBusy()) {
      logger.info('[updater] Skipping the automatic update check: an app update is in progress.');
    } else if (!this.deps.isOnline()) {
      logger.info('[updater] Skipping the automatic update check: offline.');
    } else {
      this.running = true;
      try {
        await this.deps.target.checkForUpdates(source);
      } catch (error) {
        logger.warn('[updater] Automatic update check failed.', error);
      } finally {
        this.running = false;
      }
    }
    this.arm();
  }

  private clear(): void {
    if (this.timer) this.timers.clearTimeout(this.timer);
    this.timer = null;
  }

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  private get timers(): Timers {
    return this.deps.timers ?? {
      setTimeout: (callback, ms) => setTimeout(callback, ms),
      clearTimeout: (handle) => clearTimeout(handle),
    };
  }
}
