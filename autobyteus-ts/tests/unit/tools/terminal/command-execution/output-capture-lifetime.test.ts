/** CR-002: captures belong to pending commands or readable background records, not history of every foreground call. */
import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BackgroundProcessManager } from '../../../../../src/tools/terminal/background-process-manager.js';
import { NonInteractiveShellResolver } from '../../../../../src/tools/terminal/command-execution/non-interactive-shell-resolver.js';
import { ShellCommandExecutor } from '../../../../../src/tools/terminal/command-execution/shell-command-executor.js';
import type { AnchoredCommandHandle } from '../../../../../src/tools/terminal/command-execution/anchored-command-launcher.js';
const captures = (manager: BackgroundProcessManager) => (manager as unknown as { outputs: Map<AnchoredCommandHandle, unknown> }).outputs;
const suite = process.platform === 'win32' ? describe.skip : describe;
suite('output capture lifecycle', () => {
  async function fixture(run: (manager: BackgroundProcessManager, executor: ShellCommandExecutor, resolver: NonInteractiveShellResolver, cwd: string, handles: AnchoredCommandHandle[]) => Promise<void>) {
    const cwd = await mkdtemp(join(tmpdir(), 'ab-output-lifetime-'));
    const resolver = new NonInteractiveShellResolver();
    const manager = new BackgroundProcessManager(undefined, resolver);
    const handles: AnchoredCommandHandle[] = [], capture = manager.capture.bind(manager);
    vi.spyOn(manager, 'capture').mockImplementation(handle => { handles.push(handle); capture(handle); });
    try { await run(manager, new ShellCommandExecutor(resolver), resolver, cwd, handles); }
    finally {
      await manager.stopAll(); const report = await manager.scope.close();
      expect(report.outcomes.every(r => r.outcome !== 'unconfirmed')).toBe(true);
      await rm(cwd, { recursive: true, force: true });
    }
  }
  it('releases every foreground-only capture and listener without losing returned output', async () => fixture(async (manager, executor, _resolver, cwd, handles) => {
    for (let n = 0; n < 3; n++) {
      const result = await executor.execute('printf foreground-output', cwd, { backgroundManager: manager });
      expect(result.stdout).toBe('foreground-output'); expect(result.exitCode).toBe(0);
      expect(captures(manager).size).toBe(0); expect(manager.processCount).toBe(0);
    }
    expect(manager.scope.size).toBe(0);
    for (const handle of handles) { expect(handle.stdout.listenerCount('data')).toBe(0); expect(handle.stderr.listenerCount('data')).toBe(0); }
  }));
  it.each(['foreground', 'background'] as const)('releases a %s capture after command launch failure', async form => fixture(async (manager, executor, resolver, cwd, handles) => {
    const invocation = resolver.resolve('true', cwd);
    vi.spyOn(resolver, 'resolve').mockReturnValue({ ...invocation, executable: join(cwd, 'missing-executable'), args: [] });
    if (form === 'background') await expect(manager.startCommand('unused', cwd)).rejects.toThrow();
    else expect((await executor.execute('unused', cwd, { backgroundManager: manager })).stderr).toContain('ENOENT');
    expect(captures(manager).size).toBe(0); expect(manager.processCount).toBe(0);
    for (const handle of handles) { expect(handle.stdout.listenerCount('data')).toBe(0); expect(handle.stderr.listenerCount('data')).toBe(0); }
  }));
  it('keeps an adopted live record output until confirmed explicit stop', async () => fixture(async (manager, executor, _resolver, cwd) => {
    await executor.execute('printf before; (sleep 0.1; printf after; sleep 60) &', cwd, { backgroundManager: manager });
    const records = await manager.listProcesses(); expect(records.length).toBeGreaterThan(0);
    expect(captures(manager).size).toBe(1);
    let output = '';
    for (let n = 0; n < 50 && !output.includes('after'); n++) { output = (await manager.getOutput(records[0].pid)).output; await new Promise(r => setTimeout(r, 10)); }
    expect(output).toContain('before'); expect(output).toContain('after');
    await manager.stopProcess(records[0].pid); expect(captures(manager).size).toBe(0);
  }));
  it('preserves completed background history until its record is removed', async () => fixture(async (manager, _executor, _resolver, cwd, handles) => {
    const info = await manager.startCommand('printf background-history', cwd);
    await handles[0].completion;
    for (let n = 0; n < 100 && manager.scope.size; n++) await new Promise(r => setTimeout(r, 10));
    expect(manager.scope.size).toBe(0); manager.releaseUnusedCapture(handles[0]);
    expect(captures(manager).size).toBe(1);
    expect((await manager.getOutput(info.pid)).output).toBe('background-history');
    await manager.stopProcess(info.pid); expect(captures(manager).size).toBe(0);
  }));
});
