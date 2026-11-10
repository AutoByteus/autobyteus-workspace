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

it('does not mistake an error on a spawned anchor for confirmed process exit', async () => {
  const h = new AnchoredCommandHandle({ ...invocation, args: [] }); start(h);
  child.emit('error', new Error('kill EPERM'));
  expect((await h.completion).kind).toBe('failed'); expect(h.anchorExited).toBe(false);
  child.emit('exit'); await h.exited; expect(h.anchorExited).toBe(true); h.dispose();
});
it('settles a failed anchor spawn without awaiting a nonexistent exit event', async () => {
  child.pid = undefined;
  const h = new AnchoredCommandHandle({ ...invocation, args: [] });
  child.emit('error', new Error('spawn ENOENT'));
  await expect(h.ready).rejects.toThrow('ENOENT'); await h.exited;
  expect(h.anchorExited).toBe(true); expect((await h.completion).kind).toBe('failed'); h.dispose();
});
const collect = (stream: PassThrough) => { const parts: Buffer[] = []; stream.on('data', b => parts.push(b)); return () => Buffer.concat(parts).toString(); };
it('cuts a wrapped call at the stdout end marker and FOREGROUND_DONE; later bytes and job ends follow', async () => {
  const nonce = 'ab'.repeat(16);
  const h = new AnchoredCommandHandle({ ...invocation, args: [], wrapperNonce: nonce }); start(h);
  const out = collect(h.stdout), err = collect(h.stderr), later = collect(h.laterOutput);
  child.stdout.emit('data', Buffer.from(`before\x1e${nonce}:EN`)); child.stdout.emit('data', Buffer.from(`D\x1fafter-out`));
  child.stderr.emit('data', Buffer.from(`warn\x1e${nonce}:FOREGROUND_DONE:2:41 42\x1fjob-err\x1e${nonce}:JOB_ENDED:41:3\x1f`));
  expect(await h.foregroundDone).toEqual({ exitCode: 2, jobPids: [41, 42] });
  await new Promise(r => setImmediate(r));
  expect([out(), err(), h.stdout.writableEnded, h.stderr.writableEnded]).toEqual(['before', 'warn', true, true]);
  const ends: Array<[number, number]> = [];
  h.onJobEnded((pid, status) => ends.push([pid, status]));
  child.stderr.emit('data', Buffer.from(`\x1e${nonce}:JOB_ENDED:42:143\x1f`));
  expect(ends).toEqual([[41, 3], [42, 143]]);
  h.dispose(); expect(later().split('').sort().join('')).toBe('after-outjob-err'.split('').sort().join(''));
});
it('WSL: anchor frames and wrapper frames are decoded in sequence with their own nonces', async () => {
  const wrapperNonce = 'cd'.repeat(16);
  const h = new AnchoredCommandHandle({ executable: 'bash', args: ['-lc', 'x'], env: {}, kind: 'windows-wsl', wslCwd: '/tmp',
    processTarget: { kind: 'wsl', wslExecutable: 'wsl.exe', distro: 'D' }, wrapperNonce });
  const anchorNonce = mocks.spawn.mock.calls[0][1][13];
  const err = collect(h.stderr);
  child.stderr.emit('data', Buffer.from(`\x1e${anchorNonce}:READY:88\x1f`)); await h.ready;
  h.group = { target: h.invocation.processTarget, anchor: { pid: 88, parentPid: 1, processGroupId: 88, sessionId: 88, birth: '1', status: 'S', command: '' } }; h.start();
  child.stderr.emit('data', Buffer.from(`\x1e${anchorNonce}:STARTED:89\x1fuser\x1e${wrapperNonce}:FOREGROUND_DONE:0:\x1f\x1e${anchorNonce}:RESULT:0\x1f`));
  expect(await h.foregroundDone).toEqual({ exitCode: 0, jobPids: [] });
  expect((await h.completion).kind).toBe('result');
  await new Promise(r => setImmediate(r)); expect(err()).toBe('user'); h.dispose();
});
