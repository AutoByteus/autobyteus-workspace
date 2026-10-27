export const SHUTDOWN_WIRE = {
  ready: 'autobyteus.embedded-server.shutdown.v1:ready',
  request: 'autobyteus.embedded-server.shutdown.v1:request',
  complete: 'autobyteus.embedded-server.shutdown.v1:complete',
  failed: 'autobyteus.embedded-server.shutdown.v1:failed',
} as const;
export class StartupCancelled extends Error {}
/** One owner for signals/IPC, startup barrier and the current cleanup authority. */
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
  constructor(private readonly runtime: NodeJS.Process = process) {
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
      try { await this.cleanupOnce(); }
      catch (error) { code = 1; console.error('Backend shutdown incomplete', error); }
      await this.transportReady;
      if (this.transportFailed) code = 1;
      if (this.runtime.send) {
        try { await this.send(code ? SHUTDOWN_WIRE.failed : SHUTDOWN_WIRE.complete); }
        catch (error) { code = 1; console.error('Backend shutdown result unconfirmed', error); }
      }
      this.dispose(); this.runtime.exit(code);
    })();
  }
  private send(value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Shutdown IPC flush timed out')), 250);
      try { this.runtime.send!(value, error => { clearTimeout(timer); error ? reject(error) : resolve(); }); }
      catch (error) { clearTimeout(timer); reject(error); }
    });
  }
  dispose(): void {
    this.runtime.off('SIGINT', this.signal); this.runtime.off('SIGTERM', this.signal); this.runtime.off('message', this.message);
  }
}
