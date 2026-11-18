/** CR-001: real owned anchors with a controlled observation/release interleaving. */
import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NativeCommandProcessScope } from '../../../../../src/tools/terminal/command-execution/native-command-process-scope.js';
import { ProcessGroupObserver } from '../../../../../src/tools/terminal/command-execution/process-group-observer.js';
import { NonInteractiveShellResolver } from '../../../../../src/tools/terminal/command-execution/non-interactive-shell-resolver.js';
const suite = process.platform === 'win32' ? describe.skip : describe;
suite('explicit stop and retirement serialization', () => {
  it.each([false, true])('drains after inspection, shares only real stop work (expired=%s)', async expired => {
    const cwd = await mkdtemp(join(tmpdir(), 'ab-stop-retirement-'));
    const observer = new ProcessGroupObserver(), scope = new NativeCommandProcessScope(observer);
    let resume!: () => void;
    try {
      const handle = await scope.start(new NonInteractiveShellResolver().resolve('sleep 60 &', cwd));
      await handle.completion;
      const snapshot = observer.snapshot.bind(observer);
      const gate = new Promise<void>(resolve => { resume = resolve; });
      const spy = vi.spyOn(observer, 'snapshot').mockImplementationOnce(async (target, deadline) => {
        await gate; return snapshot(target, deadline);
      });
      const signal = vi.spyOn(observer, 'signal');
      const retirement = scope.retireCompleted(handle);
      const start = Date.now();
      const stopped = scope.stop(handle, 'explicit-stop', start + (expired ? 20 : 3000));
      expect(scope.stop(handle, 'explicit-stop')).toBe(stopped);
      if (!expired) resume();
      const outcome = await stopped;
      if (expired) {
        expect(outcome.outcome).toBe('unconfirmed');
        expect(Date.now() - start).toBeLessThan(250);
        expect(signal).not.toHaveBeenCalled();
        resume();
      } else {
        expect(outcome.outcome).toBe('stopped');
        expect(await scope.members(handle)).toEqual([]);
        expect(scope.size).toBe(0);
      }
      await retirement; spy.mockRestore(); signal.mockRestore();
    } finally {
      resume?.(); const report = await scope.close();
      expect(report.outcomes.every(r => r.outcome !== 'unconfirmed')).toBe(true);
      await rm(cwd, { recursive: true, force: true });
    }
  });
  it('rechecks completed empty retirement rather than signalling its released anchor', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'ab-empty-retirement-'));
    const observer = new ProcessGroupObserver(), scope = new NativeCommandProcessScope(observer);
    try {
      const handle = await scope.start(new NonInteractiveShellResolver().resolve('true', cwd));
      await handle.completion;
      let released!: () => void;
      const reachedRelease = new Promise<void>(resolve => { released = resolve; });
      const release = handle.release.bind(handle);
      vi.spyOn(handle, 'release').mockImplementation(() => { release(); released(); });
      const signal = vi.spyOn(observer, 'signal');
      const retirement = scope.retireCompleted(handle);
      await reachedRelease;
      const stopped = scope.stop(handle, 'explicit-stop');
      await retirement;
      expect(await stopped).toEqual({ outcome: 'already-exited' });
      expect(signal).not.toHaveBeenCalled(); expect(scope.size).toBe(0);
    } finally { await scope.close(); await rm(cwd, { recursive: true, force: true }); }
  });
});
