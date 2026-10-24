import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
const mocks = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock('node:child_process', () => ({ spawn: mocks.spawn }));
import { AnchoredCommandHandle } from '../../../../../src/tools/terminal/command-execution/anchored-command-launcher.js';
const invocation = { executable: '/bin/bash', args: ['-c', 'true'], env: {}, kind: 'posix', processTarget: { kind: 'host' } } as const;
let child: any;
beforeEach(() => {
  mocks.spawn.mockClear();
  child = Object.assign(new EventEmitter(), { pid: 42, stdout: new PassThrough(), stderr: new PassThrough(),
    stdin: new PassThrough(), send: vi.fn(), connected: true, disconnect: vi.fn(), kill: vi.fn() });
  mocks.spawn.mockReturnValue(child);
});
afterEach(() => vi.useRealTimers());
function start(handle: AnchoredCommandHandle) {
  child.emit('message', { kind: 'READY', pid: 42 });
  handle.group = { target: { kind: 'host' }, anchor: { pid: 42, parentPid: 1, processGroupId: 42, status: 'S', birth: 'birth', command: '' } };
  handle.start();
}
it('preserves successful RESULT across duplicate/late frames, exit and later background stop', async () => {
  const h = new AnchoredCommandHandle({ ...invocation, args: [...invocation.args] }); start(h);
  child.emit('message', { kind: 'STARTED', pid: 43 });
  child.emit('message', { kind: 'RESULT', code: 7, signal: null });
  h.noteStopRequested('host-shutdown'); child.emit('exit'); h.finishStop({ outcome: 'stopped' });
  child.emit('message', { kind: 'RESULT', code: 0, signal: null });
  expect(await h.completion).toEqual({ kind: 'result', code: 7, signal: null }); h.dispose();
});
it('rejects STARTED and resolves failure on explicit spawn failure', async () => {
  const h = new AnchoredCommandHandle({ ...invocation, args: [] }); start(h);
  child.emit('message', { kind: 'SPAWN_FAILED', message: 'ENOENT' });
  await expect(h.started).rejects.toThrow(); expect((await h.completion).kind).toBe('failed'); h.dispose();
});
it('settles missing RESULT through bounded finishStop independently of pipe EOF', async () => {
  const h = new AnchoredCommandHandle({ ...invocation, args: [] }); start(h);
  h.noteStopRequested('tool-timeout'); child.emit('exit');
  h.finishStop({ outcome: 'unconfirmed', reason: 'inspection denied' });
  expect(await h.completion).toEqual({ kind: 'failed', reason: 'cleanup-unconfirmed', message: 'inspection denied' }); h.dispose();
});
it('gives queued RESULT at most 50ms after unexpected control loss', async () => {
  vi.useFakeTimers(); const h = new AnchoredCommandHandle({ ...invocation, args: [] }); start(h);
  child.emit('message', { kind: 'STARTED', pid: 43 }); child.emit('disconnect');
  await vi.advanceTimersByTimeAsync(50); expect((await h.completion).kind).toBe('failed'); h.dispose();
});
it('WSL launches setsid --wait in the exact distro and preserves no-newline user stderr', async () => {
  const h = new AnchoredCommandHandle({ executable: 'bash', args: ['-lc', 'echo secret'], env: {}, kind: 'windows-wsl', wslCwd: '/tmp/task',
    processTarget: { kind: 'wsl', wslExecutable: 'wsl.exe', distro: 'TaskDistro' } });
  const args = mocks.spawn.mock.calls[0][1];
  expect(args.slice(0, 8)).toEqual(['-d', 'TaskDistro', '--cd', '/tmp/task', '--exec', 'setsid', '--wait', 'bash']);
  const nonce = args[13]; // args: ... -c script argv0 nonce shell args
  expect(nonce).toMatch(/^[a-f0-9]{32}$/);
  const output: Buffer[] = []; h.stderr.on('data', b => output.push(b));
  child.stderr.emit('data', Buffer.from(`prefix\x1e${nonce}:READY:88\x1f`)); expect(await h.ready).toBe(88);
  h.group = { target: h.invocation.processTarget, anchor: { pid: 88, parentPid: 1, processGroupId: 88, sessionId: 88, birth: '1', status: 'S', command: '' } }; h.start();
  child.stderr.emit('data', Buffer.from(`\x1e${nonce}:STARTED:89\x1ftail\x1e${nonce}:RESULT:0\x1f`));
  expect((await h.completion).kind).toBe('result'); expect(Buffer.concat(output).toString()).toBe('prefixtail'); h.dispose();
});
