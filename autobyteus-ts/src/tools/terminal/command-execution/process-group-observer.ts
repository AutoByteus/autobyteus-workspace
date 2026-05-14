import { execFile } from 'node:child_process';
import { HOST_PROCESS_TARGET, type ProcessExecutionTarget } from './process-identity.js';

export type ExecFileResult = { stdout: string; stderr?: string };
export type ExecFileRunner = (
  file: string,
  args: string[],
  options: { encoding: BufferEncoding; maxBuffer?: number; timeout?: number }
) => Promise<ExecFileResult>;

const defaultExecFileRunner: ExecFileRunner = (file, args, options) =>
  new Promise((resolve, reject) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });

export interface ObservedProcess {
  pid: number;
  parentPid: number;
  processGroupId: number;
  status: string;
  command: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePsLine(line: string): ObservedProcess | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const match = /^(\d+)\s+(\d+)\s+(-?\d+)\s+(\S+)\s*(.*)$/.exec(trimmed);
  if (!match) {
    return null;
  }

  return {
    pid: Number.parseInt(match[1], 10),
    parentPid: Number.parseInt(match[2], 10),
    processGroupId: Number.parseInt(match[3], 10),
    status: match[4],
    command: match[5] ?? ''
  };
}

function isLiveStatus(status: string): boolean {
  return status.length > 0 && !status.includes('Z');
}

export class ProcessGroupObserver {
  constructor(private readonly execFileRunner: ExecFileRunner = defaultExecFileRunner) {}

  async findLiveProcessesInGroup(
    processGroupId: number,
    excludePids: number[] = [],
    target: ProcessExecutionTarget = HOST_PROCESS_TARGET
  ): Promise<ObservedProcess[]> {
    if (!Number.isInteger(processGroupId) || processGroupId <= 0) {
      return [];
    }

    const excluded = new Set(excludePids);
    const processes = await this.listProcesses(target);
    return processes.filter((process) =>
      process.processGroupId === processGroupId &&
      !excluded.has(process.pid) &&
      isLiveStatus(process.status)
    );
  }

  async isProcessRunning(pid: number, target: ProcessExecutionTarget = HOST_PROCESS_TARGET): Promise<boolean> {
    if (!Number.isInteger(pid) || pid <= 0) {
      return false;
    }

    const processInfo = await this.getProcess(pid, target);
    if (processInfo) {
      return isLiveStatus(processInfo.status);
    }

    if (target.kind === 'wsl') {
      return false;
    }

    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  async stopProcess(
    pid: number,
    processGroupId?: number,
    target: ProcessExecutionTarget = HOST_PROCESS_TARGET
  ): Promise<boolean> {
    if (target.kind === 'wsl') {
      return this.stopWslProcess(pid, processGroupId, target);
    }

    const targets: number[] = [];
    if (processGroupId && processGroupId > 0 && process.platform !== 'win32') {
      targets.push(-processGroupId);
    }
    targets.push(pid);

    let signalled = false;
    for (const targetPid of targets) {
      try {
        process.kill(targetPid, 'SIGTERM');
        signalled = true;
      } catch {
        // Try the next target.
      }
    }

    if (!signalled) {
      return false;
    }

    await sleep(250);
    if (await this.isProcessRunning(pid, target)) {
      for (const targetPid of targets) {
        try {
          process.kill(targetPid, 'SIGKILL');
        } catch {
          // Best effort cleanup.
        }
      }
    }

    return true;
  }

  private async stopWslProcess(
    pid: number,
    processGroupId: number | undefined,
    target: Extract<ProcessExecutionTarget, { kind: 'wsl' }>
  ): Promise<boolean> {
    const wasRunning = await this.isProcessRunning(pid, target);
    const hasLiveGroupMembers = processGroupId
      ? (await this.findLiveProcessesInGroup(processGroupId, [], target)).length > 0
      : false;
    if (!wasRunning && !hasLiveGroupMembers) {
      return false;
    }

    await this.signalWslProcess(pid, processGroupId, target, 'TERM');
    await sleep(250);
    if (await this.isProcessRunning(pid, target)) {
      await this.signalWslProcess(pid, processGroupId, target, 'KILL');
    }

    return true;
  }

  private async signalWslProcess(
    pid: number,
    processGroupId: number | undefined,
    target: Extract<ProcessExecutionTarget, { kind: 'wsl' }>,
    signal: 'TERM' | 'KILL'
  ): Promise<void> {
    const commands: string[] = [];
    if (processGroupId && processGroupId > 0) {
      commands.push(`kill -${signal} -- -${processGroupId} 2>/dev/null || true`);
    }
    commands.push(`kill -${signal} ${pid} 2>/dev/null || true`);

    try {
      await this.execFileRunner(
        target.wslExecutable,
        ['-d', target.distro, '--exec', 'bash', '-lc', commands.join('; ')],
        { encoding: 'utf8', timeout: 5000 }
      );
    } catch {
      // Best effort cleanup.
    }
  }

  private async getProcess(
    pid: number,
    target: ProcessExecutionTarget = HOST_PROCESS_TARGET
  ): Promise<ObservedProcess | null> {
    const processes = await this.listProcesses(target);
    return processes.find((process) => process.pid === pid) ?? null;
  }

  private async listProcesses(target: ProcessExecutionTarget = HOST_PROCESS_TARGET): Promise<ObservedProcess[]> {
    if (target.kind === 'host' && process.platform === 'win32') {
      return [];
    }

    try {
      const { stdout } = await this.execFileRunner(
        target.kind === 'wsl' ? target.wslExecutable : 'ps',
        target.kind === 'wsl'
          ? ['-d', target.distro, '--exec', 'ps', '-axo', 'pid=,ppid=,pgid=,stat=,command=']
          : ['-axo', 'pid=,ppid=,pgid=,stat=,command='],
        {
          encoding: 'utf8',
          maxBuffer: 2 * 1024 * 1024
        }
      );
      return stdout
        .split(/\r?\n/)
        .map(parsePsLine)
        .filter((entry): entry is ObservedProcess => entry !== null);
    } catch {
      return [];
    }
  }
}
