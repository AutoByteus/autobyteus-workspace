import type { PassThrough } from 'node:stream';
import type { NonInteractiveShellInvocation } from './non-interactive-shell-resolver.js';
import type { NativeCommandProcessScope } from './native-command-process-scope.js';
import type { AnchoredCommandHandle, CommandCompletion, ForegroundDone } from './anchored-command-launcher.js';

export interface ShellCallOptions {
  /** Limits the foreground part; a timeout stops the whole command group. Null: no limit (background form). */
  timeoutSeconds: number | null;
  signal?: AbortSignal | null;
}

/** One shell call, up to its foreground end. */
export interface ShellCall {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  /** The wrapper's foreground end; null when the call ended without it (unwrapped, `exec`, stopped, failed). */
  foreground: ForegroundDone | null;
  /** The launched command; null when it could not be launched. */
  handle: AnchoredCommandHandle | null;
}

const ended = (stream: PassThrough): Promise<void> =>
  stream.readableEnded ? Promise.resolve() : new Promise(resolve => stream.once('end', () => resolve()));
const sleep = (ms: number) => new Promise<null>(resolve => setTimeout(() => resolve(null), ms));

/**
 * Runs one invocation through the host scope and returns when its foreground part ends: at the wrapper's call
 * boundary (end marker and `FOREGROUND_DONE`, both streams read up to them), or at the shell's exit when the
 * wrapper never reported it. Timeout and Stop apply to the foreground part only. After the boundary the handle
 * belongs to the caller.
 */
export class ShellCommandExecutor {
  async execute(invocation: NonInteractiveShellInvocation, scope: NativeCommandProcessScope,
    options: ShellCallOptions): Promise<ShellCall> {
    const stdout: Buffer[] = [], stderr: Buffer[] = [];
    const onOut = (bytes: Buffer) => stdout.push(bytes);
    const onErr = (bytes: Buffer) => stderr.push(bytes);
    let handle: AnchoredCommandHandle | undefined, timedOut = false;
    let foreground: ForegroundDone | null = null;
    const interrupt = (reason: 'tool-timeout' | 'tool-abort') => {
      if (foreground) return;
      timedOut = true;
      if (handle) void scope.stop(handle, reason);
    };
    const abort = () => interrupt('tool-abort');
    const timeoutMs = options.timeoutSeconds === null ? null : Math.max(1, options.timeoutSeconds) * 1000;
    const timer = timeoutMs === null ? undefined : setTimeout(() => interrupt('tool-timeout'), timeoutMs);
    options.signal?.addEventListener('abort', abort, { once: true });
    let completion: CommandCompletion | null = null;
    try {
      handle = await scope.start(invocation, Date.now() + Math.min(1500, timeoutMs ?? 1500), h => {
        handle = h; h.stdout.on('data', onOut); h.stderr.on('data', onErr);
        void h.foregroundDone.then(done => { foreground = done; });
        if (options.signal?.aborted) abort();
      });
      const started = handle;
      const boundary = Promise.all([started.foregroundDone, ended(started.stdout), ended(started.stderr)]).then(() => null);
      const settled = await Promise.race([boundary, started.completion]);
      if (settled && foreground) {
        // The wrapper reported its end and exited at once: its stdout marker is still on its way.
        await Promise.race([boundary, sleep(1000)]);
      } else if (settled) {
        completion = settled;
        // The shell exited without the wrapper's boundary: read its output to the end, as before the wrapper.
        // Its last bytes may still be in the pipes when the exit is reported; retirement may belong to the scope.
        await Promise.all([sleep(25),
          settled.kind === 'result' && !started.stopReason && scope.isOpen ? scope.retireCompleted(started) : null]);
      }
    } catch (error) {
      // Only the start throws; its own cleanup settled the handle as stopped, which hides why it did not start.
      completion = { kind: 'failed', reason: 'launch-failure', message: `Command did not start: ${error instanceof Error ? error.message : String(error)}` };
    } finally {
      clearTimeout(timer); options.signal?.removeEventListener('abort', abort);
      if (!foreground) handle?.flushOutput();
      handle?.stdout.off('data', onOut); handle?.stderr.off('data', onErr);
    }
    const done = foreground as ForegroundDone | null;
    if (!done && completion && completion.kind !== 'result')
      stderr.push(Buffer.from(`${completion.kind === 'failed' ? completion.message : completion.reason}\n`));
    return {
      stdout: Buffer.concat(stdout).toString('utf8'),
      stderr: Buffer.concat(stderr).toString('utf8'),
      exitCode: done ? done.exitCode : completion?.kind === 'result' ? completion.code : null,
      timedOut,
      foreground: done,
      handle: handle ?? null,
    };
  }
}
