import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn()
}));

import { spawnSync } from 'node:child_process';
import * as wslUtils from '../../../../src/tools/terminal/wsl-utils.js';

const spawnSyncMock = spawnSync as unknown as ReturnType<typeof vi.fn>;

describe('wsl_utils', () => {
  beforeEach(() => {
    spawnSyncMock.mockReset();
  });

  it('selects default distro when not excluded', () => {
    spawnSyncMock.mockImplementation((_exe: string, args: string[]) => {
      if (args[0] === '-l' && args[1] === '-q') {
        return { status: 0, stdout: Buffer.from('Ubuntu\n') } as any;
      }
      if (args[0] === '-l' && args[1] === '-v') {
        return { status: 0, stdout: Buffer.from('* Ubuntu 2\n') } as any;
      }
      return { status: 1, stdout: Buffer.alloc(0) } as any;
    });

    expect(wslUtils.selectWslDistro('wsl.exe')).toBe('Ubuntu');
  });

  it('skips docker-default distro', () => {
    spawnSyncMock.mockImplementation((_exe: string, args: string[]) => {
      if (args[0] === '-l' && args[1] === '-q') {
        return { status: 0, stdout: Buffer.from('docker-desktop\nUbuntu\n') } as any;
      }
      if (args[0] === '-l' && args[1] === '-v') {
        return { status: 0, stdout: Buffer.from('* docker-desktop 2\n') } as any;
      }
      return { status: 1, stdout: Buffer.alloc(0) } as any;
    });

    expect(wslUtils.selectWslDistro('wsl.exe')).toBe('Ubuntu');
  });

  it('throws when no distros are installed', () => {
    spawnSyncMock.mockReturnValue({ status: 1, stdout: Buffer.alloc(0) } as any);

    expect(() => wslUtils.selectWslDistro('wsl.exe')).toThrow('No WSL distro is installed');
  });

  it('ensureWslDistroAvailable throws when none found', () => {
    spawnSyncMock.mockReturnValue({ status: 1, stdout: Buffer.alloc(0) } as any);

    expect(() => wslUtils.ensureWslDistroAvailable('wsl.exe')).toThrow('No WSL distro is installed');
  });

  it('windowsPathToWsl preserves posix paths', () => {
    expect(wslUtils.windowsPathToWsl('/home/user/project', 'wsl.exe')).toBe('/home/user/project');
  });

  it('windowsPathToWsl rejects UNC paths', () => {
    expect(() => wslUtils.windowsPathToWsl('\\\\server\\share')).toThrow('UNC paths are not supported');
  });

  it('windowsPathToWsl falls back to manual conversion', () => {
    spawnSyncMock.mockImplementation((_exe: string, args: string[]) => {
      if (args[0] === 'wslpath') {
        return { status: 1, stdout: Buffer.alloc(0) } as any;
      }
      return { status: 1, stdout: Buffer.alloc(0) } as any;
    });

    const result = wslUtils.windowsPathToWsl('C:\\Users\\Test', 'wsl.exe');
    expect(result).toBe('/mnt/c/Users/Test');
  });
});
