import { describe, it, expect } from 'vitest';
import { NonInteractiveShellResolver } from '../../../../../src/tools/terminal/command-execution/non-interactive-shell-resolver.js';

const runPosix = process.platform === 'win32' ? describe.skip : describe;

runPosix('NonInteractiveShellResolver', () => {
  it('builds a non-interactive shell invocation for POSIX run_bash commands', () => {
    const resolver = new NonInteractiveShellResolver();
    const invocation = resolver.resolve('echo ok', '/tmp');

    expect(invocation.kind).toBe('posix');
    expect(invocation.cwd).toBe('/tmp');
    expect(invocation.args).toContain('echo ok');
    expect(invocation.args).not.toContain('-i');
  });
});

describe('NonInteractiveShellResolver WSL construction', () => {
  it('builds WSL invocations with Linux PID marker and process target metadata', () => {
    const resolver = new NonInteractiveShellResolver({
      platform: 'win32',
      ensureWslAvailable: () => 'wsl.exe',
      selectWslDistro: () => 'Ubuntu',
      windowsPathToWsl: () => '/mnt/c/project'
    });

    const invocation = resolver.resolve('npm run dev > server.log 2>&1 &', 'C:\\project');

    expect(invocation.kind).toBe('windows-wsl');
    expect(invocation.executable).toBe('wsl.exe');
    expect(invocation.args.slice(0, 5)).toEqual(['-d', 'Ubuntu', '--cd', '/mnt/c/project', '--exec']);
    expect(invocation.processTarget).toEqual({ kind: 'wsl', wslExecutable: 'wsl.exe', distro: 'Ubuntu' });
    expect(invocation.shellIdentityMarker).toMatch(/^__AUTOBYTEUS_SHELL_ID_/);
    expect(invocation.args.at(-1)).toContain(invocation.shellIdentityMarker);
    expect(invocation.args.at(-1)).toContain('npm run dev > server.log 2>&1 &');
  });
});
