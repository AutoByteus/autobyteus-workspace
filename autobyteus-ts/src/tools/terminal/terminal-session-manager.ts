import { randomBytes } from 'node:crypto';
import { OutputBuffer } from './output-buffer.js';
import { PromptDetector } from './prompt-detector.js';
import { getDefaultSessionFactory } from './session-factory.js';
import { TerminalResult } from './types.js';
import { stripAnsiCodes } from './ansi-utils.js';

const DEFAULT_TIMEOUT_SECONDS = 30;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TerminalSessionManager {
  private sessionFactory: new (sessionId: string) => any;
  private promptDetector: PromptDetector;
  private session: any | null = null;
  private outputBuffer: OutputBuffer = new OutputBuffer();
  private cwd: string | null = null;
  private started = false;

  constructor(
    sessionFactory?: new (sessionId: string) => any,
    promptDetector?: PromptDetector
  ) {
    this.sessionFactory = sessionFactory ?? getDefaultSessionFactory();
    this.promptDetector = promptDetector ?? new PromptDetector();
  }

  get currentSession(): any | null {
    return this.session;
  }

  get isStarted(): boolean {
    return this.started && this.session !== null;
  }

  async ensureStarted(cwd: string): Promise<void> {
    if (this.session && this.session.isAlive) {
      return;
    }

    if (this.session) {
      await this.session.close();
    }

    const sessionId = `term-${randomBytes(4).toString('hex')}`;
    this.session = new this.sessionFactory(sessionId);
    await this.session.start(cwd);
    this.cwd = cwd;
    this.started = true;

    await this.drainOutput(0.5);
    this.outputBuffer.clear();
  }

  async executeCommand(command: string, timeoutSeconds: number = DEFAULT_TIMEOUT_SECONDS): Promise<TerminalResult> {
    if (!this.session) {
      throw new Error('Session not started. Call ensureStarted first.');
    }

    this.outputBuffer.clear();

    let normalized = command;
    if (!normalized.endsWith('\n')) {
      normalized += '\n';
    }

    await this.session.write(Buffer.from(normalized, 'utf8'));

    let timedOut = false;
    const start = Date.now();

    while (true) {
      const elapsed = (Date.now() - start) / 1000;
      if (elapsed >= timeoutSeconds) {
        timedOut = true;
        break;
      }

      try {
        const data = await this.session.read(0.1);
        if (data) {
          this.outputBuffer.append(data);
          const current = this.outputBuffer.getAll();
          if (this.promptDetector.check(current)) {
            break;
          }
        }
      } catch (error) {
        break;
      }
    }

    const output = this.outputBuffer.getAll();
    const cleanOutput = stripAnsiCodes(output);

    let exitCode: number | null = null;
    if (!timedOut) {
      exitCode = await this.getExitCode();
    }

    return new TerminalResult(cleanOutput, '', exitCode, timedOut);
  }

  async close(): Promise<void> {
    if (this.session) {
      await this.session.close();
      this.session = null;
    }
    this.started = false;
    this.outputBuffer.clear();
  }

  private async getExitCode(): Promise<number | null> {
    try {
      this.outputBuffer.clear();
      await this.session.write(Buffer.from('echo $?\n', 'utf8'));
      await sleep(200);
      await this.drainOutput(0.3);

      const output = stripAnsiCodes(this.outputBuffer.getAll());
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^\d+$/.test(trimmed)) {
          return parseInt(trimmed, 10);
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private async drainOutput(timeout: number = 0.5): Promise<void> {
    if (!this.session) {
      return;
    }

    const start = Date.now();
    while ((Date.now() - start) / 1000 < timeout) {
      try {
        const data = await this.session.read(0.05);
        if (data) {
          this.outputBuffer.append(data);
        } else {
          await sleep(50);
        }
      } catch {
        break;
      }
    }
  }
}
