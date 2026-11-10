/** Real task-owned process tests, no provider or app data. Run with clean environment. */
import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NativeCommandProcessScope } from '../../../../../src/tools/terminal/command-execution/native-command-process-scope.js';
import { NonInteractiveShellResolver } from '../../../../../src/tools/terminal/command-execution/non-interactive-shell-resolver.js';
import { BackgroundProcessManager } from '../../../../../src/tools/terminal/background-process-manager.js';
import { ProcessGroupObserver } from '../../../../../src/tools/terminal/command-execution/process-group-observer.js';
import { AnchorControlDecoder } from '../../../../../src/tools/terminal/command-execution/anchor-control-protocol.js';
const pause = (ms: number) => new Promise(r => setTimeout(r, ms));
const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
async function until(check: () => boolean, ms = 3000) {
  const deadline = Date.now() + ms;
  while (!check() && Date.now() < deadline) await pause(20);
  return check();
}
const suite = process.platform === 'win32' ? describe.skip : describe;
suite('NativeCommandProcessScope', () => {
  async function fixture(run: (scope: NativeCommandProcessScope, manager: BackgroundProcessManager, cwd: string) => Promise<void>) {
    const cwd = await mkdtemp(join(tmpdir(), 'ab-owned-scope-'));
    const resolver = () => new NonInteractiveShellResolver({ env: { PATH: process.env.PATH, HOME: cwd } });
    const scope = new NativeCommandProcessScope();
    const manager = new BackgroundProcessManager({ resolver, scope });
    try { await run(scope, manager, cwd); }
    finally { const result = await scope.close(); expect(result.outcomes.every(r => r.outcome !== 'unconfirmed')).toBe(true); await rm(cwd, { recursive: true, force: true }); }
  }
  it('retains a fast shell job as a background task and drains it at host close', async () => fixture(async (scope, manager, cwd) => {
    const { call: result, started } = await manager.run('sleep 60 & printf "%s" "$!"', cwd, { background: false });
    const pid = Number(result.stdout);
    expect(result.exitCode).toBe(0);
    expect(started.map(task => task.pid)).toEqual([pid]);
    expect(scope.size).toBe(1);
    const report = await scope.close();
    expect(report.outcomes).toEqual([{ outcome: 'stopped' }]);
    expect(await new ProcessGroupObserver().isProcessRunning(pid)).toBe(false);
  }));
  it('forces a TERM-resistant HTTP job, confirms listener release and preserves the call result', async () => fixture(async (scope, manager, cwd) => {
    const code = 'process.on("SIGTERM",()=>{});const s=require("http").createServer((q,r)=>r.end("owned"));s.listen(0,"127.0.0.1",()=>console.log(JSON.stringify({pid:process.pid,port:s.address().port})))';
    const { call: result, started } = await manager.run(`${quote(process.execPath)} -e ${quote(code)} &`, cwd, { background: false });
    expect(result.exitCode).toBe(0);
    expect(started).toHaveLength(1);
    let receipt: { pid: number; port: number } | undefined;
    for (let i = 0; i < 100 && !receipt; i++) {
      try { receipt = JSON.parse(await readFile(started[0].outputFile, 'utf8')); } catch { await pause(10); }
    }
    expect(receipt).toBeDefined(); expect((await fetch(`http://127.0.0.1:${receipt!.port}`)).status).toBe(200);
    const report = await scope.close(); expect(report.outcomes).toEqual([{ outcome: 'stopped' }]);
    expect(await new ProcessGroupObserver().isProcessRunning(receipt!.pid)).toBe(false);
    await expect(fetch(`http://127.0.0.1:${receipt!.port}`)).rejects.toThrow();
    expect(result.exitCode).toBe(0);
    console.log(JSON.stringify({ check: 'owned-survivor', ...receipt, cleanup: report, listenerReleased: true }));
  }));
  it('fails closed on observation denial, then retains the lease for a verified later close', async () => {
    const observer = new ProcessGroupObserver(), scope = new NativeCommandProcessScope(observer);
    const handle = await scope.start(new NonInteractiveShellResolver().resolve('sleep 60', process.cwd()));
    const signal = vi.spyOn(observer, 'signal');
    const failed = vi.spyOn(observer, 'snapshot').mockRejectedValue(new Error('inspection denied'));
    try {
      expect(await scope.stop(handle, 'explicit-stop')).toEqual({ outcome: 'unconfirmed', reason: 'inspection denied' });
      expect(signal).not.toHaveBeenCalled(); expect(scope.size).toBe(1);
      expect((await handle.completion).kind).toBe('failed');
    } finally {
      failed.mockRestore(); signal.mockRestore();
      expect((await scope.close()).outcomes).toEqual([{ outcome: 'stopped' }]);
    }
  });
  it('returns fast/empty/comment-only/nonzero commands and retires their anchors after the call', async () => fixture(async (scope, manager, cwd) => {
    for (const command of ['true', 'printf hi; exit 7', '', '# only a comment']) {
      const { call: result } = await manager.run(command, cwd, { background: false });
      expect([result.exitCode, result.stderr]).toEqual([command.includes('7') ? 7 : 0, '']);
      expect(await until(() => scope.size === 0)).toBe(true);
    }
  }));
  it('settles forced timeout without RESULT and keeps partial output', async () => fixture(async (scope, manager, cwd) => {
    const code = 'process.on("SIGTERM",()=>{});process.stdout.write("partial");setInterval(()=>{},1000)';
    const { call: result } = await manager.run(`exec ${quote(process.execPath)} -e ${quote(code)}`, cwd, { background: false, timeoutSeconds: 1 });
    expect(result.timedOut).toBe(true); expect(result.exitCode).toBe(null); expect(result.stdout).toBe('partial');
    expect(scope.size).toBe(0);
  }));
  it('host stop is not a tool timeout and duplicate close shares the promise', async () => fixture(async (scope, manager, cwd) => {
    const command = manager.run('sleep 60', cwd, { background: false });
    await pause(200);
    const close = scope.close(); expect(scope.close()).toBe(close);
    await close; const { call: result } = await command;
    expect(result.timedOut).toBe(false); expect(scope.size).toBe(0);
  }));
  it('cancels an admitted launch and forbids later commands', async () => fixture(async (scope, manager, cwd) => {
    const command = manager.run('printf SHOULD_NOT_RUN', cwd, { background: false });
    await scope.close(); expect((await command).call.stdout).toBe('');
    const later = await manager.run('true', cwd, { background: true });
    expect([later.started, later.call.handle]).toEqual([[], null]); expect(later.call.stderr).toContain('shutting down');
  }));
  it('drains multiple groups collectively while an unrelated scope survives', async () => fixture(async (scope, manager, cwd) => {
    const other = new NativeCommandProcessScope(); const resolver = new NonInteractiveShellResolver();
    const sentinel = await other.start(resolver.resolve('sleep 60', cwd));
    try {
      await Promise.all(Array.from({ length: 4 }, () => manager.run('sleep 60', cwd, { background: true })));
      const before = Date.now(); await scope.close(); expect(Date.now() - before).toBeLessThan(3000);
      expect((await other.members(sentinel)).length).toBeGreaterThan(0);
    } finally { await other.close(); }
  }));
});
it('framing preserves no-newline output, split frames and invalid control-like bytes, and cuts at each frame', () => {
  const seen: unknown[] = [], output: string[] = [];
  const decoder = new AnchorControlDecoder('nonce', (f, before) => { output.push(before.toString()); seen.push(f); });
  const chunks = ['user', '\x1enon', 'ce:READY:42\x1fmore', '\x1enonce:INVALID\x1f', 'tail\x1enonce:FOREGROUND_DONE:3:11 12\x1f',
    'later\x1enonce:JOB_ENDED:11:143\x1f\x1enonce:FOREGROUND_DONE:256:\x1f'];
  for (const c of chunks) output.push(decoder.push(Buffer.from(c)).toString());
  output.push(decoder.flush().toString());
  expect(output.join('')).toBe('usermore\x1enonce:INVALID\x1ftaillater\x1enonce:FOREGROUND_DONE:256:\x1f');
  expect(seen).toEqual([{ kind: 'READY', pid: 42 }, { kind: 'FOREGROUND_DONE', exitCode: 3, jobPids: [11, 12] },
    { kind: 'JOB_ENDED', pid: 11, status: 143 }]);
});
