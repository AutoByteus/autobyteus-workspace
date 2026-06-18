import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ISOLATED_PTY_BRIDGE_SOURCE } from './isolated-pty-bridge-source.js';
import {
  ensureNodePtySpawnHelperExecutable,
  formatNodePtySpawnHelperDiagnostics,
  getNodePtySpawnHelperDiagnostics,
} from './node-pty-bootstrap.js';

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const STARTUP_TIMEOUT_MS = 5_000;
const CLOSE_GRACE_MS = 250;
const CLOSE_KILL_GRACE_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PendingRead = {
  resolve: (value: Buffer | null) => void;
  timer?: NodeJS.Timeout;
};

type BridgeMessage =
  | { type: 'ready' }
  | { type: 'exit'; exitCode?: number; signal?: number }
  | { type: 'error'; message?: string };

export class IsolatedPtySession {
  private sessionIdValue: string;
  private child?: ChildProcess;
  private closed = false;
  private alive = false;
  private dataQueue: Buffer[] = [];
  private pendingReads: PendingRead[] = [];
  private closePromise?: Promise<void>;
  private startupReject?: (error: Error) => void;
  private startupResolve?: () => void;
  private startupTimer?: NodeJS.Timeout;

  constructor(sessionId: string) {
    this.sessionIdValue = sessionId;
  }

  get sessionId(): string {
    return this.sessionIdValue;
  }

  get isAlive(): boolean {
    return this.alive && !this.closed;
  }

  get selectedShell(): string {
    return 'bash';
  }

  async start(cwd: string): Promise<void> {
    if (this.child) {
      throw new Error('Session already started');
    }
    if (this.closed) {
      throw new Error('Session is closed');
    }

    await ensureNodePtySpawnHelperExecutable();
    if (this.closed) {
      this.alive = false;
      throw new Error('Session closed during startup');
    }

    const child = spawn(process.execPath, ['--input-type=module', '--eval', ISOLATED_PTY_BRIDGE_SOURCE], {
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        PS1: '\\w $ ',
        AUTOBYTEUS_PTY_BRIDGE_COLS: String(DEFAULT_COLS),
        AUTOBYTEUS_PTY_BRIDGE_ROWS: String(DEFAULT_ROWS),
        AUTOBYTEUS_PTY_BRIDGE_REQUIRE_FROM: fileURLToPath(import.meta.url)
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    this.child = child;
    this.alive = true;

    child.stdout?.on('data', (data: Buffer | string) => {
      if (this.closed) {
        return;
      }
      const payload = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      this.enqueue(payload);
    });

    child.stderr?.on('data', (data: Buffer | string) => {
      if (this.closed) {
        return;
      }
      const payload = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      if (this.startupReject) {
        this.rejectStartup(new Error(payload.toString('utf8').trim() || 'PTY bridge startup failed'));
      }
    });

    child.on('message', (message: BridgeMessage) => {
      if (!message || typeof message !== 'object') {
        return;
      }
      if (message.type === 'ready') {
        this.resolveStartup();
        return;
      }
      if (message.type === 'error') {
        this.rejectStartup(new Error(message.message || 'PTY bridge startup failed'));
        return;
      }
      if (message.type === 'exit') {
        this.markExited(child);
      }
    });

    child.once('error', (error) => {
      this.rejectStartup(error instanceof Error ? error : new Error(String(error)));
      this.markExited(child);
    });

    child.once('exit', () => {
      this.markExited(child);
    });

    try {
      await this.waitForStartup();
    } catch (error) {
      await this.close().catch(() => undefined);
      throw await this.createStartupError(error);
    }

    if (this.closed || this.child !== child) {
      await this.close().catch(() => undefined);
      throw new Error('Session closed during startup');
    }
  }

  async write(data: Buffer | string): Promise<void> {
    if (this.closed) {
      throw new Error('Session is closed');
    }
    if (!this.child?.stdin) {
      throw new Error('Session not started');
    }

    const payload = typeof data === 'string' ? data : data.toString('utf8');
    this.child.stdin.write(payload);
  }

  async read(timeout: number = 0.1): Promise<Buffer | null> {
    if (this.closed) {
      return null;
    }
    if (!this.child) {
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
    if (!this.child) {
      throw new Error('Session not started');
    }
    if (this.closed) {
      return;
    }

    try {
      this.child.send?.({ type: 'resize', rows, cols });
    } catch {
      // ignore resize failures for parity with PtySession
    }
  }

  async close(): Promise<void> {
    if (!this.closePromise) {
      this.closePromise = this.closeInternal();
    }
    await this.closePromise;
  }

  private async waitForStartup(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.startupResolve = resolve;
      this.startupReject = reject;
      this.startupTimer = setTimeout(() => {
        this.rejectStartup(new Error('PTY bridge startup timed out'));
      }, STARTUP_TIMEOUT_MS);
    });
  }

  private resolveStartup(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = undefined;
    }
    const resolve = this.startupResolve;
    this.startupResolve = undefined;
    this.startupReject = undefined;
    resolve?.();
  }

