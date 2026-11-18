import { closeSync, mkdirSync, openSync, writeSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { stripAnsiCodes } from './ansi-utils.js';

const TAIL_WINDOW_BYTES = 16 * 1024;
const TAIL_LINES = 20;
const TAIL_CHARS = 2000;

/** The folder of one agent's output logs, in this node's OS temp area (not the synced memory folder). */
export function backgroundOutputFolder(ownerId: string): string {
  return path.join(os.tmpdir(), 'autobyteus-background-tasks', ownerId.replace(/[^A-Za-z0-9._-]/g, '_'));
}

export function removeBackgroundOutputFolder(ownerId: string): Promise<void> {
  return rm(backgroundOutputFolder(ownerId), { recursive: true, force: true });
}

/**
 * The output log of one `run_bash` call that left background tasks: everything its stdout and stderr receive
 * after the call returned (the whole output, for the background form). Every task of the call names this file;
 * the agent reads it with ordinary commands (`tail`), and a task's end carries the log's last lines.
 */
export class BackgroundOutputLog {
  /** Written synchronously, so the file holds every byte a reported end's last lines show. */
  private fd: number | null;
  private tail = Buffer.alloc(0);

  /** `shellPath` is the same file as the command's shell sees it (a WSL path on Windows). */
  constructor(readonly hostPath: string, readonly shellPath: string) {
    mkdirSync(path.dirname(hostPath), { recursive: true, mode: 0o700 });
    this.fd = openSync(hostPath, 'a', 0o600);
  }

  append(bytes: Buffer): void {
    if (!bytes.length || this.fd === null) return;
    try {
      for (let offset = 0; offset < bytes.length;) offset += writeSync(this.fd, bytes, offset);
    } catch (error) {
      console.warn(`Background output log '${this.hostPath}' stopped: ${String(error)}`);
      this.close();
      return;
    }
    this.tail = Buffer.concat([this.tail, bytes]);
    if (this.tail.length > TAIL_WINDOW_BYTES) this.tail = this.tail.subarray(this.tail.length - TAIL_WINDOW_BYTES);
  }

  /** The last 20 lines, at most 2,000 characters (the end is kept). */
  lastLines(): string {
    const lines = stripAnsiCodes(this.tail.toString('utf8')).replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n');
    const text = lines.slice(-TAIL_LINES).join('\n');
    return text.length > TAIL_CHARS ? text.slice(text.length - TAIL_CHARS) : text;
  }

  close(): void {
    if (this.fd === null) return;
    try { closeSync(this.fd); } catch { /* already closed */ }
    this.fd = null;
  }
}
