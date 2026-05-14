import { describe, it, expect } from 'vitest';
import { BackgroundProcessManager } from '../../../../../src/tools/terminal/background-process-manager.js';
import { ShellCommandExecutor } from '../../../../../src/tools/terminal/command-execution/shell-command-executor.js';
import {
  ProcessGroupObserver,
  type ExecFileRunner
} from '../../../../../src/tools/terminal/command-execution/process-group-observer.js';
import type { NonInteractiveShellResolver } from '../../../../../src/tools/terminal/command-execution/non-interactive-shell-resolver.js';

describe('ShellCommandExecutor WSL adoption', () => {
  it('adopts ordinary WSL bash background descendants by Linux PID', async () => {
    const marker = '__AUTOBYTEUS_TEST_EXEC_WSL_ID__';
    const shellPid = 5000;
    const backgroundPid = 5001;
    const resolver = {
      resolve: () => ({
        executable: process.execPath,
        args: [
          '-e',
          [
            `process.stderr.write(${JSON.stringify(`${marker}:${shellPid}:${shellPid}\n`)});`,
            'setTimeout(() => process.exit(0), 20);'
          ].join('')
        ],
        env: { ...process.env },
        kind: 'windows-wsl',
        processTarget: { kind: 'wsl', wslExecutable: 'wsl.exe', distro: 'Ubuntu' },
        shellIdentityMarker: marker
      })
    } as unknown as NonInteractiveShellResolver;

    const runner: ExecFileRunner = async (_file, args) => {
      if (args.includes('ps')) {
        return {
          stdout: [
            ` ${shellPid} 1 ${shellPid} S bash -lc sleep 10 &`,
            ` ${backgroundPid} ${shellPid} ${shellPid} S sleep 10`
          ].join('\n')
        };
      }
      return { stdout: '' };
    };
    const observer = new ProcessGroupObserver(runner);
    const manager = new BackgroundProcessManager(1_000_000, resolver, observer);
    const executor = new ShellCommandExecutor(resolver, observer);

    const result = await executor.execute('sleep 10 &', process.cwd(), { backgroundManager: manager });
    const listed = await manager.listProcesses();

    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toContain(marker);
    expect(result.backgroundProcesses).toHaveLength(1);
    expect(result.backgroundProcesses[0]).toMatchObject({
      pid: backgroundPid,
      command: 'sleep 10 &',
      status: 'running',
      effectiveCwd: process.cwd()
    });
    expect(listed.map((entry) => entry.pid)).toContain(backgroundPid);
  });
});
