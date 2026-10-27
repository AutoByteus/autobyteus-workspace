/** Reviewer-only bounded probes of new retention and stop/maintenance candidates.
 * Existing scoped suites do not cover these conditions. No provider/app-data use.
 * Run from root via existing probe.config.mjs, selecting this file explicitly.
 */
import { it, expect, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NativeCommandProcessScope } from '../../../../autobyteus-ts/src/tools/terminal/command-execution/native-command-process-scope.js';
import { ProcessGroupObserver } from '../../../../autobyteus-ts/src/tools/terminal/command-execution/process-group-observer.js';
import { NonInteractiveShellResolver } from '../../../../autobyteus-ts/src/tools/terminal/command-execution/non-interactive-shell-resolver.js';
import { ShellCommandExecutor } from '../../../../autobyteus-ts/src/tools/terminal/command-execution/shell-command-executor.js';
import { BackgroundProcessManager } from '../../../../autobyteus-ts/src/tools/terminal/background-process-manager.js';

it('CR-01 explicit stop overlapping the automatic completed-group inspection drains the survivor', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'ab-cr-stop-'));
  const observer = new ProcessGroupObserver();
  const scope = new NativeCommandProcessScope(observer);
  let resume!: () => void;
  let releaseInspection: (() => void) | undefined;
  try {
    const handle = await scope.start(new NonInteractiveShellResolver({ env: { PATH: process.env.PATH, HOME: cwd } }).resolve('sleep 60 &', cwd));
    await handle.completion;
    const original = observer.snapshot.bind(observer);
    const inspectionGate = new Promise<void>(resolve => { resume = resolve; });
    releaseInspection = resume;
    const spy = vi.spyOn(observer, 'snapshot').mockImplementationOnce(async (target, deadline) => {
      await inspectionGate;
      return original(target, deadline);
    });
    // The same public retirement method is invoked by the 1s scope maintenance timer.
    const retirement = scope.retireCompleted(handle);
    const stopped = scope.stop(handle, 'explicit-stop');
    resume();
    await retirement;
    const outcome = await stopped;
    spy.mockRestore();
    const survivors = await scope.members(handle);
    console.log(JSON.stringify({ candidate: 'CR-C01', outcome, survivors: survivors.map(p => p.pid), retainedLeases: scope.size }));
    expect(outcome.outcome).toBe('stopped');
    expect(survivors).toEqual([]);
  } finally {
    releaseInspection?.();
    const cleanup = await scope.close();
    console.log(JSON.stringify({ candidate: 'CR-C01', cleanup, retainedLeases: scope.size }));
    expect(cleanup.outcomes.every(x => x.outcome !== 'unconfirmed')).toBe(true);
    await rm(cwd, { recursive: true, force: true });
  }
});

it('CR-02 ordinary foreground-only commands release output captures with no background record', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'ab-cr-output-'));
  const scope = new NativeCommandProcessScope();
  const resolver = new NonInteractiveShellResolver({ env: { PATH: process.env.PATH, HOME: cwd } });
  const manager = new BackgroundProcessManager(undefined, resolver, undefined, scope);
  const executor = new ShellCommandExecutor(resolver);
  try {
    for (let i = 0; i < 3; i++) {
      const result = await executor.execute('printf foreground-output', cwd, { backgroundManager: manager });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('foreground-output');
    }
    const captures: Map<unknown, { size: number }> = (manager as any).outputs;
    const receipt = { candidate: 'CR-C02', liveLeases: scope.size, backgroundRecords: manager.processCount,
      retainedCaptures: captures.size, retainedOutputBytes: [...captures.values()].reduce((n, b) => n + b.size, 0) };
    console.log(JSON.stringify(receipt));
    expect(captures.size).toBe(0);
  } finally {
    const cleanup = await scope.close();
    console.log(JSON.stringify({ candidate: 'CR-C02', cleanup, retainedLeases: scope.size }));
    expect(cleanup.outcomes.every(x => x.outcome !== 'unconfirmed')).toBe(true);
    await rm(cwd, { recursive: true, force: true });
  }
});
