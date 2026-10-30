import { terminateServerProcessTree, type ProcessTreeSweepResult } from './server-process-tree-sweep.js';
export const SHUTDOWN_WIRE = {
  ready: 'autobyteus.embedded-server.shutdown.v1:ready',
  request: 'autobyteus.embedded-server.shutdown.v1:request',
  complete: 'autobyteus.embedded-server.shutdown.v1:complete',
  failed: 'autobyteus.embedded-server.shutdown.v1:failed',
} as const;
export const SERVER_SHUTDOWN_TIMEOUT_MS = 10_000;
export class StartupCancelled extends Error {}
type ShutdownTimers = Readonly<{
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}>;
export type ServerProcessShutdownOptions = Readonly<{
  cleanupTimeoutMs?: number;
  sweep?: () => Promise<ProcessTreeSweepResult>;
  timers?: ShutdownTimers;
}>;
const defaultTimers: ShutdownTimers = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
/**
 * One owner for signals/IPC, startup barrier, the current cleanup authority and the bounded exit:
 * cleanup (at most `cleanupTimeoutMs` after startup settles) → process-tree sweep → result → exit.
 */
export class ServerProcessShutdown {
  requested = false;
  private transportFailed = false;
  private transportReady: Promise<void> = Promise.resolve();
  private cleanup: () => Promise<void> = async () => {};
  private cleanupPromise?: Promise<void>;
  private completion?: Promise<void>;
  private settle!: () => void;
  private readonly startupSettled = new Promise<void>(resolve => { this.settle = resolve; });
  private readonly signal = () => { void this.request(); };
  private readonly message = (value: unknown) => { if (value === SHUTDOWN_WIRE.request) void this.request(); };
  private readonly cleanupTimeoutMs: number;
  private readonly sweep: () => Promise<ProcessTreeSweepResult>;
  private readonly timers: ShutdownTimers;
  constructor(private readonly runtime: NodeJS.Process = process, options: ServerProcessShutdownOptions = {}) {
    this.cleanupTimeoutMs = options.cleanupTimeoutMs ?? SERVER_SHUTDOWN_TIMEOUT_MS;
    this.sweep = options.sweep ?? (() => terminateServerProcessTree());
    this.timers = options.timers ?? defaultTimers;
    runtime.on('SIGINT', this.signal); runtime.on('SIGTERM', this.signal); runtime.on('message', this.message);
    if (runtime.send) this.transportReady = this.send(SHUTDOWN_WIRE.ready).catch(() => {
      this.transportFailed = true; void this.request();
    });
  }
  setCleanup(cleanup: () => Promise<void>): void { this.cleanup = cleanup; }
  checkpoint(): void { if (this.requested) throw new StartupCancelled('Server startup cancelled by shutdown'); }
  async stage<T>(initialize: () => Promise<T>): Promise<T> {
    this.checkpoint(); const result = await initialize(); this.checkpoint(); return result;
  }
  settleStartup(): void { this.settle(); }
  cleanupOnce(): Promise<void> { return this.cleanupPromise ??= Promise.resolve().then(() => this.cleanup()); }
  request(): Promise<void> {
    this.requested = true;
    return this.completion ??= (async () => {
      await this.startupSettled;
      let code = 0;
      try {
        if (await this.cleanupWithinBound() === 'expired') {
          code = 1; console.error(`Server shutdown exceeded ${this.cleanupTimeoutMs / 1000}s; forcing exit`);
        }
      } catch (error) { code = 1; console.error('Backend shutdown incomplete', error); }
      // Always sweep: runtime CLIs whose release did not finish and groups nobody confirmed have no other stopper.
      const sweep = await this.sweep().catch((error: unknown) => (
        { outcome: 'unconfirmed', targets: 0, reason: String(error) } as const));
      if (sweep.outcome === 'unconfirmed') {
        code = 1; console.error(`Server process-tree sweep unconfirmed (${sweep.targets} target(s)): ${sweep.reason}`);
      }
      await this.transportReady;
      if (this.transportFailed) code = 1;
      if (this.runtime.send) {
        try { await this.send(code ? SHUTDOWN_WIRE.failed : SHUTDOWN_WIRE.complete); }
        catch (error) { code = 1; console.error('Backend shutdown result unconfirmed', error); }
      }
      this.dispose(); this.runtime.exit(code);
    })();
  }
  /** Resolves 'expired' when cleanup is still running at the bound; the cut cleanup keeps running beside the sweep. */
  private cleanupWithinBound(): Promise<'done' | 'expired'> {
    return new Promise((resolve, reject) => {
      const timer = this.timers.setTimeout(() => resolve('expired'), this.cleanupTimeoutMs);
      this.cleanupOnce().then(() => { this.timers.clearTimeout(timer); resolve('done'); },
        error => { this.timers.clearTimeout(timer); reject(error); });
    });
  }
  private send(value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = this.timers.setTimeout(() => reject(new Error('Shutdown IPC flush timed out')), 250);
      try { this.runtime.send!(value, error => { this.timers.clearTimeout(timer); error ? reject(error) : resolve(); }); }
      catch (error) { this.timers.clearTimeout(timer); reject(error); }
    });
  }
  dispose(): void {
    this.runtime.off('SIGINT', this.signal); this.runtime.off('SIGTERM', this.signal); this.runtime.off('message', this.message);
  }
}
