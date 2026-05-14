import { spawn, type ChildProcess } from 'node:child_process';
import type { Readable } from 'node:stream';
import { OutputBuffer } from './output-buffer.js';
import { stripAnsiCodes } from './ansi-utils.js';
import {
  BackgroundProcessInfo,
  BackgroundProcessOutput,
  type BackgroundProcessStatus
} from './types.js';
import {
  NonInteractiveShellResolver,
  type NonInteractiveShellInvocation
} from './command-execution/non-interactive-shell-resolver.js';
import {
  ProcessGroupObserver,
  type ObservedProcess
} from './command-execution/process-group-observer.js';
import {
  HOST_PROCESS_TARGET,
  ShellProcessIdentityParser,
  type ProcessExecutionTarget
} from './command-execution/process-identity.js';

export interface AdoptObservedProcessesOptions {
  command: string;
  effectiveCwd: string;
  processGroupId?: number;
  processTarget?: ProcessExecutionTarget;
  processes: ObservedProcess[];
  stdout?: Readable | null;
  stderr?: Readable | null;
  initialOutput?: Buffer | string | null;
}

class BackgroundProcessRecord {
  readonly pid: number;
  readonly command: string;
  readonly startedAt: Date;
  readonly effectiveCwd: string;
  readonly processGroupId?: number;
  readonly processTarget: ProcessExecutionTarget;
  readonly outputBuffer: OutputBuffer;
  readonly child?: ChildProcess;
  status: BackgroundProcessStatus = 'running';
  exitCode: number | null = null;

  constructor(options: {
    pid: number;
    command: string;
    effectiveCwd: string;
    outputBuffer: OutputBuffer;
    startedAt?: Date;
    processGroupId?: number;
    processTarget?: ProcessExecutionTarget;
    child?: ChildProcess;
  }) {
    this.pid = options.pid;
    this.command = options.command;
    this.effectiveCwd = options.effectiveCwd;
    this.processGroupId = options.processGroupId;
    this.processTarget = options.processTarget ?? HOST_PROCESS_TARGET;
    this.outputBuffer = options.outputBuffer;
    this.startedAt = options.startedAt ?? new Date();
    this.child = options.child;
  }

  toInfo(): BackgroundProcessInfo {
    return new BackgroundProcessInfo(
      this.pid,
      this.command,
      this.startedAt,
      this.status,
      this.effectiveCwd
    );
  }
}

export class BackgroundProcessManager {
  private readonly maxOutputBytes: number;
  private readonly resolver: NonInteractiveShellResolver;
  private readonly observer: ProcessGroupObserver;
  private readonly processes: Map<number, BackgroundProcessRecord> = new Map();

  constructor(
    maxOutputBytes: number = 1_000_000,
    resolver: NonInteractiveShellResolver = new NonInteractiveShellResolver(),
    observer: ProcessGroupObserver = new ProcessGroupObserver()
  ) {
    this.maxOutputBytes = maxOutputBytes;
    this.resolver = resolver;
    this.observer = observer;
  }

  async startCommand(command: string, cwd: string): Promise<BackgroundProcessInfo> {
    const invocation = this.resolver.resolve(command, cwd);
    const child = this.spawnDetached(invocation);
    const outputBuffer = new OutputBuffer(this.maxOutputBytes);
    const identityParser = new ShellProcessIdentityParser(invocation.shellIdentityMarker);
    let exitedCode: number | null | undefined;
    let errored = false;
    const hostPid = child.pid;

    if (hostPid === undefined) {
      throw new Error('Background process failed to start: child process did not expose a PID.');
    }

    this.attachOutputBuffer(outputBuffer, child.stdout, child.stderr, identityParser);
    child.on('exit', (code) => {
      exitedCode = code;
    });
    child.on('error', () => {
      errored = true;
    });

    let shellIdentity: { pid: number; processGroupId?: number; processTarget: ProcessExecutionTarget };
    try {
      shellIdentity = await this.resolveStartedProcessIdentity(invocation, hostPid, identityParser);
    } catch (error) {
      child.kill('SIGTERM');
      throw error;
    }

    const record = new BackgroundProcessRecord({
      pid: shellIdentity.pid,
      command,
      effectiveCwd: cwd,
      processGroupId: shellIdentity.processGroupId,
      processTarget: shellIdentity.processTarget,
      outputBuffer,
      child
    });

    child.on('exit', (code) => {
      record.exitCode = code;
      if (record.status === 'running') {
        record.status = 'exited';
      }
    });
    child.on('error', () => {
      if (record.status === 'running') {
        record.status = 'exited';
      }
    });
    if (exitedCode !== undefined || errored) {
      record.exitCode = exitedCode ?? null;
      record.status = 'exited';
    }

    this.processes.set(shellIdentity.pid, record);
    return record.toInfo();
  }

