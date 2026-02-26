import type { IPty } from 'node-pty';
import {
  ensureWslAvailable,
  ensureWslDistroAvailable,
  selectWslDistro,
  windowsPathToWsl
} from './wsl-utils.js';

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const STARTUP_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, `'"'"'`);
}

let isWindowsImpl = () => process.platform === 'win32';

export function setIsWindowsForTests(fn: () => boolean): void {
  isWindowsImpl = fn;
}

type PendingRead = {
  resolve: (value: Buffer | null) => void;
  timer?: NodeJS.Timeout;
};

export class WslTmuxSession {
  private sessionIdValue: string;
  private pty?: IPty;
  private closed = false;
  private alive = false;
  private dataQueue: Buffer[] = [];
  private pendingReads: PendingRead[] = [];
  private wslExe?: string;
  private distro?: string;

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
    if (!isWindowsImpl()) {
      throw new Error('WslTmuxSession is only supported on Windows.');
    }
    if (this.pty) {
      throw new Error('Session already started');
    }

    this.wslExe = ensureWslAvailable();
    ensureWslDistroAvailable(this.wslExe);
    this.distro = selectWslDistro(this.wslExe);

    const wslCwd = windowsPathToWsl(cwd, this.wslExe);
    const { spawn } = await import('node-pty');

    this.pty = spawn(this.wslExe, ['-d', this.distro, '--exec', 'bash', '--noprofile', '--norc', '-i'], {
      name: 'xterm-256color',
      cols: DEFAULT_COLS,
      rows: DEFAULT_ROWS,
      env: {
        ...process.env,
        TERM: 'xterm-256color'
      }
    });

    this.alive = true;
    this.closed = false;

    this.pty.onData((data) => {
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
    });

    this.pty.onExit(() => {
      this.alive = false;
      this.closed = true;
      this.pty = undefined;
      this.flushPending(null);
    });

    await sleep(STARTUP_DELAY_MS);

    const safeCwd = escapeSingleQuotes(wslCwd);
    this.pty.write(`export PS1='\\w $ '\n`);
    this.pty.write(`cd '${safeCwd}'\n`);
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
    } catch {
      // ignore resize failures
    }
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.flushPending(null);

    if (!this.pty) {
      return;
    }

    try {
      this.pty.kill('SIGTERM');
    } catch {
      // ignore kill failures
    }

    await sleep(STARTUP_DELAY_MS);

    if (this.alive) {
      try {
        this.pty.kill('SIGKILL');
      } catch {
        // ignore kill failures
      }
    }

    this.pty = undefined;
    this.alive = false;
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