  private rejectStartup(error: Error): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = undefined;
    }
    const reject = this.startupReject;
    this.startupResolve = undefined;
    this.startupReject = undefined;
    reject?.(error);
  }

  private async createStartupError(error: unknown): Promise<Error> {
    const message = error instanceof Error ? error.message : String(error);
    const diagnostics = await getNodePtySpawnHelperDiagnostics().catch((diagnosticError) => ({
      platform: process.platform,
      arch: process.arch,
      resolutionError: diagnosticError instanceof Error
        ? diagnosticError.message
        : String(diagnosticError),
    }));

    return new Error(
      `PTY bridge startup failed: ${message}. ${formatNodePtySpawnHelperDiagnostics(diagnostics)}`,
    );
  }

  private async closeInternal(): Promise<void> {
    if (this.closed && !this.child) {
      this.alive = false;
      return;
    }

    const child = this.child;
    this.closed = true;
    this.alive = false;
    this.resolveStartup();
    this.flushPending(null);
    this.dataQueue = [];

    if (!child) {
      return;
    }

    await this.stopChild(child);
    if (this.child === child) {
      this.child = undefined;
    }
  }

  private async stopChild(child: ChildProcess): Promise<void> {
    const exited = new Promise<void>((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve();
        return;
      }
      child.once('exit', () => resolve());
    });

    try {
      child.send?.({ type: 'close' });
    } catch {
      // ignore IPC close failures
    }
    try {
      child.stdin?.end();
    } catch {
      // ignore stdin close failures
    }

    if (await this.waitForProcessExit(exited, CLOSE_GRACE_MS)) {
      this.destroyChildStreams(child);
      return;
    }

    try {
      child.kill('SIGTERM');
    } catch {
      // ignore kill failures
    }

    if (!(await this.waitForProcessExit(exited, CLOSE_KILL_GRACE_MS))) {
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore kill failures
      }
      await this.waitForProcessExit(exited, CLOSE_KILL_GRACE_MS);
    }

    this.destroyChildStreams(child);
  }

  private async waitForProcessExit(exitPromise: Promise<void>, timeoutMs: number): Promise<boolean> {
    let timedOut = false;
    await Promise.race([
      exitPromise,
      sleep(timeoutMs).then(() => {
        timedOut = true;
      })
    ]);
    return !timedOut;
  }

  private destroyChildStreams(child: ChildProcess): void {
    try {
      child.stdin?.destroy();
    } catch {
      // ignore stream cleanup failures
    }
    try {
      child.stdout?.destroy();
    } catch {
      // ignore stream cleanup failures
    }
    try {
      child.stderr?.destroy();
    } catch {
      // ignore stream cleanup failures
    }
    try {
      if (child.connected) {
        child.disconnect();
      }
    } catch {
      // ignore ipc cleanup failures
    }
    child.removeAllListeners();
  }

  private markExited(child: ChildProcess): void {
    this.alive = false;
    this.closed = true;
    if (this.child === child) {
      this.child = undefined;
    }
    this.flushPending(null);
    this.dataQueue = [];
    this.resolveStartup();
    this.destroyChildStreams(child);
  }

  private enqueue(payload: Buffer): void {
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
