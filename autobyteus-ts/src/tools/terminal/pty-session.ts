import type { IPty } from 'node-pty';
import { ensureNodePtySpawnHelperExecutable } from './node-pty-bootstrap.js';
import { buildAgentChildEnvironment } from './agent-child-environment.js';

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const STARTUP_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PendingRead = {
  resolve: (value: Buffer | null) => void;
  timer?: NodeJS.Timeout;
};

type PtyDisposable = {
  dispose: () => void;
};

type ManagedPty = IPty & {
  destroy?: () => void;
  onData: (listener: (data: string) => void) => PtyDisposable | void;
  onExit: (
    listener: (event?: { exitCode?: number; signal?: number }) => void
  ) => PtyDisposable | void;
};

export class PtySession {
  private sessionIdValue: string;
  private pty?: ManagedPty;
  private closed = false;
  private alive = false;
  private dataQueue: Buffer[] = [];
  private pendingReads: PendingRead[] = [];
  private ptyDisposables: PtyDisposable[] = [];
  private exitWaiters: Array<() => void> = [];
  private closePromise?: Promise<void>;
  private cwd?: string;

  constructor(sessionId: string) {
    this.sessionIdValue = sessionId;
  }

  get sessionId(): string {
    return this.sessionIdValue;
  }

  get isAlive(): boolean {
    return this.alive && !this.closed;
  }

  async start(cwd: string): Promise<void> {
    if (this.pty) {
      throw new Error('Session already started');
    }

    this.cwd = cwd;
    this.closed = false;
    this.alive = true;

    const env = buildAgentChildEnvironment(process.env, {
      TERM: 'xterm-256color',
      PS1: '\\w $ '
    });

    await ensureNodePtySpawnHelperExecutable();
    if (this.closed) {
      this.alive = false;
      throw new Error('Session closed during startup');
    }

    const { spawn } = await import('node-pty');
    if (this.closed) {
      this.alive = false;
      throw new Error('Session closed during startup');
    }

    const pty = spawn('bash', ['--norc', '--noprofile', '-i'], {
      name: 'xterm-256color',
      cwd,
      env,
      cols: DEFAULT_COLS,
      rows: DEFAULT_ROWS
    }) as ManagedPty;
    this.pty = pty;

    this.rememberDisposable(pty.onData((data) => {
      if (this.closed) {
        return;
      }
      const payload = Buffer.from(data, 'utf8');
      if (payload.length === 0) {
        return;
      }

      const pending = this.pendingReads.shift();
      if (pending) {
        if (pending.timer) {
          clearTimeout(pending.timer);
        }
        pending.resolve(payload);
      } else {
        this.dataQueue.push(payload);
      }
    }));

    this.rememberDisposable(pty.onExit(() => {
      this.markExited(pty);
    }));

    await sleep(STARTUP_DELAY_MS);
    if (this.closed || this.pty !== pty) {
      await this.close();
      throw new Error('Session closed during startup');
    }
  }

  async write(data: Buffer | string): Promise<void> {
    if (this.closed) {
      throw new Error('Session is closed');
    }
    if (!this.pty) {
      throw new Error('Session not started');
    }

    const text = typeof data === 'string' ? data : data.toString('utf8');
    this.pty.write(text);
  }

  async read(timeout: number = 0.1): Promise<Buffer | null> {
    if (this.closed) {
      return null;
    }
    if (!this.pty) {
      throw new Error('Session not started');
    }

    if (this.dataQueue.length > 0) {
      return this.dataQueue.shift() ?? null;
    }

    if (timeout <= 0) {
      return null;
    }

    return new Promise((resolve) => {
      const pending: PendingRead = { resolve };
      pending.timer = setTimeout(() => {
        this.pendingReads = this.pendingReads.filter((item) => item !== pending);
        resolve(null);
      }, timeout * 1000);
      this.pendingReads.push(pending);
    });
  }

  resize(rows: number, cols: number): void {
    if (!this.pty) {
      throw new Error('Session not started');
    }
    if (this.closed) {
      return;
    }

    try {
      this.pty.resize(cols, rows);
    } catch (error) {
      // swallow resize errors to match Python behavior
    }
  }

  async close(): Promise<void> {
    if (!this.closePromise) {
      this.closePromise = this.closeInternal();
    }
    await this.closePromise;
  }

  private async closeInternal(): Promise<void> {
    if (this.closed && !this.pty) {
      this.alive = false;
      this.resolveExitWaiters();
      return;
    }

    const pty = this.pty;
    this.closed = true;
    this.flushPending(null);
    this.dataQueue = [];

    if (!pty) {
      this.alive = false;
      this.resolveExitWaiters();
      return;
    }

    this.destroyPty(pty);

    try {
      pty.kill('SIGTERM');
    } catch (error) {
      // ignore kill failures
    }

    await this.waitForExit(STARTUP_DELAY_MS);

    if (this.alive && this.pty === pty) {
      try {
        pty.kill('SIGKILL');
      } catch (error) {
        // ignore kill failures
      }
      await this.waitForExit(STARTUP_DELAY_MS);
    }

    if (this.pty === pty) {
      this.pty = undefined;
    }
    this.alive = false;
    this.disposePtyListeners();
    this.resolveExitWaiters();
  }

  private rememberDisposable(disposable: PtyDisposable | void): void {
    if (disposable) {
      this.ptyDisposables.push(disposable);
    }
  }

  private disposePtyListeners(): void {
    while (this.ptyDisposables.length > 0) {
      const disposable = this.ptyDisposables.pop();
      try {
        disposable?.dispose();
      } catch {
        // ignore listener disposal failures
      }
    }
  }

  private destroyPty(pty: ManagedPty): void {
    try {
      pty.destroy?.();
    } catch {
      // ignore destroy failures
    }
  }

  private markExited(pty: ManagedPty): void {
    this.alive = false;
    this.closed = true;
    if (this.pty === pty) {
      this.pty = undefined;
    }
    this.flushPending(null);
    this.disposePtyListeners();
    this.resolveExitWaiters();
  }

  private waitForExit(timeoutMs: number): Promise<void> {
    if (!this.alive) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let timer: NodeJS.Timeout;
      const done = () => {
        clearTimeout(timer);
        this.exitWaiters = this.exitWaiters.filter((waiter) => waiter !== done);
        resolve();
      };
      timer = setTimeout(done, timeoutMs);
      this.exitWaiters.push(done);
    });
  }

  private resolveExitWaiters(): void {
    const waiters = this.exitWaiters.splice(0);
    for (const waiter of waiters) {
      waiter();
    }
  }

  private flushPending(value: Buffer | null): void {
    while (this.pendingReads.length > 0) {
      const pending = this.pendingReads.shift();
      if (!pending) {
        continue;
      }
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      pending.resolve(value);
    }
  }
}
