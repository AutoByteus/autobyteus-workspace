import { TerminalResult, type BackgroundProcessInfo } from '../types.js';
import { BackgroundProcessManager } from '../background-process-manager.js';
import { NonInteractiveShellResolver } from './non-interactive-shell-resolver.js';
import { ProcessGroupObserver } from './process-group-observer.js';
import { NativeCommandProcessScope } from './native-command-process-scope.js';
import { type AnchoredCommandHandle, type CommandCompletion } from './anchored-command-launcher.js';
export interface ShellCommandExecutorOptions {
  timeoutSeconds?: number; backgroundManager?: BackgroundProcessManager; signal?: AbortSignal | null;
}
export class ShellCommandExecutor {
  constructor(private readonly resolver = new NonInteractiveShellResolver(),
    private readonly observer = new ProcessGroupObserver()) {}
  async execute(command: string, cwd: string, options: ShellCommandExecutorOptions = {}): Promise<TerminalResult> {
    const invocation = this.resolver.resolve(command, cwd);
    const scope = options.backgroundManager?.scope ?? new NativeCommandProcessScope(this.observer);
    const stdout: Buffer[] = [], stderr: Buffer[] = [];
    const onOut = (bytes: Buffer) => stdout.push(bytes);
    const onErr = (bytes: Buffer) => stderr.push(bytes);
    let handle: AnchoredCommandHandle | undefined, timedOut = false;
    const interrupt = (reason: 'tool-timeout' | 'tool-abort') => {
      timedOut = true;
      if (handle) void scope.stop(handle, reason);
    };
    const abort = () => interrupt('tool-abort');
    const timeoutMs = Math.max(1, options.timeoutSeconds ?? 30) * 1000;
    const timer = setTimeout(() => interrupt('tool-timeout'), timeoutMs);
    options.signal?.addEventListener('abort', abort, { once: true });
    let result: CommandCompletion;
    let backgrounds: BackgroundProcessInfo[] = [];
    try {
      handle = await scope.start(invocation, Date.now() + Math.min(1500, timeoutMs), h => {
        handle = h; h.stdout.on('data', onOut); h.stderr.on('data', onErr);
        options.backgroundManager?.capture(h);
        if (options.signal?.aborted) abort();
      });
      result = await handle.completion;
      clearTimeout(timer); options.signal?.removeEventListener('abort', abort);
      if (result.kind === 'result' && !handle.stopReason && scope.isOpen) {
        try {
          const survivors = await scope.members(handle);
          if (options.backgroundManager) backgrounds = options.backgroundManager.adoptObservedProcesses({
            command, effectiveCwd: cwd, handle, processes: survivors });
          await scope.retireCompleted(handle);
        } catch (error) { stderr.push(Buffer.from(`Command ownership observation failed: ${String(error)}\n`)); }
      }
    } catch (error) {
      result = handle?.completed ?? { kind: 'failed', reason: 'launch-failure', message: String(error) };
    } finally {
      clearTimeout(timer); options.signal?.removeEventListener('abort', abort);
      handle?.flushOutput(); handle?.stdout.off('data', onOut); handle?.stderr.off('data', onErr);
      if (handle) options.backgroundManager?.releaseUnusedCapture(handle);
    }
    if (result.kind !== 'result') stderr.push(Buffer.from(`${result.kind === 'failed' ? result.message : result.reason}\n`));
    return new TerminalResult(Buffer.concat(stdout).toString('utf8'), Buffer.concat(stderr).toString('utf8'),
      result.kind === 'result' ? result.code : null, timedOut, cwd, backgrounds);
  }
}
