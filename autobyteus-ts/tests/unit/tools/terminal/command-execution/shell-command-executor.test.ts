import { it, expect } from 'vitest';
import { ShellCommandExecutor } from '../../../../../src/tools/terminal/command-execution/shell-command-executor.js';
import { NonInteractiveShellResolver } from '../../../../../src/tools/terminal/command-execution/non-interactive-shell-resolver.js';
import { NativeCommandProcessScope } from '../../../../../src/tools/terminal/command-execution/native-command-process-scope.js';
it('reports unsupported WSL launch without fabricating a PID, exit 0 or a foreground end', async () => {
  const resolver = new NonInteractiveShellResolver({ platform: 'win32', ensureWslAvailable: () => '/nonexistent/task-wsl',
    selectWslDistro: () => 'test-only', windowsPathToWsl: () => '/tmp' });
  const scope = new NativeCommandProcessScope();
  const result = await new ShellCommandExecutor().execute(resolver.resolve('true', '/tmp'), scope, { timeoutSeconds: 30 });
  expect(result.exitCode).toBeNull(); expect(result.timedOut).toBe(false); expect(result.stderr).toMatch(/ENOENT|launch/);
  expect(result.foreground).toBeNull();
  await scope.close();
});
