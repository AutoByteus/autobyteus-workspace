export type ProcessExecutionTarget =
  | { kind: 'host' }
  | { kind: 'wsl'; wslExecutable: string; distro: string };

export interface ShellProcessIdentity {
  pid: number;
  processGroupId: number;
}

export const HOST_PROCESS_TARGET: ProcessExecutionTarget = { kind: 'host' };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class ShellProcessIdentityParser {
  private pending = '';
  private parsedIdentity: ShellProcessIdentity | null = null;
  private waiters: Array<(identity: ShellProcessIdentity | null) => void> = [];
  private readonly pattern: RegExp | null;

  constructor(private readonly marker?: string) {
    this.pattern = marker
      ? new RegExp(`^${escapeRegExp(marker)}:(\\d+):(\\d+)\\r?$`)
      : null;
  }

  get identity(): ShellProcessIdentity | null {
    return this.parsedIdentity;
  }

  filter(data: Buffer | string): string {
    const text = Buffer.isBuffer(data) ? data.toString('utf8') : data;
    if (!this.pattern || this.parsedIdentity) {
      return text;
    }

    this.pending += text;
    let passthrough = '';

    while (true) {
      const newlineIndex = this.pending.indexOf('\n');
      if (newlineIndex === -1) {
        return passthrough;
      }

      const line = this.pending.slice(0, newlineIndex);
      const lineWithNewline = this.pending.slice(0, newlineIndex + 1);
      this.pending = this.pending.slice(newlineIndex + 1);

      const match = this.pattern.exec(line);
      if (match) {
        this.parsedIdentity = {
          pid: Number.parseInt(match[1], 10),
          processGroupId: Number.parseInt(match[2], 10)
        };
        this.resolveWaiters(this.parsedIdentity);
        passthrough += this.pending;
        this.pending = '';
        return passthrough;
      }

      passthrough += lineWithNewline;
    }
  }

  flush(): string {
    if (!this.pattern || this.parsedIdentity || this.pending.length === 0) {
      const pending = this.pending;
      this.pending = '';
      return pending;
    }

    const match = this.pattern.exec(this.pending);
    if (match) {
      this.parsedIdentity = {
        pid: Number.parseInt(match[1], 10),
        processGroupId: Number.parseInt(match[2], 10)
      };
      this.pending = '';
      this.resolveWaiters(this.parsedIdentity);
      return '';
    }

    const pending = this.pending;
    this.pending = '';
    return pending;
  }

  waitForIdentity(timeoutMs: number): Promise<ShellProcessIdentity | null> {
    if (!this.pattern || this.parsedIdentity) {
      return Promise.resolve(this.parsedIdentity);
    }

    return new Promise((resolve) => {
      let timer: NodeJS.Timeout;
      const waiter = (identity: ShellProcessIdentity | null) => {
        clearTimeout(timer);
        resolve(identity);
      };
      timer = setTimeout(() => {
        this.waiters = this.waiters.filter((candidate) => candidate !== waiter);
        resolve(null);
      }, timeoutMs);

      this.waiters.push(waiter);
    });
  }

  private resolveWaiters(identity: ShellProcessIdentity): void {
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) {
      waiter(identity);
    }
  }
}
