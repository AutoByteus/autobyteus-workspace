/** A foreground call keeps no listener, output stream or command group once it returned and its shell exited. */
import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BackgroundProcessManager } from '../../../../../src/tools/terminal/background-process-manager.js';
import { NonInteractiveShellResolver } from '../../../../../src/tools/terminal/command-execution/non-interactive-shell-resolver.js';
const owned = (manager: BackgroundProcessManager) => (manager as unknown as { handles: Set<unknown> }).handles;
const suite = process.platform === 'win32' ? describe.skip : describe;
suite('call output lifetime', () => {
  it('releases every foreground call without losing its returned output', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'ab-output-lifetime-'));
    const manager = new BackgroundProcessManager();
    try {
      const handles = [];
      for (let n = 0; n < 3; n++) {
        const { call } = await manager.run('printf foreground-output; printf e >&2', cwd, { background: false });
        expect([call.stdout, call.stderr, call.exitCode]).toEqual(['foreground-output', 'e', 0]);
        handles.push(call.handle!);
      }
      for (let n = 0; n < 100 && (owned(manager).size || manager.scope.size); n++) await new Promise(r => setTimeout(r, 20));
      expect([owned(manager).size, manager.scope.size]).toEqual([0, 0]);
      for (const handle of handles) {
        expect(handle.stdout.listenerCount('data')).toBe(0); expect(handle.stderr.listenerCount('data')).toBe(0);
        expect(handle.laterOutput.writableEnded).toBe(true);
      }
    } finally { await manager.stopAllForRunEnd(); await manager.scope.close(); await rm(cwd, { recursive: true, force: true }); }
  });
  it.each([false, true])('a launch failure leaves nothing owned (background=%s)', async background => {
    const cwd = await mkdtemp(join(tmpdir(), 'ab-output-lifetime-'));
    const resolver = new NonInteractiveShellResolver();
    const failing = Object.assign(Object.create(resolver), { resolve: (script: string, dir: string) =>
      ({ ...resolver.resolve(script, dir), executable: join(cwd, 'missing-executable'), args: [] }) });
    const manager = new BackgroundProcessManager({ resolver: () => failing });
    try {
      const { call, started } = await manager.run('unused', cwd, { background });
      expect(call.stderr).toContain('ENOENT'); expect(started).toEqual([]);
      for (let n = 0; n < 100 && owned(manager).size; n++) await new Promise(r => setTimeout(r, 20));
      expect([owned(manager).size, manager.scope.size, manager.hasRunning()]).toEqual([0, 0, false]);
    } finally { await manager.stopAllForRunEnd(); await manager.scope.close(); await rm(cwd, { recursive: true, force: true }); }
  });
});
