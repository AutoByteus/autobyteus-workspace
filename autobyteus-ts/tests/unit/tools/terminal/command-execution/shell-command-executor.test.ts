import { it, expect } from 'vitest';
import { beforeDeadline } from '../../../../../src/tools/terminal/command-execution/command-deadline.js';
import { ShellCommandExecutor } from '../../../../../src/tools/terminal/command-execution/shell-command-executor.js';
import { NonInteractiveShellResolver } from '../../../../../src/tools/terminal/command-execution/non-interactive-shell-resolver.js';
import { NativeCommandProcessScope } from '../../../../../src/tools/terminal/command-execution/native-command-process-scope.js';
it('reports unsupported WSL launch without fabricating a PID, exit 0 or a foreground end', async () => {
  const resolver = new NonInteractiveShellResolver({ platform: 'win32', ensureWslAvailable: () => '/nonexistent/task-wsl',
    selectWslDistro: () => 'test-only', windowsPathToWsl: () => '/tmp' });
  const scope = new NativeCommandProcessScope();
  const before = Date.now();
  const result = await new ShellCommandExecutor().execute(resolver.resolve('true', '/tmp'), scope, { timeoutSeconds: 30 });
  expect(result.exitCode).toBeNull(); expect(result.timedOut).toBe(false); expect(result.stderr).toMatch(/ENOENT|launch/);
  // autobyteus-524 AC-003: a launch that fails outright reports at once, with its own reason, not after the start limit.
  expect(Date.now() - before).toBeLessThan(5_000);
  expect(result.stderr).toMatch(/^Command did not start within 30 s: /);
  expect(result.foreground).toBeNull();
  await scope.close();
});

/** A scope whose start handshake never completes: it fails at the deadline the executor gives it. */
const hangingScope = (deadlines: number[]) => ({
  isOpen: true,
  start: (_invocation: unknown, deadline: number) => {
    deadlines.push(deadline - Date.now());
    return beforeDeadline(new Promise<never>(() => undefined), deadline);
  },
}) as unknown as NativeCommandProcessScope;
const invocation = new NonInteractiveShellResolver().resolve('true', '/tmp');

// autobyteus-524 AC-002: the start gets the start limit (30 s), or the call's own timeout when that is shorter.
it('fails a start that never completes after the applied limit, and says how long it was given', async () => {
  const deadlines: number[] = [];
  const before = Date.now();
  const result = await new ShellCommandExecutor().execute(invocation, hangingScope(deadlines), { timeoutSeconds: 1 });
  expect(Date.now() - before).toBeGreaterThanOrEqual(900);
  expect(deadlines[0]).toBeGreaterThan(900); expect(deadlines[0]).toBeLessThanOrEqual(1_000);
  expect(result.exitCode).toBeNull(); expect(result.stdout).toBe('');
  expect(result.stderr).toBe('Command did not start within 1 s: Command control deadline exceeded\n');
});
it.each([[null, 30_000], [60, 30_000], [10, 10_000]] as const)('gives a call with timeout %s a start limit of %s ms', async (timeoutSeconds, limit) => {
  const deadlines: number[] = [];
  const scope = { isOpen: true, start: (_invocation: unknown, deadline: number) => {
    deadlines.push(deadline - Date.now()); return Promise.reject(new Error('Command control deadline exceeded'));
  } } as unknown as NativeCommandProcessScope;
  const result = await new ShellCommandExecutor().execute(invocation, scope, { timeoutSeconds });
  expect(deadlines[0]).toBeGreaterThan(limit - 100); expect(deadlines[0]).toBeLessThanOrEqual(limit);
  expect(result.stderr).toBe(`Command did not start within ${limit / 1000} s: Command control deadline exceeded\n`);
});

// autobyteus-524: a start can now take seconds on a busy machine; a Stop during it ends the call as that Stop.
it('ends a call stopped during a slow start as that Stop, not as a start failure', async () => {
  const { PassThrough } = await import('node:stream');
  let cancel!: (error: Error) => void;
  const handle = { stdout: new PassThrough(), stderr: new PassThrough(), foregroundDone: new Promise(() => undefined),
    flushOutput: () => undefined };
  const scope = {
    isOpen: true,
    start: (_invocation: unknown, _deadline: number, attach: (h: unknown) => void) => {
      attach(handle);
      return new Promise((_, reject) => { cancel = reject; });
    },
    stop: (_h: unknown, reason: string) => { cancel(new Error(`Command launch cancelled (${reason})`)); return Promise.resolve({ outcome: 'already-exited' }); },
  } as unknown as NativeCommandProcessScope;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 50);
  const result = await new ShellCommandExecutor().execute(invocation, scope, { timeoutSeconds: 30, signal: controller.signal });
  expect([result.timedOut, result.exitCode, result.stdout]).toEqual([true, null, '']);
  expect(result.stderr).toBe('tool-abort\n');
});
