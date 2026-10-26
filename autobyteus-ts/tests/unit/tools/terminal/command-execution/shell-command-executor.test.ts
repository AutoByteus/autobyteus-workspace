import { it, expect } from 'vitest';
import { ShellCommandExecutor } from '../../../../../src/tools/terminal/command-execution/shell-command-executor.js';
import { NonInteractiveShellResolver } from '../../../../../src/tools/terminal/command-execution/non-interactive-shell-resolver.js';
it('reports unsupported WSL launch without fabricating a PID, exit0 or successful adoption', async () => {
  const resolver = new NonInteractiveShellResolver({ platform: 'win32', ensureWslAvailable: () => '/nonexistent/task-wsl',
    selectWslDistro: () => 'test-only', windowsPathToWsl: () => '/tmp' });
  const result = await new ShellCommandExecutor(resolver).execute('true', '/tmp');
  expect(result.exitCode).toBeNull(); expect(result.timedOut).toBe(false); expect(result.stderr).toMatch(/ENOENT|launch/);
  expect(result.backgroundProcesses).toEqual([]);
});
