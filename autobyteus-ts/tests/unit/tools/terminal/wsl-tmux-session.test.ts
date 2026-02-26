import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('node-pty', () => {
  const state: { onData?: (data: string) => void; onExit?: () => void } = {};
  const mockPty = {
    onData: (cb: (data: string) => void) => {
      state.onData = cb;
    },
    onExit: (cb: () => void) => {
      state.onExit = cb;
    },
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn()
  };

  return {
    spawn: vi.fn(() => mockPty),
    __state: state,
    __mockPty: mockPty
  };
});

import { WslTmuxSession, setIsWindowsForTests } from '../../../../src/tools/terminal/wsl-tmux-session.js';
import * as wslUtils from '../../../../src/tools/terminal/wsl-utils.js';
import * as nodePty from 'node-pty';

const mockState = (nodePty as any).__state as { onData?: (data: string) => void; onExit?: () => void };
const mockPty = (nodePty as any).__mockPty as {
  write: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
};
const spawnMock = (nodePty as any).spawn as ReturnType<typeof vi.fn>;

describe('WslTmuxSession', () => {
  beforeEach(() => {
    setIsWindowsForTests(() => true);
    mockState.onData = undefined;
    mockState.onExit = undefined;
    spawnMock.mockClear();
    mockPty.write.mockClear();
    mockPty.resize.mockClear();
    mockPty.kill.mockClear();
  });

  afterEach(() => {
    setIsWindowsForTests(() => process.platform === 'win32');
    vi.restoreAllMocks();
  });

  it('throws on non-windows platforms', async () => {
    setIsWindowsForTests(() => false);
    const session = new WslTmuxSession('test');

    await expect(session.start('C:\\tmp')).rejects.toThrow('only supported on Windows');
  });

  it('spawns wsl bash session and sets prompt/cwd', async () => {
    vi.spyOn(wslUtils, 'ensureWslAvailable').mockReturnValue('wsl.exe');
    vi.spyOn(wslUtils, 'ensureWslDistroAvailable').mockReturnValue(undefined);
    vi.spyOn(wslUtils, 'selectWslDistro').mockReturnValue('Ubuntu');
    vi.spyOn(wslUtils, 'windowsPathToWsl').mockReturnValue('/mnt/c/tmp');

    const session = new WslTmuxSession('test');
    await session.start('C:\\tmp');

    expect(spawnMock).toHaveBeenCalledWith(
      'wsl.exe',
      ['-d', 'Ubuntu', '--exec', 'bash', '--noprofile', '--norc', '-i'],
      expect.objectContaining({ name: 'xterm-256color' })
    );

    const writes = mockPty.write.mock.calls.map((call) => call[0]);
    expect(writes.join('')).toContain("export PS1='\\w $ '\n");
    expect(writes.join('')).toContain("cd '/mnt/c/tmp'\n");
  });

  it('reads queued output', async () => {
    vi.spyOn(wslUtils, 'ensureWslAvailable').mockReturnValue('wsl.exe');
    vi.spyOn(wslUtils, 'ensureWslDistroAvailable').mockReturnValue(undefined);
    vi.spyOn(wslUtils, 'selectWslDistro').mockReturnValue('Ubuntu');
    vi.spyOn(wslUtils, 'windowsPathToWsl').mockReturnValue('/mnt/c/tmp');

    const session = new WslTmuxSession('test');
    await session.start('C:\\tmp');

    mockState.onData?.('hello');
    const result = await session.read(0);
    expect(result?.toString('utf8')).toContain('hello');
  });
});
