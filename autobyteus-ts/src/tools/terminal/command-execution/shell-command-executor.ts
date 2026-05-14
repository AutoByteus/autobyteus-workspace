import { spawn } from 'node:child_process';
import { TerminalResult, type BackgroundProcessInfo } from '../types.js';
import { BackgroundProcessManager } from '../background-process-manager.js';
import { NonInteractiveShellResolver } from './non-interactive-shell-resolver.js';
import { ProcessGroupObserver } from './process-group-observer.js';
import {
  HOST_PROCESS_TARGET,
  ShellProcessIdentityParser,
  type ProcessExecutionTarget,
  type ShellProcessIdentity
} from './process-identity.js';

export interface ShellCommandExecutorOptions {
  timeoutSeconds?: number;
  backgroundManager?: BackgroundProcessManager;
  signal?: AbortSignal | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asBuffer(data: Buffer | string): Buffer {
  return Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
}

export class ShellCommandExecutor {
  constructor(
    private readonly resolver: NonInteractiveShellResolver = new NonInteractiveShellResolver(),
    private readonly observer: ProcessGroupObserver = new ProcessGroupObserver()
  ) {}

  async execute(command: string, cwd: string, options: ShellCommandExecutorOptions = {}): Promise<TerminalResult> {
    const timeoutSeconds = options.timeoutSeconds ?? 30;
    const timeoutMs = Math.max(1, timeoutSeconds) * 1000;
    const invocation = this.resolver.resolve(command, cwd);
    const child = spawn(invocation.executable, invocation.args, {
      cwd: invocation.cwd,
      env: invocation.env,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    const backgroundOutputChunks: Buffer[] = [];
    const identityParser = new ShellProcessIdentityParser(invocation.shellIdentityMarker);
    let shellExited = false;
    let timedOut = false;
    let settled = false;

    const onStdout = (data: Buffer | string) => {
      const buffer = asBuffer(data);
      backgroundOutputChunks.push(buffer);
      if (!shellExited) {
        stdoutChunks.push(buffer);
      }
    };
    const onStderr = (data: Buffer | string) => {
      const filtered = identityParser.filter(data);
      if (filtered.length === 0) {
        return;
      }

      const buffer = Buffer.from(filtered, 'utf8');
      backgroundOutputChunks.push(buffer);
      if (!shellExited) {
        stderrChunks.push(buffer);
      }
    };

    child.stdout?.on('data', onStdout);
    child.stderr?.on('data', onStderr);

    return new Promise<TerminalResult>((resolve) => {
      const stopActiveProcess = async (): Promise<void> => {
        const shellIdentity = this.getShellIdentity(invocation.kind, invocation.processTarget, child.pid, identityParser.identity);
        if (shellIdentity) {
          const stopped = await this.observer.stopProcess(
            shellIdentity.pid,
            shellIdentity.processGroupId,
            shellIdentity.target
          );
          if (stopped) {
            return;
          }
        }

        if (child.pid !== undefined) {
          try {
            child.kill('SIGTERM');
          } catch {
            // Best effort cancellation cleanup.
          }
        }
      };

      const abortHandler = () => {
        timedOut = true;
        void stopActiveProcess();
      };

      const finalize = async (exitCode: number | null, errorMessage?: string) => {
        if (settled) {
          return;
        }
        settled = true;
        shellExited = true;
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', abortHandler);

        const pendingStderr = identityParser.flush();
        if (pendingStderr.length > 0) {
          const buffer = Buffer.from(pendingStderr, 'utf8');
          backgroundOutputChunks.push(buffer);
          stderrChunks.push(buffer);
        }

        let backgroundProcesses: BackgroundProcessInfo[] = [];
        const shellIdentity = this.getShellIdentity(invocation.kind, invocation.processTarget, child.pid, identityParser.identity);
        if (!timedOut && options.backgroundManager && shellIdentity?.processGroupId) {
          await sleep(75);
          const survivors = await this.observer.findLiveProcessesInGroup(
            shellIdentity.processGroupId,
            [shellIdentity.pid],
            shellIdentity.target
          );
          backgroundProcesses = options.backgroundManager.adoptObservedProcesses({
            command,
            effectiveCwd: cwd,
            processGroupId: shellIdentity.processGroupId,
            processTarget: shellIdentity.target,
            processes: survivors,
            stdout: child.stdout,
            stderr: child.stderr,
            initialOutput: Buffer.concat(backgroundOutputChunks)
          });
        }

        child.stdout?.off('data', onStdout);
        child.stderr?.off('data', onStderr);

        const stderr = Buffer.concat(stderrChunks).toString('utf8') + (errorMessage ? `${errorMessage}\n` : '');
        resolve(new TerminalResult(
          Buffer.concat(stdoutChunks).toString('utf8'),
          stderr,
          exitCode,
          timedOut,
          cwd,
          backgroundProcesses
        ));
      };

      const timer = setTimeout(() => {
        timedOut = true;
        void stopActiveProcess();
      }, timeoutMs);

      child.once('exit', (code) => {
        void finalize(code);
      });

      child.once('error', (error) => {
        void finalize(null, error.message);
      });

      if (options.signal) {
        if (options.signal.aborted) {
          abortHandler();
        } else {
          options.signal.addEventListener('abort', abortHandler, { once: true });
        }
      }
    });
  }

  private getShellIdentity(
    kind: string,
    processTarget: ProcessExecutionTarget,
    childPid: number | undefined,
    parsedIdentity: ShellProcessIdentity | null
  ): (ShellProcessIdentity & { target: ProcessExecutionTarget }) | null {
    if (kind === 'windows-wsl') {
      return parsedIdentity ? { ...parsedIdentity, target: processTarget } : null;
    }

    if (childPid === undefined) {
      return null;
    }

    return {
      pid: childPid,
      processGroupId: childPid,
      target: HOST_PROCESS_TARGET
    };
  }
}
