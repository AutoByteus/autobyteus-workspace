import { randomBytes } from 'node:crypto';
import { OutputBuffer } from './output-buffer.js';
import { getDefaultSessionFactory } from './session-factory.js';
import { BackgroundProcessOutput, ProcessInfo } from './types.js';
import { stripAnsiCodes } from './ansi-utils.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class BackgroundProcess {
  processId: string;
  command: string;
  session: any;
  outputBuffer: OutputBuffer;
  startedAt: number;
  readerPromise: Promise<void> | null = null;
  cancelled = false;

  constructor(processId: string, command: string, session: any, outputBuffer: OutputBuffer) {
    this.processId = processId;
    this.command = command;
    this.session = session;
    this.outputBuffer = outputBuffer;
    this.startedAt = Date.now() / 1000;
  }

  get isRunning(): boolean {
    return this.session.isAlive;
  }

  toInfo(): ProcessInfo {
    return new ProcessInfo(this.processId, this.command, this.startedAt, this.isRunning);
  }
}

export class BackgroundProcessManager {
  private sessionFactory: new (sessionId: string) => any;
  private maxOutputBytes: number;
  private processes: Map<string, BackgroundProcess> = new Map();
  private counter = 0;

  constructor(sessionFactory?: new (sessionId: string) => any, maxOutputBytes: number = 1_000_000) {
    this.sessionFactory = sessionFactory ?? getDefaultSessionFactory();
    this.maxOutputBytes = maxOutputBytes;
  }

  private generateId(): string {
    this.counter += 1;
    return `bg_${String(this.counter).padStart(3, '0')}`;
  }

  async startProcess(command: string, cwd: string): Promise<string> {
    const processId = this.generateId();
    const sessionId = `bg-${randomBytes(4).toString('hex')}`;

    const session = new this.sessionFactory(sessionId);
    const outputBuffer = new OutputBuffer(this.maxOutputBytes);

    await session.start(cwd);

    const bgProcess = new BackgroundProcess(processId, command, session, outputBuffer);

    let normalized = command;
    if (!normalized.endsWith('\n')) {
      normalized += '\n';
    }
    await session.write(Buffer.from(normalized, 'utf8'));

    bgProcess.readerPromise = this.readLoop(bgProcess);
    this.processes.set(processId, bgProcess);

    return processId;
  }

  private async readLoop(process: BackgroundProcess): Promise<void> {
    try {
      while (process.session.isAlive && !process.cancelled) {
        try {
          const data = await process.session.read(0.1);
          if (data) {
            process.outputBuffer.append(data);
          }
        } catch {
          break;
        }
        await sleep(50);
      }
    } catch {
      // swallow background errors
    }
  }

  getOutput(processId: string, lines: number = 100): BackgroundProcessOutput {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error(`Process ${processId} not found`);
    }

    const rawOutput = process.outputBuffer.getLines(lines);
    const cleanOutput = stripAnsiCodes(rawOutput);
    return new BackgroundProcessOutput(cleanOutput, process.isRunning, processId);
  }

  async stopProcess(processId: string): Promise<boolean> {
    const process = this.processes.get(processId);
    if (!process) {
      return false;
    }

    process.cancelled = true;

    if (process.readerPromise) {
      await process.readerPromise;
    }

    await process.session.close();
    this.processes.delete(processId);
    return true;
  }

  async stopAll(): Promise<number> {
    const ids = Array.from(this.processes.keys());
    for (const processId of ids) {
      await this.stopProcess(processId);
    }
    return ids.length;
  }

  listProcesses(): Record<string, ProcessInfo> {
    const result: Record<string, ProcessInfo> = {};
    for (const [processId, process] of this.processes.entries()) {
      result[processId] = process.toInfo();
    }
    return result;
  }

  get processCount(): number {
    return this.processes.size;
  }
}
