export class TerminalResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;

  constructor(stdout: string, stderr: string, exitCode: number | null, timedOut: boolean) {
    this.stdout = stdout;
    this.stderr = stderr;
    this.exitCode = exitCode;
    this.timedOut = timedOut;
  }

  toJSON(): Record<string, unknown> {
    return {
      stdout: this.stdout,
      stderr: this.stderr,
      exitCode: this.exitCode,
      timedOut: this.timedOut
    };
  }
}

export class BackgroundProcessOutput {
  output: string;
  isRunning: boolean;
  processId: string;

  constructor(output: string, isRunning: boolean, processId: string) {
    this.output = output;
    this.isRunning = isRunning;
    this.processId = processId;
  }

  toJSON(): Record<string, unknown> {
    return {
      output: this.output,
      isRunning: this.isRunning,
      processId: this.processId
    };
  }
}

export class ProcessInfo {
  processId: string;
  command: string;
  startedAt: number;
  isRunning: boolean;

  constructor(processId: string, command: string, startedAt: number, isRunning: boolean) {
    this.processId = processId;
    this.command = command;
    this.startedAt = startedAt;
    this.isRunning = isRunning;
  }

  toJSON(): Record<string, unknown> {
    return {
      processId: this.processId,
      command: this.command,
      startedAt: this.startedAt,
      isRunning: this.isRunning
    };
  }
}
