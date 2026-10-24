import { it, expect, vi, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { ServerProcessShutdown, StartupCancelled, SHUTDOWN_WIRE } from '../../../src/shutdown/server-process-shutdown.js';
import { SHUTDOWN_WIRE as DESKTOP_WIRE } from '../../../../autobyteus-web/electron/server/managedBackendShutdownClient.js';
afterEach(() => vi.useRealTimers());
function runtime() { return Object.assign(new EventEmitter(), {
  send: vi.fn((_m: string, cb: (e: Error | null) => void) => cb(null)), exit: vi.fn(),
}) as unknown as NodeJS.Process; }
it('pairs the separately packaged exact shutdown literals', () => expect(SHUTDOWN_WIRE).toEqual(DESKTOP_WIRE));
it('latches shutdown during startup, transfers authority and closes once after the barrier', async () => {
  const proc = runtime(), owner = new ServerProcessShutdown(proc);
  const prereq = vi.fn(async () => {}), app = vi.fn(async () => {});
  owner.setCleanup(prereq); proc.emit('message', SHUTDOWN_WIRE.request);
  const stop = owner.request(); expect(owner.request()).toBe(stop);
  expect(prereq).not.toHaveBeenCalled(); expect(() => owner.checkpoint()).toThrow(StartupCancelled);
  owner.setCleanup(app); owner.settleStartup(); await stop;
  expect(app).toHaveBeenCalledOnce(); expect(prereq).not.toHaveBeenCalled();
  expect(proc.send).toHaveBeenLastCalledWith(SHUTDOWN_WIRE.complete, expect.any(Function)); expect(proc.exit).toHaveBeenCalledWith(0);
});
it('does not advance beyond active stage or close concurrently with its initializer', async () => {
  const proc = runtime(), owner = new ServerProcessShutdown(proc);
  let resolve!: () => void; const initialize = new Promise<void>(r => resolve = r);
  const cleanup = vi.fn(async () => {}); owner.setCleanup(cleanup);
  const stage = owner.stage(() => initialize); const cancelled = expect(stage).rejects.toBeInstanceOf(StartupCancelled);
  const stop = owner.request(); expect(cleanup).not.toHaveBeenCalled(); resolve(); await cancelled;
  owner.settleStartup(); await stop; expect(cleanup).toHaveBeenCalledOnce();
});
it('reports failed cleanup and exits nonzero', async () => {
  const proc = runtime(), owner = new ServerProcessShutdown(proc);
  owner.setCleanup(async () => { throw new Error('group absence unconfirmed'); }); owner.settleStartup(); await owner.request();
  expect(proc.send).toHaveBeenLastCalledWith(SHUTDOWN_WIRE.failed, expect.any(Function)); expect(proc.exit).toHaveBeenCalledWith(1);
});
it('bounds missing send flush callbacks', async () => {
  vi.useFakeTimers(); const proc = runtime(); vi.mocked(proc.send!).mockImplementation(() => true);
  const owner = new ServerProcessShutdown(proc); owner.settleStartup(); const stop = owner.request();
  await vi.advanceTimersByTimeAsync(501); await stop; expect(proc.exit).toHaveBeenCalledWith(1);
});
