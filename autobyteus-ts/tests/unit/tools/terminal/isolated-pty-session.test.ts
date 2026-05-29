import { EventEmitter } from 'node:events';
import { describe, it, expect, vi, beforeEach } from 'vitest';

class MockStream extends EventEmitter {
  write = vi.fn();
  end = vi.fn();
  destroy = vi.fn();
}

class MockChildProcess extends EventEmitter {
  stdin = new MockStream();
  stdout = new MockStream();
  stderr = new MockStream();
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  connected = true;
  send = vi.fn();
  kill = vi.fn((signal?: NodeJS.Signals | number) => {
    this.signalCode = typeof signal === 'string' ? signal : 'SIGTERM';
    queueMicrotask(() => this.emit('exit', null, this.signalCode));
    return true;
  });
  disconnect = vi.fn(() => {
    this.connected = false;
  });
}

const mocks = vi.hoisted(() => ({
  spawn: vi.fn(),
  ensureSpawnHelper: vi.fn()
}));
let child: MockChildProcess;

vi.mock('node:child_process', () => ({
  spawn: mocks.spawn
}));

vi.mock('../../../../src/tools/terminal/node-pty-bootstrap.js', () => ({
  ensureNodePtySpawnHelperExecutable: mocks.ensureSpawnHelper
}));

import { IsolatedPtySession } from '../../../../src/tools/terminal/isolated-pty-session.js';

const startSession = async (): Promise<IsolatedPtySession> => {
  const session = new IsolatedPtySession('iso-test');
  const startPromise = session.start('/tmp');
  await expect.poll(() => mocks.spawn.mock.calls.length).toBe(1);
  child.emit('message', { type: 'ready' });
  await startPromise;
  return session;
};

describe('IsolatedPtySession', () => {
  beforeEach(() => {
    child = new MockChildProcess();
    mocks.spawn.mockReset();
    mocks.ensureSpawnHelper.mockReset();
    mocks.ensureSpawnHelper.mockResolvedValue(false);
    mocks.spawn.mockReturnValue(child);
  });

  it('starts an isolated bridge child process', async () => {
    const session = await startSession();

    expect(session.sessionId).toBe('iso-test');
    expect(session.isAlive).toBe(true);
    expect(mocks.ensureSpawnHelper.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.spawn.mock.invocationCallOrder[0]
    );
    expect(mocks.spawn).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining(['--input-type=module', '--eval']),
      expect.objectContaining({ cwd: '/tmp' })
    );

    await session.close();
  });

  it('does not spawn a bridge if close wins while bootstrap repair is pending', async () => {
    let finishBootstrap!: () => void;
    mocks.ensureSpawnHelper.mockReturnValueOnce(new Promise<void>((resolve) => {
      finishBootstrap = resolve;
    }));
    const session = new IsolatedPtySession('iso-startup-close');

    const startPromise = session.start('/tmp');
    await session.close();
    finishBootstrap();

    await expect(startPromise).rejects.toThrow('Session closed during startup');
    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(session.isAlive).toBe(false);
  });

  it('forwards writes and resize messages to the bridge', async () => {
    const session = await startSession();

    await session.write('echo test\n');
    session.resize(40, 100);

    expect(child.stdin.write).toHaveBeenCalledWith('echo test\n');
    expect(child.send).toHaveBeenCalledWith({ type: 'resize', rows: 40, cols: 100 });

    await session.close();
  });

  it('returns queued bridge stdout from read', async () => {
    const session = await startSession();

    child.stdout.emit('data', Buffer.from('hello'));
    const output = await session.read(0);

    expect(output?.toString('utf8')).toBe('hello');
    await session.close();
  });

  it('flushes pending reads and stops the child on close', async () => {
    const session = await startSession();
    const readPromise = session.read(5);

    await session.close();

    await expect(readPromise).resolves.toBeNull();
    expect(child.send).toHaveBeenCalledWith({ type: 'close' });
    expect(child.stdin.end).toHaveBeenCalled();
    expect(child.stdin.destroy).toHaveBeenCalled();
    expect(child.stdout.destroy).toHaveBeenCalled();
    expect(child.stderr.destroy).toHaveBeenCalled();
    expect(child.disconnect).toHaveBeenCalled();
    expect(session.isAlive).toBe(false);
  });

  it('is idempotent on repeated close', async () => {
    const session = await startSession();

    await session.close();
    await session.close();

    expect(child.send).toHaveBeenCalledTimes(1);
  });

  it('destroys bridge streams when the child exits by itself', async () => {
    const session = await startSession();

    child.emit('exit', 0, null);

    expect(child.stdin.destroy).toHaveBeenCalled();
    expect(child.stdout.destroy).toHaveBeenCalled();
    expect(child.stderr.destroy).toHaveBeenCalled();
    expect(session.isAlive).toBe(false);
  });
});
