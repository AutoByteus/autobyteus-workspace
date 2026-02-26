import { accessSync, constants as fsConstants, statSync } from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

const STARTUP_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PendingRead = {
  resolve: (value: Buffer | null) => void;
  timer?: NodeJS.Timeout;
};

function findExecutable(
  command: string,
  envPath: string,
  platform: NodeJS.Platform,
  pathExt: string | undefined
): string | null {
  const segments = envPath.split(path.delimiter).filter(Boolean);
  const extensions = platform === 'win32'
    ? (pathExt?.split(';').filter(Boolean) ?? ['.EXE', '.CMD', '.BAT'])
    : [''];

  for (const dir of segments) {
    const base = path.join(dir, command);
    for (const ext of extensions) {
      const candidate = ext ? `${base}${ext}` : base;
      try {
        const stats = statSync(candidate);
        if (!stats.isFile()) {
          continue;
        }
        const accessMode = platform === 'win32' ? fsConstants.F_OK : fsConstants.X_OK;
        accessSync(candidate, accessMode);
        return candidate;
      } catch {
        // continue
      }
    }
  }

  return null;
}

function pickUnixShell(
  preferBash: boolean,
  envPath: string,
  platform: NodeJS.Platform,
  pathExt: string | undefined
): { shell: string; args: string[]; shellName: string } {
  if (preferBash) {
    const bashPath = findExecutable('bash', envPath, platform, pathExt);
    if (bashPath) {
      return { shell: bashPath, args: ['--noprofile', '--norc', '-i'], shellName: 'bash' };
    }
  }

  const defaultSh = findExecutable('sh', envPath, platform, pathExt) ?? '/system/bin/sh';
  return { shell: defaultSh, args: ['-i'], shellName: 'sh' };
}

export function selectShellForEnvironment(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env
): { shell: string; args: string[]; shellName: string } {
  if (platform === 'win32') {
    const comspec = env.ComSpec || env.COMSPEC || 'cmd.exe';
    return { shell: comspec, args: [], shellName: 'cmd' };
  }

  const isAndroid = platform === 'android'
    || Boolean(env.ANDROID_ROOT)
    || Boolean(env.ANDROID_DATA);

  return pickUnixShell(isAndroid, env.PATH ?? '', platform, env.PATHEXT);
}

export class DirectShellSession {
  private sessionIdValue: string;
  private child?: ChildProcessWithoutNullStreams;
  private closed = false;
  private alive = false;
  private dataQueue: Buffer[] = [];
  private pendingReads: PendingRead[] = [];
  private shellName: string | null = null;

  constructor(sessionId: string) {
    this.sessionIdValue = sessionId;
  }

  get sessionId(): string {
    return this.sessionIdValue;
  }

  get isAlive(): boolean {
    return this.alive && !this.closed;
  }

  get selectedShell(): string | null {
    return this.shellName;
  }

  async start(cwd: string): Promise<void> {
    if (this.child) {
      throw new Error('Session already started');
    }

    this.closed = false;
    this.alive = true;

    const selected = selectShellForEnvironment();
    this.shellName = selected.shellName;

    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      PS1: '\\w $ '
    };

    this.child = spawn(selected.shell, selected.args, {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.child.stdout.on('data', (data: Buffer | string) => {
      const payload = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      this.enqueue(payload);
    });

    // Interactive shells commonly emit prompts to stderr when not attached to a PTY.
    this.child.stderr.on('data', (data: Buffer | string) => {
      const payload = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      this.enqueue(payload);
    });

    this.child.on('error', () => {
      this.alive = false;
      this.closed = true;
      this.flushPending(null);
      this.child = undefined;
    });

    this.child.on('exit', () => {
      this.alive = false;
      this.closed = true;
      this.flushPending(null);
      this.child = undefined;
    });

    await sleep(STARTUP_DELAY_MS);
  }

  async write(data: Buffer | string): Promise<void> {
    if (this.closed) {
      throw new Error('Session is closed');
    }
    if (!this.child) {
      throw new Error('Session not started');
    }

    const text = typeof data === 'string' ? data : data.toString('utf8');
    this.child.stdin.write(text);
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

  resize(_rows: number, _cols: number): void {
    // No-op: stdio pipes do not expose PTY resize semantics.
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.flushPending(null);

    if (!this.child) {
      return;
    }

    this.child.kill('SIGTERM');
    await sleep(STARTUP_DELAY_MS);

    if (this.alive && this.child) {
      this.child.kill('SIGKILL');
    }

    this.child = undefined;
    this.alive = false;
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
