import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node-pty', () => {
  const state: {
    onData?: (data: string) => void;
    onExit?: () => void;
    dataDispose: ReturnType<typeof vi.fn>;
    exitDispose: ReturnType<typeof vi.fn>;
  } = {
    dataDispose: vi.fn(),
    exitDispose: vi.fn()
  };
  const mockPty = {
    onData: (cb: (data: string) => void) => {
      state.onData = cb;
      return {
        dispose: state.dataDispose
      };
    },
    onExit: (cb: () => void) => {
      state.onExit = cb;
      return {
        dispose: state.exitDispose
      };
    },
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    destroy: vi.fn()
  };

  return {
    spawn: vi.fn(() => mockPty),
    __state: state,
    __mockPty: mockPty
  };
});

import { PtySession } from '../../../../src/tools/terminal/pty-session.js';
import * as nodePty from 'node-pty';

const mockState = (nodePty as any).__state as {
  onData?: (data: string) => void;
  onExit?: () => void;
  dataDispose: ReturnType<typeof vi.fn>;
  exitDispose: ReturnType<typeof vi.fn>;
};
const mockPty = (nodePty as any).__mockPty as {
  write: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};
const spawnMock = (nodePty as any).spawn as ReturnType<typeof vi.fn>;

describe('PtySession', () => {
  beforeEach(() => {
    mockState.onData = undefined;
    mockState.onExit = undefined;
    mockState.dataDispose.mockClear();
    mockState.exitDispose.mockClear();
    spawnMock.mockClear();
    mockPty.write.mockClear();
    mockPty.resize.mockClear();
    mockPty.kill.mockClear();
    mockPty.destroy.mockClear();
  });

  it('exposes sessionId', async () => {
    const session = new PtySession('test-123');
    expect(session.sessionId).toBe('test-123');
  });

  it('is not alive before start', async () => {
    const session = new PtySession('test');
    expect(session.isAlive).toBe(false);
  });

  it('write before start throws', async () => {
    const session = new PtySession('test');
    await expect(session.write(Buffer.from('test'))).rejects.toThrow('Session not started');
  });

  it('read before start throws', async () => {
    const session = new PtySession('test');
    await expect(session.read()).rejects.toThrow('Session not started');
  });

  it('resize before start throws', async () => {
    const session = new PtySession('test');
    expect(() => session.resize(24, 80)).toThrow('Session not started');
  });

  it('starting twice throws', async () => {
    const session = new PtySession('test');
    await session.start('/tmp');

    await expect(session.start('/tmp')).rejects.toThrow('Session already started');
    await session.close();
  });

  it('close is idempotent', async () => {
    const session = new PtySession('test');
    await session.start('/tmp');

    await session.close();
    await session.close();

    expect(mockPty.destroy).toHaveBeenCalledTimes(1);
  });

  it('read after close returns null', async () => {
    const session = new PtySession('test');
    await session.close();

    const result = await session.read(0);
    expect(result).toBeNull();
  });

  it('write after close throws', async () => {
    const session = new PtySession('test');
    await session.close();

    await expect(session.write(Buffer.from('test'))).rejects.toThrow('Session is closed');
  });

  it('returns queued data on read', async () => {
    const session = new PtySession('test');
    await session.start('/tmp');

    mockState.onData?.('hello');
    const result = await session.read(0);

    expect(result?.toString('utf8')).toContain('hello');
    await session.close();
  });

  it('marks session closed on exit', async () => {
    const session = new PtySession('test');
    await session.start('/tmp');

    mockState.onExit?.();
    expect(session.isAlive).toBe(false);
  });

  it('destroys PTY resources when startup is closed before attach completes', async () => {
    const session = new PtySession('test');
    const startPromise = session.start('/tmp');

    await expect.poll(() => spawnMock.mock.calls.length).toBe(1);
    await session.close();

    await expect(startPromise).rejects.toThrow('Session closed during startup');
    expect(mockPty.kill).toHaveBeenCalled();
    expect(mockPty.destroy).toHaveBeenCalledTimes(1);
    expect(mockState.dataDispose).toHaveBeenCalled();
    expect(mockState.exitDispose).toHaveBeenCalled();
    expect(session.isAlive).toBe(false);
  });
});
