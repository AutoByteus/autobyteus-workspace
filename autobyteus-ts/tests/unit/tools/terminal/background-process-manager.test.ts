import { describe, it, expect } from 'vitest';
import { BackgroundProcessManager } from '../../../../src/tools/terminal/background-process-manager.js';
import { BackgroundProcessOutput, ProcessInfo } from '../../../../src/tools/terminal/types.js';

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
  }

  async write(data: Buffer): Promise<void> {
    this.written.push(data);
    const cmd = data.toString('utf8').trim();
    this.outputQueue.push(Buffer.from(`Started: ${cmd}\n`));
  }

  async read(): Promise<Buffer | null> {
    if (this.outputQueue.length > 0) {
      return this.outputQueue.shift() ?? null;
    }
    return null;
  }

  async close(): Promise<void> {
    this.alive = false;
  }
}

describe('BackgroundProcessManager', () => {
  it('startProcess returns process id', async () => {
    const manager = new BackgroundProcessManager(MockPtySession);
    const processId = await manager.startProcess('echo hello', '/tmp');

    expect(processId).toBeTruthy();
    expect(processId.startsWith('bg_')).toBe(true);

    await manager.stopAll();
  });

  it('assigns unique ids', async () => {
    const manager = new BackgroundProcessManager(MockPtySession);
    const id1 = await manager.startProcess('cmd1', '/tmp');
    const id2 = await manager.startProcess('cmd2', '/tmp');
    const id3 = await manager.startProcess('cmd3', '/tmp');

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);

    await manager.stopAll();
  });

  it('getOutput returns BackgroundProcessOutput', async () => {
    const manager = new BackgroundProcessManager(MockPtySession);
    const processId = await manager.startProcess('echo hello', '/tmp');

    await new Promise((resolve) => setTimeout(resolve, 200));
    const result = manager.getOutput(processId);

    expect(result).toBeInstanceOf(BackgroundProcessOutput);
    expect(result.processId).toBe(processId);
    expect(result.isRunning).toBe(true);

    await manager.stopAll();
  });

  it('getOutput throws for unknown process', async () => {
    const manager = new BackgroundProcessManager(MockPtySession);

    expect(() => manager.getOutput('nonexistent')).toThrow('Process nonexistent not found');
  });

  it('stopProcess removes process', async () => {
    const manager = new BackgroundProcessManager(MockPtySession);
    const processId = await manager.startProcess('cmd', '/tmp');

    expect(manager.processCount).toBe(1);
    const success = await manager.stopProcess(processId);
    expect(success).toBe(true);
    expect(manager.processCount).toBe(0);
  });

  it('stopProcess returns false for unknown process', async () => {
    const manager = new BackgroundProcessManager(MockPtySession);

    const success = await manager.stopProcess('nonexistent');
    expect(success).toBe(false);
  });

  it('stopAll stops all processes', async () => {
    const manager = new BackgroundProcessManager(MockPtySession);
    await manager.startProcess('cmd1', '/tmp');
    await manager.startProcess('cmd2', '/tmp');
    await manager.startProcess('cmd3', '/tmp');

    expect(manager.processCount).toBe(3);
    const count = await manager.stopAll();
    expect(count).toBe(3);
    expect(manager.processCount).toBe(0);
  });

  it('listProcesses returns process info', async () => {
    const manager = new BackgroundProcessManager(MockPtySession);
    const id1 = await manager.startProcess('cmd1', '/tmp');
    const id2 = await manager.startProcess('cmd2', '/tmp');

    const processes = manager.listProcesses();
    expect(Object.keys(processes).length).toBe(2);
    expect(processes[id1]).toBeInstanceOf(ProcessInfo);
    expect(processes[id2]).toBeInstanceOf(ProcessInfo);

    await manager.stopAll();
  });
});
