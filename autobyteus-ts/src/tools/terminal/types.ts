export class TerminalResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  effectiveCwd: string;
  backgroundProcesses: BackgroundProcessInfo[];

  constructor(
    stdout: string,
    stderr: string,
    exitCode: number | null,
    timedOut: boolean,
    effectiveCwd: string,
    backgroundProcesses: BackgroundProcessInfo[] = []
  ) {
    this.stdout = stdout;
    this.stderr = stderr;
    this.exitCode = exitCode;
    this.timedOut = timedOut;
    this.effectiveCwd = effectiveCwd;
    this.backgroundProcesses = backgroundProcesses;
  }

  toJSON(): Record<string, unknown> {
    return {
      stdout: this.stdout,
      stderr: this.stderr,
      exitCode: this.exitCode,
      timedOut: this.timedOut,
      effectiveCwd: this.effectiveCwd,
      backgroundProcesses: this.backgroundProcesses
    };
  }
}

export type BackgroundProcessStatus = 'running' | 'exited' | 'stopped';

export class BackgroundProcessInfo {
  pid: number;
  command: string;
  startedAt: string;
  status: BackgroundProcessStatus;
  effectiveCwd: string;

  constructor(
    pid: number,
    command: string,
    startedAt: string | Date,
    status: BackgroundProcessStatus,
    effectiveCwd: string
  ) {
    this.pid = pid;
    this.command = command;
    this.startedAt = startedAt instanceof Date ? startedAt.toISOString() : startedAt;
    this.status = status;
    this.effectiveCwd = effectiveCwd;
  }

  toJSON(): Record<string, unknown> {
    return {
      pid: this.pid,
      command: this.command,
      startedAt: this.startedAt,
      status: this.status,
      effectiveCwd: this.effectiveCwd
    };
  }
}

export class BackgroundProcessOutput {
  output: string;
  isRunning: boolean;
  pid: number;
  status: BackgroundProcessStatus;

  constructor(output: string, isRunning: boolean, pid: number, status: BackgroundProcessStatus) {
    this.output = output;
    this.isRunning = isRunning;
    this.pid = pid;
    this.status = status;
  }

  toJSON(): Record<string, unknown> {
    return {
      output: this.output,
      isRunning: this.isRunning,
      pid: this.pid,
      status: this.status
    };
  }
}
