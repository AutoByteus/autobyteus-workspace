import { it, expect, vi } from 'vitest';
import fastify from 'fastify';
import { NativeCommandShutdown } from '../../../src/compositions/native-command-shutdown.js';
import { BackgroundProcessManager } from 'autobyteus-ts/tools/terminal/background-process-manager.js';
import { ProcessGroupObserver } from 'autobyteus-ts/tools/terminal/command-execution/process-group-observer.js';
it('drains real commands before the remaining Fastify cleanup, retaining commands after their manager is discarded', async () => {
  const owner = new NativeCommandShutdown(); const app = fastify();
  owner.install(app);
  let pid = 0;
  app.addHook('onClose', async () => owner.close(async () => {
    expect(await new ProcessGroupObserver().isProcessRunning(pid)).toBe(false);
  }));
  const manager = new BackgroundProcessManager(undefined, undefined, undefined, owner.scope);
  try {
    pid = (await manager.startCommand('sleep 60', process.cwd())).pid;
    await app.ready(); await app.close(); expect(owner.scope.size).toBe(0);
  } finally { await owner.scope.close(); }
});
it('still attempts remaining host cleanup after native failure and caches the aggregate', async () => {
  const owner = new NativeCommandShutdown();
  vi.spyOn(owner.scope, 'close').mockResolvedValue({ outcomes: [{ outcome: 'unconfirmed', reason: 'inspection denied' }] });
  const cleanup = vi.fn(async () => { throw new Error('other resource failed'); });
  const close = owner.close(cleanup); expect(owner.close(cleanup)).toBe(close);
  await expect(close).rejects.toBeInstanceOf(AggregateError); expect(cleanup).toHaveBeenCalledOnce();
});