  adoptObservedProcesses(options: AdoptObservedProcessesOptions): BackgroundProcessInfo[] {
    const outputBuffer = new OutputBuffer(this.maxOutputBytes);
    if (options.initialOutput) {
      outputBuffer.append(options.initialOutput);
    }

    const records: BackgroundProcessRecord[] = [];
    for (const process of options.processes) {
      if (this.processes.has(process.pid)) {
        const existing = this.processes.get(process.pid);
        if (existing) {
          records.push(existing);
        }
        continue;
      }

      const record = new BackgroundProcessRecord({
        pid: process.pid,
        command: options.command,
        effectiveCwd: options.effectiveCwd,
        processGroupId: options.processGroupId ?? process.processGroupId,
        processTarget: options.processTarget,
        outputBuffer
      });
      this.processes.set(process.pid, record);
      records.push(record);
    }

    if (records.length > 0) {
      this.attachOutput(records[0], options.stdout ?? null, options.stderr ?? null);
    }

    return records.map((record) => record.toInfo());
  }

  async listProcesses(): Promise<BackgroundProcessInfo[]> {
    await this.refreshStatuses();
    return Array.from(this.processes.values()).map((process) => process.toInfo());
  }

  async getOutput(pid: number, lines: number = 100): Promise<BackgroundProcessOutput> {
    const record = this.processes.get(pid);
    if (!record) {
      throw new Error(`Process ${pid} not found`);
    }

    await this.refreshStatus(record);
    const rawOutput = record.outputBuffer.getLines(lines);
    return new BackgroundProcessOutput(stripAnsiCodes(rawOutput), record.status === 'running', pid, record.status);
  }

  async stopProcess(pid: number): Promise<boolean> {
    const record = this.processes.get(pid);
    if (!record) {
      return false;
    }

    const stopped = await this.observer.stopProcess(record.pid, record.processGroupId, record.processTarget);
    if (record.child && (!stopped || record.processTarget.kind === 'wsl')) {
      record.child.kill('SIGTERM');
    }

    record.status = 'stopped';
    this.processes.delete(pid);
    return true;
  }

  async stopAll(): Promise<number> {
    const pids = Array.from(this.processes.keys());
    for (const pid of pids) {
      await this.stopProcess(pid);
    }
    return pids.length;
  }

  get processCount(): number {
    return this.processes.size;
  }

  private spawnDetached(invocation: NonInteractiveShellInvocation): ChildProcess {
    return spawn(invocation.executable, invocation.args, {
      cwd: invocation.cwd,
      env: invocation.env,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }

  private async resolveStartedProcessIdentity(
    invocation: NonInteractiveShellInvocation,
    hostPid: number,
    identityParser: ShellProcessIdentityParser
  ): Promise<{ pid: number; processGroupId?: number; processTarget: ProcessExecutionTarget }> {
    if (invocation.kind !== 'windows-wsl') {
      return { pid: hostPid, processGroupId: hostPid, processTarget: HOST_PROCESS_TARGET };
    }

    const identity = await identityParser.waitForIdentity(1500);
    if (!identity) {
      throw new Error('Background process failed to start: WSL shell did not report its Linux PID.');
    }

    return {
      pid: identity.pid,
      processGroupId: identity.processGroupId,
      processTarget: invocation.processTarget
    };
  }

  private attachOutput(
    record: BackgroundProcessRecord,
    stdout?: Readable | null,
    stderr?: Readable | null
  ): void {
    this.attachOutputBuffer(record.outputBuffer, stdout, stderr);
  }

  private attachOutputBuffer(
    outputBuffer: OutputBuffer,
    stdout?: Readable | null,
    stderr?: Readable | null,
    identityParser?: ShellProcessIdentityParser
  ): void {
    stdout?.on('data', (data: Buffer | string) => {
      outputBuffer.append(data);
    });
    stderr?.on('data', (data: Buffer | string) => {
      const filtered = identityParser ? identityParser.filter(data) : data;
      if (filtered.length > 0) {
        outputBuffer.append(filtered);
      }
    });
  }

  private async refreshStatuses(): Promise<void> {
    await Promise.all(Array.from(this.processes.values()).map((record) => this.refreshStatus(record)));
  }

  private async refreshStatus(record: BackgroundProcessRecord): Promise<void> {
    if (record.status !== 'running') {
      return;
    }

    const running = await this.observer.isProcessRunning(record.pid, record.processTarget);
    if (!running) {
      record.status = 'exited';
    }
  }
}
