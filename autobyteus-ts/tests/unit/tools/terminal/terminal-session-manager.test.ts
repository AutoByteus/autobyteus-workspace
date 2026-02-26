import { describe, it, expect } from 'vitest';
import { TerminalSessionManager } from '../../../../src/tools/terminal/terminal-session-manager.js';
import { TerminalResult } from '../../../../src/tools/terminal/types.js';

class MockPtySession {
  sessionId: string;
  private alive = false;
  private outputQueue: Buffer[] = [];
  private written: Buffer[] = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  get isAlive(): boolean {
    return this.alive;
  }

  async start(cwd: string): Promise<void> {
    this.alive = true;
    void cwd;
    this.outputQueue.push(Buffer.from('$ '));
  }

  async write(data: Buffer): Promise<void> {
    this.written.push(data);
    const cmd = data.toString('utf8').trim();
    if (cmd === 'echo hello') {
      this.outputQueue.push(Buffer.from('echo hello\nhello\n$ '));
    } else if (cmd === 'echo $?') {
      this.outputQueue.push(Buffer.from('echo $?\n0\n$ '));
    } else if (cmd.startsWith('sleep')) {
      this.outputQueue.push(Buffer.from(`${cmd}\n`));
    } else {
      this.outputQueue.push(Buffer.from(`${cmd}\noutput\n$ `));
    }
  }

  async read(): Promise<Buffer | null> {
    if (this.outputQueue.length > 0) {
      return this.outputQueue.shift() ?? null;
    }
    return null;
  }

  resize(): void {
    // no-op
  }

  async close(): Promise<void> {
    this.alive = false;
  }
}

describe('TerminalSessionManager', () => {
  it('ensureStarted creates session', async () => {
    const manager = new TerminalSessionManager(MockPtySession);

    expect(manager.isStarted).toBe(false);
    await manager.ensureStarted('/tmp');
    expect(manager.isStarted).toBe(true);

    await manager.close();
  });

  it('ensureStarted is idempotent', async () => {
    const manager = new TerminalSessionManager(MockPtySession);

    await manager.ensureStarted('/tmp');
    const session1 = manager.currentSession;

    await manager.ensureStarted('/tmp');
    const session2 = manager.currentSession;

    expect(session1).toBe(session2);

    await manager.close();
  });

  it('executeCommand before start throws', async () => {
    const manager = new TerminalSessionManager(MockPtySession);

    await expect(manager.executeCommand('echo hello')).rejects.toThrow('not started');
  });

  it('executeCommand returns TerminalResult', async () => {
    const manager = new TerminalSessionManager(MockPtySession);

    await manager.ensureStarted('/tmp');
    const result = await manager.executeCommand('echo hello');

    expect(result).toBeInstanceOf(TerminalResult);
    expect(result.stdout).toContain('hello');
    expect(result.timedOut).toBe(false);

    await manager.close();
  });

  it('close cleans up session', async () => {
    const manager = new TerminalSessionManager(MockPtySession);

    await manager.ensureStarted('/tmp');
    expect(manager.isStarted).toBe(true);

    await manager.close();
    expect(manager.isStarted).toBe(false);
    expect(manager.currentSession).toBeNull();
  });
});
