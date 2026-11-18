import { it, expect, vi, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { ServerProcessShutdown, StartupCancelled, SHUTDOWN_WIRE } from '../../../src/shutdown/server-process-shutdown.js';
import { terminateServerProcessTree, type ProcessTreeSweepResult } from '../../../src/shutdown/server-process-tree-sweep.js';
import { SHUTDOWN_WIRE as DESKTOP_WIRE } from '../../../../autobyteus-web/electron/server/managedBackendShutdownClient.js';
afterEach(() => vi.useRealTimers());
function runtime() { return Object.assign(new EventEmitter(), {
  send: vi.fn((_m: string, cb: (e: Error | null) => void) => cb(null)), exit: vi.fn(),
}) as unknown as NodeJS.Process; }
/** Every case injects the sweep, so no test ever reads the real process table or signals anything. */
const clean = () => vi.fn(async (): Promise<ProcessTreeSweepResult> => ({ outcome: 'confirmed', targets: 0 }));
it('pairs the separately packaged exact shutdown literals', () => expect(SHUTDOWN_WIRE).toEqual(DESKTOP_WIRE));
it('latches shutdown during startup, transfers authority and closes once after the barrier', async () => {
  const proc = runtime(), owner = new ServerProcessShutdown(proc, { sweep: clean() });
  const prereq = vi.fn(async () => {}), app = vi.fn(async () => {});
  owner.setCleanup(prereq); proc.emit('message', SHUTDOWN_WIRE.request);
  const stop = owner.request(); expect(owner.request()).toBe(stop);
  expect(prereq).not.toHaveBeenCalled(); expect(() => owner.checkpoint()).toThrow(StartupCancelled);
  owner.setCleanup(app); owner.settleStartup(); await stop;
  expect(app).toHaveBeenCalledOnce(); expect(prereq).not.toHaveBeenCalled();
  expect(proc.send).toHaveBeenLastCalledWith(SHUTDOWN_WIRE.complete, expect.any(Function)); expect(proc.exit).toHaveBeenCalledWith(0);
});
it('does not advance beyond active stage or close concurrently with its initializer', async () => {
  const proc = runtime(), owner = new ServerProcessShutdown(proc, { sweep: clean() });
  let resolve!: () => void; const initialize = new Promise<void>(r => resolve = r);
  const cleanup = vi.fn(async () => {}); owner.setCleanup(cleanup);
  const stage = owner.stage(() => initialize); const cancelled = expect(stage).rejects.toBeInstanceOf(StartupCancelled);
  const stop = owner.request(); expect(cleanup).not.toHaveBeenCalled(); resolve(); await cancelled;
  owner.settleStartup(); await stop; expect(cleanup).toHaveBeenCalledOnce();
});
it('reports failed cleanup and exits nonzero', async () => {
  const proc = runtime(), owner = new ServerProcessShutdown(proc, { sweep: clean() });
  owner.setCleanup(async () => { throw new Error('group absence unconfirmed'); }); owner.settleStartup(); await owner.request();
  expect(proc.send).toHaveBeenLastCalledWith(SHUTDOWN_WIRE.failed, expect.any(Function)); expect(proc.exit).toHaveBeenCalledWith(1);
});
it('bounds missing send flush callbacks', async () => {
  vi.useFakeTimers(); const proc = runtime(); vi.mocked(proc.send!).mockImplementation(() => true);
  const owner = new ServerProcessShutdown(proc, { sweep: clean() }); owner.settleStartup(); const stop = owner.request();
  await vi.advanceTimersByTimeAsync(501); await stop; expect(proc.exit).toHaveBeenCalledWith(1);
});

it('does not send successful completion when readiness flush fails during signal cleanup', async () => {
  const proc = runtime(); let readyCallback!: (error: Error) => void;
  vi.mocked(proc.send!).mockImplementationOnce(((_message: string, callback: (error: Error) => void) => {
    readyCallback = callback; return true;
  }) as never);
  const owner = new ServerProcessShutdown(proc, { sweep: clean() }); const cleanup = vi.fn(async () => {});
  owner.setCleanup(cleanup); owner.settleStartup(); const stop = owner.request();
  await Promise.resolve(); readyCallback(new Error('closed channel')); await stop;
  expect(cleanup).toHaveBeenCalledOnce();
  expect(proc.send).toHaveBeenLastCalledWith(SHUTDOWN_WIRE.failed, expect.any(Function));
  expect(proc.exit).toHaveBeenCalledExactlyOnceWith(1);
});

it('sweeps after a clean close and exits 0 with complete', async () => {
  const proc = runtime(), sweep = clean(), owner = new ServerProcessShutdown(proc, { sweep });
  const cleanup = vi.fn(async () => {}); owner.setCleanup(cleanup); owner.settleStartup(); await owner.request();
  expect(sweep).toHaveBeenCalledOnce();
  expect(cleanup.mock.invocationCallOrder[0]).toBeLessThan(sweep.mock.invocationCallOrder[0]!);
  expect(proc.send).toHaveBeenLastCalledWith(SHUTDOWN_WIRE.complete, expect.any(Function)); expect(proc.exit).toHaveBeenCalledWith(0);
});
it('bounds a hung cleanup at 10s, then sweeps and exits 1 with failed', async () => {
  vi.useFakeTimers(); const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const proc = runtime(), sweep = clean(), owner = new ServerProcessShutdown(proc, { sweep });
  owner.setCleanup(() => new Promise(() => {})); owner.settleStartup(); const stop = owner.request();
  await vi.advanceTimersByTimeAsync(9_999); expect(sweep).not.toHaveBeenCalled(); expect(proc.exit).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1); await stop;
  expect(sweep).toHaveBeenCalledOnce(); expect(error).toHaveBeenCalledWith('Server shutdown exceeded 10s; forcing exit');
  expect(proc.send).toHaveBeenLastCalledWith(SHUTDOWN_WIRE.failed, expect.any(Function)); expect(proc.exit).toHaveBeenCalledExactlyOnceWith(1);
  error.mockRestore();
});
it('starts the bound only after the startup barrier settles', async () => {
  vi.useFakeTimers(); const proc = runtime(), sweep = clean();
  const owner = new ServerProcessShutdown(proc, { sweep, cleanupTimeoutMs: 100 });
  const cleanup = vi.fn(() => new Promise<void>(resolve => setTimeout(resolve, 50))); owner.setCleanup(cleanup);
  const stop = owner.request(); await vi.advanceTimersByTimeAsync(1_000);
  expect(cleanup).not.toHaveBeenCalled(); expect(proc.exit).not.toHaveBeenCalled();
  owner.settleStartup(); await vi.advanceTimersByTimeAsync(50); await stop;
  expect(cleanup).toHaveBeenCalledOnce(); expect(proc.exit).toHaveBeenCalledWith(0);
});
it('exits 1 with failed when the sweep cannot confirm the tree is gone', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const proc = runtime();
  const sweep = vi.fn(async (): Promise<ProcessTreeSweepResult> => ({ outcome: 'unconfirmed', targets: 2, reason: 'still alive after SIGKILL: pid 7' }));
  const owner = new ServerProcessShutdown(proc, { sweep }); owner.settleStartup(); await owner.request();
  expect(proc.send).toHaveBeenLastCalledWith(SHUTDOWN_WIRE.failed, expect.any(Function)); expect(proc.exit).toHaveBeenCalledWith(1);
  error.mockRestore();
});
it('exits 1 rather than hanging when the sweep itself throws', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const proc = runtime(), owner = new ServerProcessShutdown(proc, { sweep: async () => { throw new Error('boom'); } });
  owner.settleStartup(); await owner.request();
  expect(proc.exit).toHaveBeenCalledWith(1);
  error.mockRestore();
});
it('on win32 the sweep is not applicable: a clean close exits 0 with complete and reads no process table', async () => {
  const proc = runtime(), readTable = vi.fn(() => []), kill = vi.fn();
  const owner = new ServerProcessShutdown(proc, { sweep: () => terminateServerProcessTree({ platform: 'win32', readTable, kill }) });
  owner.setCleanup(async () => {}); owner.settleStartup(); await owner.request();
  expect(readTable).not.toHaveBeenCalled(); expect(kill).not.toHaveBeenCalled();
  expect(proc.send).toHaveBeenLastCalledWith(SHUTDOWN_WIRE.complete, expect.any(Function)); expect(proc.exit).toHaveBeenCalledWith(0);
});
